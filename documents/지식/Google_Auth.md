1. Google Cloud에서 OAuth 클라이언트 발급
   Google Cloud Console 접속 → 오른쪽 상단에서 관리자 계정으로 로그인.
   프로젝트가 없다면 새로 만들고, 있다면 사용할 프로젝트를 선택해요.
   좌측 메뉴에서 APIs & Services → Credentials로 이동.
   상단의 + Create Credentials → OAuth client ID 클릭.
   Application type은 “Web application” 선택.
   Redirect URI(승인된 리디렉션 URL)에 다음 경로를 추가:
   로컬 개발: <http://localhost:3000/api/auth/callback/google>
   배포 환경도 있다면 해당 도메인 기준으로 같은 경로 추가 (<https://your-domain/api/auth/callback/google>)
   생성 후 나오는 Client ID, Client Secret 값을 복사해둡니다.
2. 환경 변수 설정하기
   (1) 로컬 .env에 직접 넣는다면
   apps/blog-web/.env.local (또는 루트 .env) 파일에 아래처럼 추가해 주세요:

GOOGLE*CLIENT_ID=발급받은*클라이언트*ID
GOOGLE_CLIENT_SECRET=발급받은*클라이언트*SECRET
NEXTAUTH_SECRET=임의의*긴*랜덤값
ADMIN_EMAIL=관리자\_Google*계정\_이메일
NEXTAUTH_SECRET은 openssl rand -base64 32 같은 명령으로 생성된 랜덤 문자열이면 충분해요.
ADMIN_EMAIL은 관리자 권한을 줄 Google 계정 이메일로 맞춰줘야 /admin 접근이 허용돼요.
(2) Doppler를 사용 중이라면
프로젝트 루트의 doppler.yaml 기준으로 **환경(Env)**를 선택하세요. (apps/blog-web/doppler.yaml 참고)
CLI에서 doppler secrets set GOOGLE_CLIENT_ID=... --project mion-blog --config local_web 이런 식으로 저장하거나,
Doppler 대시보드에서 직접 키를 추가하시면 됩니다.
NEXTAUTH_SECRET, ADMIN_EMAIL도 같은 환경에 맞춰 입력해주세요.
로컬 실행 시 doppler run -- pnpm dev 형태로 돌리면 자동으로 값이 주입됩니다. 3. NextAuth 구성 확인
우리 프로젝트에서는 apps/blog-web/lib/auth-config.ts에서 GoogleProvider를 이미 세팅해 두었어요:

GoogleProvider({
clientId: process.env.GOOGLE_CLIENT_ID!,
clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
})
환경값만 올바르면 추가 코드는 필요 없어요. 관리자 이메일만 ADMIN_EMAIL과 일치하면 /admin에서 권한 체크도 통과합니다.
