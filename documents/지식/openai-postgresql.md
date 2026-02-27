# OpenAI는 어떻게 PostgreSQL 하나로 8억 명을 감당했나

> 이 글은 OpenAI 테크니컬 스태프 멤버 Bohan Zhang이 작성한 공식 블로그 포스팅과, 그가 CMU의 Andy Pavlo 교수와 함께 쓴 PostgreSQL MVCC 분석 글을 바탕으로 정리했습니다.

---

## 개요

ChatGPT 출시 이후 OpenAI의 PostgreSQL 부하는 1년 만에 10배 이상 증가했습니다. 일반적인 상식대로라면 이 규모에서는 데이터베이스를 샤딩하거나 분산 DB로 이전해야 합니다. OpenAI는 다른 길을 택했습니다.

단일 Azure PostgreSQL Flexible Server Primary + 전 세계 여러 리전에 분산된 약 50개의 Read Replica만으로, 초당 수백만 QPS를 처리하며 8억 명의 사용자를 지원하고 있습니다. 이 글은 그 과정에서 겪은 문제들과 해결책, 그리고 PostgreSQL의 고질적인 약점인 MVCC까지 함께 다룹니다.

---

## 왜 샤딩을 안 했나?

현재 PostgreSQL은 샤딩되지 않은 상태이며, 단일 Primary가 PostgreSQL로 들어오는 모든 쓰기를 처리합니다. 이는 전략적 선택이 아니라 현실적 제약입니다.

기존 워크로드를 샤딩하려면 수백 개의 애플리케이션 엔드포인트 변경이 필요하고 수개월~수년이 걸릴 수 있습니다. 다만:

- 샤딩 가능한 쓰기 중심 워크로드는 이미 Azure CosmosDB로 이전 중
- 기존 PostgreSQL에 새 테이블은 더 이상 추가하지 않음
- 신규 워크로드는 기본적으로 샤딩 시스템을 사용
- 향후 샤딩 PostgreSQL 또는 분산 DB로의 전환 가능성은 열어둠

---

## PostgreSQL의 고질적 약점 — MVCC

OpenAI가 겪은 많은 문제의 근본 원인 중 하나는 PostgreSQL의 MVCC(Multi-Version Concurrency Control) 구현 방식입니다. Bohan Zhang과 CMU Andy Pavlo 교수가 공동 작성한 글에서 이를 상세히 다룹니다.

### MVCC란?

MVCC의 핵심 아이디어는 간단합니다. 데이터를 수정할 때 기존 행을 덮어쓰지 않고 새로운 버전을 복사해서 만드는 것입니다. 덕분에 읽기 쿼리가 쓰기 쿼리에 의해 블로킹되지 않습니다. 하지만 PostgreSQL의 구현 방식은 다른 DBMS와 비교했을 때 몇 가지 심각한 문제를 안고 있습니다.

### 문제 1: 버전 전체 복사 (Version Copying)

단 1개 컬럼만 수정해도 행 전체를 복사해서 새 버전을 만듭니다. 1,000개 컬럼이 있는 테이블에서 컬럼 하나를 바꿔도 1,000개 컬럼이 모두 새 버전으로 복사됩니다.

반면 MySQL과 Oracle은 변경된 부분만 저장하는 델타(diff) 방식을 사용합니다. 훨씬 효율적입니다.

### 문제 2: 테이블 비대화 (Table Bloat)

삭제된 구버전(Dead Tuple)이 테이블에 그대로 쌓입니다. Live 튜플 10GB + Dead 튜플 40GB라면 Full Scan 시 50GB 전체를 읽어야 합니다.

일반 `VACUUM`으로는 Dead Tuple을 제거해도 디스크 공간이 반환되지 않습니다. 공간 반환을 위해서는 `VACUUM FULL` 또는 `pg_repack`이 필요한데, 이는 테이블 전체를 재작성하는 매우 부담스러운 작업입니다.

### 문제 3: 인덱스 유지 비용 (Secondary Index Maintenance)

행 하나를 업데이트하면 해당 테이블의 모든 인덱스를 다 갱신해야 합니다. HOT(Heap-Only Tuple) 최적화로 약 46%의 업데이트는 이 비용을 피할 수 있지만, 나머지 54%는 그대로 부담합니다.

