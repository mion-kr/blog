import { config } from "dotenv";
import type { Config } from "drizzle-kit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configFileName = fileURLToPath(import.meta.url);
const configDirName = dirname(configFileName);

// blog-api의 .env 파일을 우선 로드하고, 없으면 루트 .env 시도
config({ path: resolve(configDirName, "../../.env") });

export default {
  schema: "./src/schemas/*",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
