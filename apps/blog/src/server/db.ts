import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import { env } from './env';

export const getDb = () => drizzle(env.DB, { schema });
/** 공개 화면 읽기용: D1 읽기 복제본을 쓰는 세션(withSession, first-unconstrained). 요청마다 하나 만들어 그 요청의 읽기에 함께 쓴다. 쓰기와 관리자 화면은 getDb(primary)를 쓴다. */
export const getReadDb = (): Db => drizzle(env.DB.withSession() as unknown as D1Database, { schema });
export type Db = ReturnType<typeof getDb>;
export { schema };
