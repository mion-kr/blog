import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import { env } from './env';

export const getDb = () => drizzle(env.DB, { schema });
export type Db = ReturnType<typeof getDb>;
export { schema };
