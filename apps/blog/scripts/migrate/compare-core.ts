import { TABLE_ORDER, type Dump, type Row } from './dump-to-sql.ts';

const keyOf = (table: string, row: Row) => (table === 'post_tags' ? `${row.post_id}|${row.tag_id}` : String(row.id));

// 이관 전(치환 규칙 적용 후)과 D1의 모든 테이블·모든 컬럼을 비교한다. 빈 배열이면 일치.
export function diffDumps(expected: Dump, actual: Dump): string[] {
  const diffs: string[] = [];
  for (const table of TABLE_ORDER) {
    const exp = new Map(expected[table].map((r) => [keyOf(table, r), r]));
    const act = new Map(actual[table].map((r) => [keyOf(table, r), r]));
    if (exp.size !== act.size) diffs.push(`${table}: 개수 ${exp.size} → ${act.size}`);
    for (const [key, row] of exp) {
      const other = act.get(key);
      if (!other) {
        diffs.push(`${table} ${key}: 없음`);
        continue;
      }
      for (const column of new Set([...Object.keys(row), ...Object.keys(other)])) {
        if (row[column] !== other[column]) diffs.push(`${table} ${key}.${column}: ${String(row[column])} → ${String(other[column])}`);
      }
    }
    for (const key of act.keys()) if (!exp.has(key)) diffs.push(`${table} ${key}: 이관 전에 없음`);
  }
  return diffs;
}
