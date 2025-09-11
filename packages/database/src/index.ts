// Database package main export
export { db } from "./connection";
export { sql, eq, and, or, like, desc, asc, ilike, count } from "drizzle-orm";
export * from "./schemas/index";

// Environment variable utilities export
export {
  loadEnvironmentVariables,
  validateRequiredEnvironmentVariables,
  getEnvironmentVariable
} from "./config/env-loader";
