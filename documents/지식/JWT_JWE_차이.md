# JWT와 JWE의 차이점

## JWT (JSON Web Token) - 서명 방식

### 목적

- 토큰이 변조되지 않았음을 증명합니다.
- 무결성(Integrity)을 보장합니다.

### 방식

- 시크릿 키로 서명만 추가합니다.
- 내용은 Base64로 인코딩되어 **누구나 디코딩해서 볼 수 있습니다.**

### 형식

```text
header.payload.signature
```

### 예시

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

3개 파트로 구성됩니다.

1. **Header**: 알고리즘 정보를 담습니다.(예: HS256)
2. **Payload**: 실제 데이터를 담습니다.(JSON)
3. **Signature**: 서명 값을 담습니다.

### 검증 과정

```mermaid
sequenceDiagram
    participant Client as 클라이언트
    participant Server as 서버

    Client->>Server: JWT 토큰 전송<br/>(Authorization: Bearer xxx)
    Server->>Server: 1. Header + Payload로<br/>서명 재생성
    Server->>Server: 2. 서명 비교
    alt 서명 일치
        Server->>Client: ✅ 인증 성공<br/>(Payload 사용)
    else 서명 불일치
        Server->>Client: ❌ 인증 실패
    end
```

### 보안 특성

- ✅ 변조가 불가능합니다.(서명 검증)
- ❌ 내용이 노출됩니다.(Base64는 암호화가 아닙니다.)
- 민감한 정보를 넣지 않아야 합니다.

### 사용 라이브러리

- `jsonwebtoken`(Node.js)
- `passport-jwt`(Passport 전략)

---

## JWE (JSON Web Encryption) - 암호화 방식

### 목적

- 토큰 내용 자체를 암호화해 **아무도 볼 수 없도록** 합니다.
- 기밀성(Confidentiality)을 보장합니다.

### 방식

- 시크릿 키로 전체 내용을 암호화합니다.
- 복호화 키가 없으면 내용을 볼 수 없습니다.

### 형식

```text
header.encrypted_key.iv.ciphertext.tag
```

### 예시

```text
eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..x2I7kZ2nsTfxVn5K.Y8F9bvLqP3KJ8nR2mZ...
```

5개 파트로 구성됩니다.

1. **Header**: 암호화 알고리즘 정보를 담습니다.(예: dir, A256GCM)
2. **Encrypted Key**: 암호화된 키를 담습니다.(direct encryption이면 비어 있습니다.)
3. **IV (Initialization Vector)**: 초기화 벡터를 담습니다.
4. **Ciphertext**: 암호화된 실제 데이터를 담습니다.
5. **Tag**: 인증 태그를 담습니다.

### 복호화 과정

```mermaid
sequenceDiagram
    participant Client as 클라이언트
    participant Server as 서버

    Client->>Server: JWE 토큰 전송<br/>(암호화된 상태)
    Server->>Server: 1. 시크릿 키로<br/>토큰 복호화
    Server->>Server: 2. Payload 추출
    alt 복호화 성공
        Server->>Client: ✅ 인증 성공<br/>(Payload 사용)
    else 복호화 실패
        Server->>Client: ❌ 인증 실패
    end
```

### 보안 특성

- ✅ 변조가 불가능합니다.
- ✅ 내용을 숨깁니다.(암호화)
- 민감한 정보도 안전하게 보호합니다.

### 사용 라이브러리

- `jose`(Node.js)
- NextAuth.js(기본적으로 JWE 사용)

---

## 비교 요약

```mermaid
graph TB
    subgraph JWT["JWT (서명 방식)"]
        JWT1["Header<br/>(알고리즘)"]
        JWT2["Payload<br/>(데이터 - 노출됨)"]
        JWT3["Signature<br/>(서명)"]
        JWT1 --> JWT2
        JWT2 --> JWT3
        JWT_Result["✅ 무결성 보장<br/>❌ 내용 노출"]
    end

    subgraph JWE["JWE (암호화 방식)"]
        JWE1["Header<br/>(암호화 알고리즘)"]
        JWE2["Encrypted Key"]
        JWE3["IV<br/>(초기화 벡터)"]
        JWE4["Ciphertext<br/>(암호화된 데이터)"]
        JWE5["Tag<br/>(인증 태그)"]
        JWE1 --> JWE2
        JWE2 --> JWE3
        JWE3 --> JWE4
        JWE4 --> JWE5
        JWE_Result["✅ 무결성 보장<br/>✅ 내용 보호"]
    end

    JWT_Result -.-> Compare["비교"]
    JWE_Result -.-> Compare
```

| 항목 | JWT (서명) | JWE (암호화) |
|------|-----------|-------------|
| **목적** | 무결성을 검증합니다. | 기밀성을 보장합니다. |
| **내용 노출** | 누구나 볼 수 있습니다. | 키가 있어야 볼 수 있습니다. |
| **파트 개수** | 3개입니다. | 5개입니다. |
| **토큰 길이** | 짧습니다. | 깁니다. |
| **성능** | 빠름 | 느림 (암호화/복호화) |
| **사용 케이스** | 일반 인증 토큰 | 민감 정보 포함 토큰 |
