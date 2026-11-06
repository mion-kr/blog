// Postgres 덤프(JSON) → D1 적재 SQL. 운영 Supabase는 읽기 전용 트랜잭션으로만 읽는다(dump.mjs).
export const TABLE_ORDER = ['users', 'categories', 'tags', 'posts', 'post_tags', 'settings'] as const;
export type Table = (typeof TABLE_ORDER)[number];
type Value = string | number | null;
export type Row = Record<string, Value>;
export type Dump = Record<Table, Row[]>;

// Postgres는 마이크로초까지 저장한다. 이관 전 JS Date처럼 밀리초 아래는 버린다(반올림하면 1ms 밀린다).
const ms = (col: string) => `floor(extract(epoch from ${col}) * 1000)::bigint AS ${col}`;

// 컬럼 순서가 곧 INSERT 컬럼 순서다.
export const DUMP_QUERIES: Record<Table, string> = {
  users: `SELECT id, email, name, image, google_id, role::text AS role, ${ms('created_at')}, ${ms('updated_at')} FROM users ORDER BY id`,
  categories: `SELECT id, name, slug, description, post_count, ${ms('created_at')}, ${ms('updated_at')} FROM categories ORDER BY id`,
  tags: `SELECT id, name, slug, post_count, ${ms('created_at')}, ${ms('updated_at')} FROM tags ORDER BY id`,
  posts: `SELECT id, title, slug, content, excerpt, cover_image, published::int AS published, view_count, category_id, author_id, ${ms('created_at')}, ${ms('updated_at')}, ${ms('published_at')} FROM posts ORDER BY id`,
  post_tags: `SELECT post_id, tag_id, ${ms('created_at')} FROM post_tags ORDER BY post_id, tag_id`,
  settings: `SELECT id, key, value, description, ${ms('updated_at')}, updated_by FROM settings ORDER BY id`,
};

const BOOLEAN_COLUMNS = new Set(['published']);
const TIME_COLUMNS = new Set(['created_at', 'updated_at', 'published_at']);
const MAX_STATEMENT_BYTES = 100_000;

function literal(column: string, value: Value): string {
  if (value === null) return 'NULL';
  if (BOOLEAN_COLUMNS.has(column) && value !== 0 && value !== 1) throw new Error(`${column}: 0/1이 아님 (${String(value)})`);
  if (TIME_COLUMNS.has(column) && !Number.isInteger(value)) throw new Error(`${column}: epoch ms 정수가 아님 (${String(value)})`);
  if (typeof value === 'number') return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

export function toSql(dump: Dump): string {
  const lines: string[] = [];
  for (const table of TABLE_ORDER) {
    for (const row of dump[table]) {
      const columns = Object.keys(row);
      const statement = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => literal(c, row[c] ?? null)).join(', ')});`;
      if (new TextEncoder().encode(statement).length > MAX_STATEMENT_BYTES) throw new Error(`${table} ${String(row.id ?? '')}: 문장이 100KB를 넘음`);
      lines.push(statement);
    }
  }
  return lines.join('\n') + '\n';
}
