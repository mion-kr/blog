import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  postCount: integer("post_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});