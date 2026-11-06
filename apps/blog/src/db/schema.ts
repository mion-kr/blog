import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { uuidv7 } from 'uuidv7';

// Postgres(packages/database)와 같은 테이블·컬럼 이름. boolean은 0/1, 시간은 UTC epoch ms.
const id = () => text('id').primaryKey().$defaultFn(() => uuidv7());
const createdAt = () => integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date());
const updatedAt = () => integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date());

export const users = sqliteTable(
  'users',
  {
    id: id(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    image: text('image'),
    googleId: text('google_id').notNull().unique(),
    role: text('role', { enum: ['ADMIN', 'USER'] }).notNull().default('USER'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check('users_role_check', sql`${t.role} IN ('ADMIN', 'USER')`)],
);

export const categories = sqliteTable('categories', {
  id: id(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  postCount: integer('post_count').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const tags = sqliteTable('tags', {
  id: id(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  postCount: integer('post_count').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const posts = sqliteTable(
  'posts',
  {
    id: id(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    content: text('content').notNull(),
    excerpt: text('excerpt'),
    coverImage: text('cover_image'),
    published: integer('published', { mode: 'boolean' }).notNull().default(false),
    viewCount: integer('view_count').notNull().default(0),
    categoryId: text('category_id').notNull().references(() => categories.id),
    authorId: text('author_id').notNull().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    index('posts_published_published_at_idx').on(t.published, t.publishedAt),
    index('posts_published_view_count_idx').on(t.published, t.viewCount),
  ],
);

export const postTags = sqliteTable(
  'post_tags',
  {
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index('post_tags_tag_id_idx').on(t.tagId)],
);

export const settings = sqliteTable('settings', {
  id: id(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: updatedAt(),
  updatedBy: text('updated_by').references(() => users.id),
});
