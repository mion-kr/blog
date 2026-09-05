import assert from "node:assert/strict";
import test from "node:test";

import { parseXPostUrl } from "../lib/mdx/parseXPostUrl.ts";

test("사례 URL과 공유용 주소에서 정밀도 손실 없이 게시물 ID를 추출합니다", () => {
  for (const [author, id] of [
    ["skirano", "2095648379455861054"],
    ["tomkrcha", "2095598645190291775"],
    ["mreflow", "2095601201958309895"],
  ]) {
    assert.deepEqual(
      parseXPostUrl(`https://x.com/${author}/status/${id}?s=20`),
      {
        id,
        href: `https://x.com/i/web/status/${id}`,
      },
    );
  }
  assert.equal(
    parseXPostUrl("https://www.twitter.com/skirano/status/20/video/1")?.id,
    "20",
  );
  assert.equal(parseXPostUrl("https://x.com/i/web/status/20")?.id, "20");
});

test("외부 호스트, 실행 가능한 주소, 자격 증명, 잘못된 게시물 경로를 거부합니다", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://x.com/a/status/20",
    "https://x.com.evil.test/a/status/20",
    "https://x.com@evil.test/a/status/20",
    "https://user@x.com/a/status/20",
    "https://x.com:8443/a/status/20",
    "https://x.com/a/status/0",
    "https://x.com/a/status/20extra",
    "https://x.com/a/status/20/anything",
    "https://x.com/a/status/1e20",
    "https://x.com/a/status/123456789012345678901",
    "https://x.com/a",
    "not a url",
    "",
  ]) {
    assert.equal(parseXPostUrl(url), null, url);
  }
});
