import { env as cfEnv } from 'cloudflare:workers';

export type AppEnv = {
  DB: D1Database;
  MEDIA: R2Bucket;
  SITE_URL: string;
  ROBOTS_INDEXABLE: string;
  MEDIA_BASE_URL: string;
  SERVE_MEDIA_FROM_BINDING: string;
  ADMIN_WRITES_FROZEN: string;
  RSS_ITEMS_LIMIT: string;
  UPLOAD_ALLOWED_MIME: string;
  UPLOAD_MAX_SIZE: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ADMIN_EMAIL?: string;
  SESSION_SECRET?: string;
};

export const env = cfEnv as unknown as AppEnv;

/** 끝 슬래시 없는 사이트 주소 */
export const siteUrl = () => env.SITE_URL.replace(/\/$/, '');
