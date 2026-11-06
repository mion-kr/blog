// .migration/dump.json → .migration/load.sql, clear.sql
// MEDIA_FROM: 덤프의 커버 URL에서 찾은 Supabase 공개 버킷 접두사(하나여야 한다), MEDIA_TO: 새 공개 주소.
import { readFileSync, writeFileSync } from 'node:fs';
import { TABLE_ORDER, toSql, type Dump } from './dump-to-sql.ts';
import { rewriteDumpUrls } from './rewrite-urls.ts';

export function findMediaPrefix(dump: Dump): string {
  const prefixes = new Set(
    dump.posts
      .map((p) => /^(https:\/\/[^/]+\/storage\/v1\/object\/public\/production\/)/.exec(String(p.cover_image ?? ''))?.[1])
      .filter((v): v is string => Boolean(v)),
  );
  if (prefixes.size !== 1) throw new Error(`Supabase 접두사가 하나가 아님: ${prefixes.size}`);
  return [...prefixes][0]!;
}

export const CLEAR_SQL = [...TABLE_ORDER].reverse().map((t) => `DELETE FROM ${t};`).join('\n') + '\n';

if (import.meta.main) {
  const to = process.env.MEDIA_TO ?? 'https://media.mion-space.dev/';
  const dump = JSON.parse(readFileSync('.migration/dump.json', 'utf8')) as Dump;
  const from = findMediaPrefix(dump);
  writeFileSync('.migration/load.sql', toSql(rewriteDumpUrls(dump, from, to)));
  writeFileSync('.migration/clear.sql', CLEAR_SQL);
  console.log('load.sql, clear.sql 생성');
}
