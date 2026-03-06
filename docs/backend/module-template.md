# Module Template

## 목적

- 이 문서는 새 NestJS feature 모듈을 시작할 때 사용할 기본 구조와 최소 기준을 제공합니다.
- 레이어 경계를 초반부터 맞춰 이후 refactor 비용을 줄이는 것이 목적입니다.

## 책임과 경계

- 새 모듈은 현재 레포의 `posts`, `categories`, `tags` 패턴을 기준으로 시작합니다.
- 모듈 구조는 파일 수보다 책임 분리를 우선합니다.

## Must

- MUST 기본 구조로 아래 디렉터리와 파일을 검토합니다.
- MUST 응답 변환이 필요하면 `application/`에 응답 변환 계층을 둡니다.
- MUST persistence 계약이 있으면 `repositories/`에 interface와 구현체를 분리합니다.
- MUST 도메인 의미 단위가 분명하면 `domain/`에 aggregate/entity 타입을 둡니다.
- MUST DTO, Controller, Service, Module, 테스트 파일을 최소 세트로 포함합니다.
- MUST Controller는 시작 시 `ApiPublicController`, `ApiFeatureController`, `ApiAdminController` 중 하나를 먼저 선택합니다.
- SHOULD 작은 모듈이라도 레이어를 생략하기보다 “왜 생략 가능한지”를 설명할 수 있어야 합니다.
- SHOULD storage/health/support 모듈은 repository 대신 adapter 중심 구조를 선택할 수 있습니다.

## Must Not

- MUST NOT 처음부터 모든 레이어를 형식적으로 만들기만 하고 비어 있는 추상화를 남깁니다.
- MUST NOT 응답 변환 계층 없이 Controller에서 응답 객체를 반복 조립합니다.
- MUST NOT 구현체 타입을 외부 계층에 직접 노출합니다.

## Review Questions

- 이 모듈의 use-case 수와 복잡도에 비해 구조가 과하거나 부족하지 않은가?
- persistence 계층 계약과 API 계약이 분리되어 있는가?
- 테스트가 각 레이어 책임을 증명하는가?
- 새 패턴을 도입했다면 상위 문서에 반영했는가?

## Exception Process

- 아주 작은 모듈은 `domain/` 또는 `application/`을 생략할 수 있지만, 그 경우에도 책임이 Controller/Service/Repository 중 하나로 무너지지 않아야 합니다.
- object storage, health check, support 모듈은 repository 없이 adapter/service 조합으로 시작할 수 있습니다.
- 나중에 복잡도가 늘어날 가능성이 보이면 미리 분리하지 말고, 분리 트리거를 PR에 적습니다.

## 기본 구조 예시

```text
feature-name/
  dto/
    create-feature.dto.ts
    update-feature.dto.ts
    feature-query.dto.ts
    feature-response.dto.ts
    index.ts
  application/
    feature-response.mapper.ts
  domain/
    feature.model.ts
  repositories/
    feature.repository.ts
    drizzle-feature.repository.ts
  feature.controller.ts
  feature.service.ts
  feature.module.ts
  feature.controller.spec.ts
  feature.service.spec.ts
  feature.integration.spec.ts
```

## 새 모듈 시작 체크

1. use-case 기준으로 엔드포인트와 Service 메서드를 먼저 정합니다.
2. 컨트롤러가 public/admin/혼합 중 무엇인지 결정하고 preset을 고릅니다.
3. 입력 계약과 응답 계약을 DTO로 분리합니다.
4. persistence contract가 필요하면 repository interface를 먼저 정의합니다.
5. 응답 변환이 두 군데 이상에서 필요하면 응답 변환 계층을 추가합니다.
6. 최소 테스트 세트를 함께 만듭니다.
