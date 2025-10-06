import { getAuthorizationToken, handleServerAuthError } from '@/lib/auth';
import { ReauthenticationRequiredError } from '@/lib/api-errors';

export async function requireTokenOrRedirect(
  returnTo: string,
): Promise<string> {
  const token = await getAuthorizationToken();
  if (token) {
    return token;
  }

  handleServerAuthError(
    new ReauthenticationRequiredError(
      401,
      '세션 정보가 만료되었어요. 다시 로그인해 주세요.',
    ),
    { returnTo },
  );
}
