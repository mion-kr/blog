import type { D1Migration } from 'cloudflare:test';

declare module 'cloudflare:workers' {
  interface ProvidedEnv {
    DB: D1Database;
    MEDIA: R2Bucket;
    TEST_MIGRATIONS: D1Migration[];
  }
}
