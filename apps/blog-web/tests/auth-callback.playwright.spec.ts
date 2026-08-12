import { expect, test } from "@playwright/test";

import { getSafeCallbackUrl } from "../lib/auth/callback-url";

test("내부 세부 경로와 쿼리, 해시를 로그인 후 이동 경로로 유지한다", () => {
  expect(getSafeCallbackUrl("/admin/posts?status=draft#editor")).toBe(
    "/admin/posts?status=draft#editor",
  );
});

test("외부 또는 우회 로그인 후 이동 경로는 관리자 기본 경로로 대체한다", () => {
  for (const callbackUrl of [
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
    "/%5cattacker.example",
    "/%2f%2fattacker.example",
    "/%252f%252fattacker.example",
    "/%255cattacker.example",
    "/\n/attacker.example",
    "/%0a/attacker.example",
  ]) {
    expect(getSafeCallbackUrl(callbackUrl)).toBe("/admin");
  }
});

test("중복 로그인 후 이동 경로는 관리자 기본 경로로 대체한다", () => {
  expect(getSafeCallbackUrl(["/admin", "//attacker.example"])).toBe("/admin");
});
