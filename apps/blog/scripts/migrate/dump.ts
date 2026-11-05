// 운영 Supabase를 읽기 전용 트랜잭션으로 덤프한다. 쓰기 문장은 없다.
// 실행: DATABASE_URL=… node scripts/migrate/dump.ts  →  .migration/dump.json
import { mkdirSync, writeFileSync } from 'node:fs';
import postgres from 'postgres';
import { DUMP_QUERIES, TABLE_ORDER, type Dump } from './dump-to-sql.ts';

export async function readDump(url: string): Promise<Dump> {
  const sql = postgres(url, { prepare: false, max: 1, types: { bigint: postgres.BigInt } });
  try {
    return await sql.begin('read only', async (tx) => {
      const out = {} as Dump;
      for (const table of TABLE_ORDER) {
        const rows = await tx.unsafe(DUMP_QUERIES[table]);
        // bigint(epoch ms)는 안전한 정수 범위라 number로 바꾼다.
        out[table] = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])));
      }
      return out;
    });
  } finally {
    await sql.end();
  }
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL이 없다');
  const dump = await readDump(url);
  mkdirSync('.migration', { recursive: true });
  writeFileSync('.migration/dump.json', JSON.stringify(dump));
  console.log(Object.fromEntries(TABLE_ORDER.map((t) => [t, dump[t].length])));
}