이것이 바로 Uber가 2016년 PostgreSQL에서 MySQL로 전환한 이유입니다. 쓰기가 많고 인덱스가 많은 테이블에서 성능 문제가 심각했기 때문입니다.

### 문제 4: Autovacuum 관리 어려움

Autovacuum 기본 설정은 테이블의 20%가 업데이트된 후에야 작동합니다. 1억 개 행 테이블이라면 2,000만 개가 변경될 때까지 Dead Tuple이 쌓입니다.

오래 실행되는 트랜잭션이 Autovacuum을 차단하면 Dead Tuple이 계속 쌓이고, 이는 더 느린 쿼리를 만들어 다시 Autovacuum을 막는 악순환이 발생합니다.

---

## OpenAI가 직면한 문제들과 해결책

### 1. Primary 부하 집중

**문제** 쓰기 노드가 하나뿐인 구조에서 대규모 쓰기 스파이크 발생 시 Primary가 빠르게 과부하 상태가 됩니다. MVCC의 Write Amplification, Table Bloat, Autovacuum 튜닝 문제가 겹칩니다.

**해결책**
- 읽기 트래픽은 최대한 Replica로 오프로드
- 샤딩 가능한 쓰기 중심 워크로드를 CosmosDB로 이전
- 중복 쓰기를 유발하는 애플리케이션 버그 수정
- 트래픽 급증 완화를 위한 지연 쓰기(Lazy Write) 도입
- 백필 작업 시 엄격한 속도 제한 적용 (1주일 이상 걸리더라도 안정성 우선)

### 2. 고비용 쿼리

**문제** 12개 테이블을 조인하는 쿼리가 ORM에서 자동 생성되었고, 트래픽이 몰릴 때마다 CPU를 대량 소모해 ChatGPT와 API 전반이 느려지는 고심각도 장애(SEV)를 유발했습니다.

**해결책**
- 복잡한 다중 테이블 조인을 피하고, 불가피한 경우 조인 로직을 애플리케이션 계층으로 분리
- ORM이 생성하는 SQL을 반드시 직접 검토
- `idle_in_transaction_session_timeout` 등 타임아웃 설정으로 장기 유휴 쿼리가 Autovacuum을 차단하지 못하도록 통제

### 3. 단일 장애 지점(SPOF)

**문제** Primary가 다운되면 쓰기 전체가 실패하고 서비스 전반에 영향을 줍니다.

**해결책**
- 핵심 읽기 요청을 Replica로 오프로드 → Primary 다운 시에도 읽기는 유지 (SEV0 수준 장애 방지)
- 항상 동기화된 핫 스탠바이를 포함한 HA 모드로 운영, 장애 시 신속하게 스탠바이 승격
- 각 리전에 여유 용량을 가진 여러 Replica 배치 → 단일 Replica 장애가 리전 전체 장애로 이어지지 않도록

### 4. 워크로드 격리

**문제** 신규 기능 출시로 비효율적인 쿼리가 유입되면 같은 인스턴스의 다른 핵심 서비스까지 느려집니다.

**해결책**
- 요청을 고우선순위/저우선순위로 나눠 각각 전용 인스턴스로 라우팅
- 제품/서비스 간에도 동일하게 적용 → 한 제품의 활동이 다른 제품 성능에 영향 없도록 격리

### 5. Connection 관리

**문제** 인스턴스당 최대 커넥션 수 제한(Azure PostgreSQL 기준 5,000개)이 있으며, 과거 커넥션 스톰으로 커넥션이 전부 소진된 사고도 있었습니다.

**해결책**
- PgBouncer를 프록시 계층으로 배포, 트랜잭션/문장 풀링 모드로 운영
- 커넥션 설정 시간 50ms → 5ms 단축
- 각 Read Replica마다 전용 Kubernetes Deployment로 여러 PgBouncer Pod 운영

```
User Requests
    → Kubernetes Service
    → 각 Read Replica 전용 Kubernetes Deployment (PgBouncer Pod 여러 개)
    → Read Replica
```

- 프록시, 클라이언트, Replica를 동일 리전에 배치해 네트워크 오버헤드 최소화
- 유휴 타임아웃 등 PgBouncer 설정을 세심하게 튜닝

