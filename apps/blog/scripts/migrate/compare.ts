// 운영 Supabase(읽기 전용)와 D1을 전 컬럼 비교한다. 차이가 있으면 종료 코드 1.
// 실행: DATABASE_URL=… node scripts/migrate/compare.ts --local
import { execFileSync } from 'node:child_process';
import { TABLE_ORDER, type Dump } from './dump-to-sql.ts';
import { findMediaPrefix } from './build-sql.ts';
import { rewriteDumpUrls } from './rewrite-urls.ts';
import { diffDumps } from './compare-core.ts';
import { readDump } from './dump.ts';

const target = process.argv.includes('--remote') ? '--remote' : '--local';
const to = process.env.MEDIA_TO ?? 'https://media.mion-space.dev/';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL이 없다');

const source = await readDump(url);
const expected = rewriteDumpUrls(source, findMediaPrefix(source), to);
const actual = {} as Dump;
for (const table of TABLE_ORDER) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'mion-blog', target, '--json', '--command', `SELECT * FROM ${table}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  actual[table] = JSON.parse(out)[0].results;
}
const diffs = diffDumps(expected, actual);
console.log(Object.fromEntries(TABLE_ORDER.map((t) => [t, `${expected[t].length}/${actual[t].length}`])));
if (diffs.length) {
  console.error(diffs.slice(0, 50).join('\n'));
  process.exit(1);
}
console.log('전 컬럼 일치');
