const postHosts = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);

export function parseXPostUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !postHosts.has(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    const match = url.pathname.match(
      /^\/(?:[A-Za-z0-9_]{1,15}\/status|i\/web\/status)\/([1-9]\d{0,19})(?:\/(?:photo|video)\/[1-9]\d*)?\/?$/,
    );
    const id = match?.[1];
    if (!id) return null;

    return { id, href: `https://x.com/i/web/status/${id}` };
  } catch {
    return null;
  }
}
