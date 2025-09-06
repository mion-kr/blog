import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "USER"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  googleId: text("google_id").notNull().unique(),
  role: userRoleEnum("role").notNull().default("USER"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});