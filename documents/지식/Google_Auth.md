1. Google Cloud에서 OAuth 클라이언트를 발급합니다.
   Google Cloud Console에 접속해 오른쪽 상단에서 관리자 계정으로 로그인합니다.
   프로젝트가 없다면 새로 만들고, 있다면 사용할 프로젝트를 선택합니다.
   좌측 메뉴에서 APIs & Services → Credentials로 이동합니다.
   상단의 + Create Credentials → OAuth client ID를 클릭합니다.
   Application type은 “Web application”으로 선택합니다.
   Redirect URI(승인된 리디렉션 URL)에 다음 경로를 추가합니다.
   · 로컬 개발: <http://localhost:3000/api/auth/callback/google>
   · 배포 환경: <https://your-domain/api/auth/callback/google> 형태로 실제 도메인을 입력합니다.
   생성 후 표시되는 Client ID와 Client Secret 값을 복사해 둡니다.

2. 환경 변수를 설정합니다.
   (1) 로컬 .env 파일을 사용하는 경우
   apps/blog-web/.env.local(또는 루트 .env) 파일에 아래 내용을 추가합니다.

GOOGLE_CLIENT_ID=발급받은_클라이언트_ID
GOOGLE_CLIENT_SECRET=발급받은_클라이언트_SECRET
NEXTAUTH_SECRET=임의의_긴_랜덤값
ADMIN_EMAIL=관리자_Google_계정_이메일

   NEXTAUTH_SECRET 값은 `openssl rand -base64 32` 명령으로 생성한 랜덤 문자열이면 충분합니다.
   ADMIN_EMAIL은 관리자 권한을 부여할 Google 계정 이메일과 일치해야 /admin 접근이 허용됩니다.
   (2) Doppler를 사용하는 경우
   프로젝트 루트의 doppler.yaml 기준으로 사용할 환경(Environment)을 선택합니다.(apps/blog-web/doppler.yaml 참고)
   CLI에서 `doppler secrets set GOOGLE_CLIENT_ID=... --project mion-blog --config local_web`처럼 입력하거나
   Doppler 대시보드에서 직접 키를 추가합니다.
   NEXTAUTH_SECRET과 ADMIN_EMAIL도 동일한 환경에 맞춰 넣습니다.
   로컬 실행 시 `doppler run -- pnpm dev` 명령을 사용하면 값이 자동으로 주입됩니다.

3. NextAuth 구성을 확인합니다.
   우리 프로젝트에서는 apps/blog-web/lib/auth-config.ts에서 GoogleProvider를 이미 설정해 두었습니다.

GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
})

   환경 변수만 올바르게 입력하면 추가 코드는 필요 없습니다.
   관리자 이메일이 ADMIN_EMAIL과 일치하면 /admin에서 권한 검사가 정상적으로 통과합니다.
