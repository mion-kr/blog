// 운영 Supabase(읽기 전용)와 D1을 전 컬럼 비교한다. 차이가 있으면 종료 코드 1.
// 실행: DATABASE_URL=… node scripts/migrate/compare.ts --local
import { execFileSync } from 'node:child_process';
import { TABLE_ORDER, type Dump } from './dump-to-sql.ts';
import { findMediaPrefix } from './build-sql.ts';
import { rewriteDumpUrls } from './rewrite-urls.ts';
import { diffDumps } from './compare-core.ts';
import { readDump } from './dump.ts';
import postgres from 'postgres';

// 덤프 쿼리와 별도로, 드라이버가 읽은 값(이관 전 앱이 보던 값)을 UTC 기준으로 바꿔 한 번 더 비교한다.
if (process.env.TZ !== 'UTC') throw new Error('TZ=UTC로 실행해야 한다(타임존 없는 timestamp를 UTC로 해석)');
async function readRaw(url: string): Promise<Dump> {
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    return await sql.begin('read only', async (tx) => {
      const out = {} as Dump;
      for (const table of TABLE_ORDER) {
        const rows = await tx.unsafe(`SELECT * FROM ${table}`);
        out[table] = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.getTime() : typeof v === 'boolean' ? Number(v) : (v as string | number | null)])));
      }
      return out;
    });
  } finally {
    await sql.end();
  }
}

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
const raw = await readRaw(url);
const diffs = [...diffDumps(expected, actual), ...diffDumps(rewriteDumpUrls(raw, findMediaPrefix(raw), to), actual).map((d) => `[드라이버] ${d}`)];
console.log(Object.fromEntries(TABLE_ORDER.map((t) => [t, `${expected[t].length}/${actual[t].length}`])));
if (diffs.length) {
  console.error(diffs.slice(0, 50).join('\n'));
  process.exit(1);
}
console.log('전 컬럼 일치');
