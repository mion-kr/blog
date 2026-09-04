import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas/index";
import { 
  loadEnvironmentVariables, 
  validateRequiredEnvironmentVariables,
  getEnvironmentVariable 
} from "./config/env-loader";

// 확장 가능한 환경변수 로딩
loadEnvironmentVariables();

// 필수 환경변수 검증
validateRequiredEnvironmentVariables(['DATABASE_URL']);

// 안전한 환경변수 접근
const connectionString = getEnvironmentVariable('DATABASE_URL');

if (!connectionString) {
  throw new Error('DATABASE_URL is required but not found in environment variables');
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
