import { env } from 'cloudflare:workers';

// 테스트 파일 안에서는 저장소가 공유되므로 각 테스트 전에 자식 테이블부터 비운다.
export async function clearTables() {
  const db = env.DB;
  await db.batch(
    ['post_tags', 'posts', 'settings', 'tags', 'categories', 'users'].map((t) => db.prepare(`DELETE FROM ${t}`)),
  );
}
