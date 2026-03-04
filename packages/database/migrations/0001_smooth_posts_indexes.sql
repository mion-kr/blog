CREATE INDEX IF NOT EXISTS "posts_published_published_at_idx"
  ON "posts" ("published", "published_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_published_view_count_idx"
  ON "posts" ("published", "view_count" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_tags_post_id_idx"
  ON "post_tags" ("post_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_tags_tag_id_idx"
  ON "post_tags" ("tag_id");