### 6. 캐시 미스 폭풍

**문제** 캐시 적중률이 갑자기 떨어지면 대량의 요청이 PostgreSQL로 직접 유입되어 CPU가 포화됩니다.

**해결책**
- 캐시 락(Cache Lock) 메커니즘 도입
- 동일 캐시 키에서 미스 발생 시 단 하나의 요청만 DB에서 데이터를 가져오고, 나머지는 캐시가 갱신될 때까지 대기
- 중복 DB 읽기를 줄이고 연쇄적인 부하 스파이크 차단

### 7. Read Replica 확장 한계

**문제** Replica 수가 늘어날수록 Primary가 모든 Replica에 WAL을 스트리밍해야 해서 네트워크 대역폭과 CPU 부담이 커지고 복제 지연이 불안정해집니다.

**해결책**
- Azure PostgreSQL 팀과 Cascading Replication 공동 개발 중
- 중간 Replica가 하위 Replica에 WAL을 릴레이하는 방식으로 100개 이상의 Replica까지 확장 가능
- 다만 페일오버 관리 등 운영 복잡성이 증가하는 트레이드오프가 있어 충분한 검증 후 프로덕션 적용 예정

```
Primary → WAL → Intermediate Replica(들) → WAL → Read Replica(들)
```

### 8. 트래픽 급증 대응 (Rate Limiting)

**문제** 특정 엔드포인트의 갑작스러운 트래픽 급증, 고비용 쿼리 폭증, 재시도 폭풍이 CPU/I/O/커넥션을 빠르게 고갈시킵니다.

**해결책**
- 애플리케이션, 커넥션 풀러, 프록시, 쿼리 다중 레이어에서 Rate Limiting 적용
- 너무 짧은 재시도 간격으로 인한 Retry Storm 방지
- ORM 레이어에서 특정 쿼리 digest를 완전 차단하는 기능 추가

### 9. 스키마 변경 제한

**문제** 컬럼 타입 변경 같은 작은 스키마 변경도 테이블 전체 재작성을 유발할 수 있어 프로덕션에서 매우 위험합니다.

**해결책**
- 테이블 전체 재작성이 필요한 변경 금지
- 스키마 변경에 5초 타임아웃 강제
- 인덱스 생성/삭제는 반드시 `CONCURRENTLY` 옵션 사용
- 기존 PostgreSQL에 새 테이블 추가 금지 (신규 기능은 CosmosDB 등으로)
- 백필 시 엄격한 속도 제한 (1주일 이상 걸리더라도 안정성 우선)

---

## 결과

| 지표 | 수치 |
|------|------|
| p99 클라이언트 사이드 지연시간 | 두 자릿수 밀리초(ms) |
| 가용성 | Five-nines (99.999%) |
| 12개월간 SEV-0 장애 | 단 1건 |
| Read Replica 수 | 약 50개 (복제 지연 거의 0) |

유일한 SEV-0 장애는 ChatGPT ImageGen 바이럴 출시 당시, 1주일 만에 1억 명 이상이 신규 가입하며 쓰기 트래픽이 10배 이상 급증한 상황에서 발생했습니다.

---

## 핵심 교훈

1. **읽기 집약적 워크로드라면** 단일 Primary PostgreSQL은 생각보다 훨씬 멀리 갈 수 있다.
2. **샤딩 결정은** 유저 수가 아니라 실제 워크로드 패턴에 따라 내려야 한다.
3. **PostgreSQL의 MVCC 구조적 한계**(Write Amplification, Bloat, Autovacuum)를 이해하고 설계에 반영해야 한다.
4. **ORM이 생성하는 SQL은 반드시 직접 검토하라.** 12개 테이블 조인이 자동으로 만들어질 수 있다.
5. **방어는 다중 레이어에서 해야 한다.** 캐시 락, Rate Limiting, 워크로드 격리, 타임아웃 설정 모두 함께 작동해야 효과가 있다.

---

*참고: OpenAI 공식 블로그 "8억 명의 ChatGPT 사용자를 지원하기 위한 PostgreSQL 확장" (Bohan Zhang), CMU Andy Pavlo & Bohan Zhang "The Part of PostgreSQL We Hate the Most"*
