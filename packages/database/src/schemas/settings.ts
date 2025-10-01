import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "./users";

export const blogSettings = pgTable("settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by").references(() => users.id),
});