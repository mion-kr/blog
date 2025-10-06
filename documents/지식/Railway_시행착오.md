# Railway 시행착오 정리

## Railway가 AWS S3처럼 오브젝트 스토리지를 제공하나요?

Railway는 S3에 해당하는 매니지드 스토리지를 제공하지 않습니다. 대신 Volume 기능에 MinIO 같은 S3 호환 컨테이너를 붙여 직접 운영하거나, 외부 S3·Cloudflare R2·Vercel Blob 등을 사용해야 합니다.

## Vercel도 스토리지를 제공하나요?

Vercel은 2025년 기준으로 Vercel Blob을 정식 출시했습니다. Amazon S3 기반으로 동작하며 기본 1GB 무료 구간과 GB당 과금 체계를 제공합니다.

## Railway 템플릿은 공식 서비스인가요?

Railway 템플릿은 공식 제공분과 커뮤니티 기여분이 함께 존재합니다. `railway.com/deploy/MF8Rcp`처럼 커뮤니티 개발자가 배포한 이미지 서비스 템플릿도 많으므로, 운영·업데이트·백업은 사용자가 직접 책임져야 합니다.

## "서비스 당" 8GB RAM·8 vCPU 문구는 어떤 의미인가요?

Railway 요금 플랜의 $5(하비)·$20(프로)은 워크스페이스 단위 최소 사용료입니다. "서비스 당"이라는 문구는 컨테이너 하나가 사용할 수 있는 최대 자원 한도(예: 8GB RAM)를 뜻합니다. 여러 서비스를 올리면 사용량이 합산되어 크레딧에서 차감된 뒤 초과분이 과금됩니다.

## 하나의 리포지터리가 두 개 서비스로 잡히는 이유는 무엇인가요?

Railway는 모노레포를 자동 감지해 `apps/blog-web`, `apps/blog-api`처럼 각각의 애플리케이션을 별도 서비스로 분리합니다. 동일 프로젝트 안에서 서비스가 나뉘어도 네트워크·변수 관리는 편리해집니다.

## 도메인은 어떻게 연결하고 HTTPS는 어떻게 처리하나요?

Railway는 도메인 등록 기능을 제공하지 않습니다. 외부에서 구입한 도메인을 Custom Domain으로 연결해야 하며, 연결 후에는 Railway가 Let’s Encrypt 기반 SSL 인증서를 자동 발급·갱신합니다.

## DDoS 방어는 어떻게 해야 하나요?

Railway는 AWS Shield 같은 매니지드 DDoS 방어를 제공하지 않습니다. Cloudflare·Fastly 같은 프록시를 앞단에 두거나, 애플리케이션 레벨에서 Rate Limit·IP 차단을 구현해 보호해야 합니다.

## 내부 프라이빗 도메인으로 API를 호출할 수 있나요?

Railway 내부에서는 `http://서비스명.railway.internal:<PORT>` 형태로 호출할 수 있습니다. 다만 백엔드 컨테이너가 `process.env.PORT`(기본 8080)으로 바인딩되어 있어야 통신이 성립합니다. 로컬 빌드에서는 이 도메인이 해석되지 않으므로 퍼블릭 URL이나 로컬 API 주소를 사용해야 합니다.

## watch paths에 패키지 소스가 반영되지 않는 문제는 왜 생기나요?

기본 설정이 `/apps/blog-web/**`만 감시하므로 `packages/shared/**`와 같은 워크스페이스 패키지 변경이 무시됩니다. watch paths에 필요한 디렉터리를 추가하면 변경이 즉시 감지됩니다.

## NEXTAUTH_URL과 NEXTAUTH_SECRET 설정 시 주의할 점은 무엇인가요?

`NEXTAUTH_URL`은 프로토콜을 포함한 실제 프런트엔드 도메인으로 설정해야 하며, Google OAuth 콘솔에 동일한 리디렉션 URI를 등록해야 합니다. `NEXTAUTH_SECRET`은 환경별로 새로 생성해 두고 프런트와 백엔드의 JWT 서명 키와 일치시켜야 인증 오류를 예방할 수 있습니다.

## 내부 API 호출이 실패하는 가장 흔한 원인은 무엇이었나요?

백엔드 컨테이너가 기본 포트 8080에 바인딩되어 있지 않은 상태에서 `blog-api.railway.internal:8080`으로 호출했기 때문입니다. NestJS `app.listen(process.env.PORT ?? 3001, '0.0.0.0')` 형태로 수정하고 재배포하면 내부 통신이 정상화됩니다.
