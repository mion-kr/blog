const DEFAULT_CALLBACK_URL = "/admin";

function hasUnsafeCallbackUrlCharacter(callbackUrl: string): boolean {
  return Array.from(callbackUrl).some((character) => {
    const characterCode = character.charCodeAt(0);

    return characterCode <= 0x1f || characterCode === 0x7f;
  });
}

function isSafeCallbackUrl(callbackUrl: string): boolean {
  if (
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.includes("\\") ||
    hasUnsafeCallbackUrlCharacter(callbackUrl)
  ) {
    return false;
  }

  let decodedCallbackUrl = callbackUrl;

  while (/%[0-9a-f]{2}/i.test(decodedCallbackUrl)) {
    try {
      const nextDecodedCallbackUrl = decodeURIComponent(decodedCallbackUrl);

      if (nextDecodedCallbackUrl === decodedCallbackUrl) {
        break;
      }

      decodedCallbackUrl = nextDecodedCallbackUrl;
    } catch {
      return false;
    }
  }

  return (
    decodedCallbackUrl.startsWith("/") &&
    !decodedCallbackUrl.startsWith("//") &&
    !decodedCallbackUrl.includes("\\") &&
    !hasUnsafeCallbackUrlCharacter(decodedCallbackUrl)
  );
}

export function getSafeCallbackUrl(callbackUrl?: string | string[]): string {
  if (typeof callbackUrl !== "string" || !isSafeCallbackUrl(callbackUrl)) {
    return DEFAULT_CALLBACK_URL;
  }

  return callbackUrl;
}
