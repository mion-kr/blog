import {
  PaginatedPostResult,
  PostAggregate,
  PostEntity,
} from '../domain/post.model';

export type PostSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt'
  | 'title'
  | 'viewCount';
export type SortDirection = 'asc' | 'desc';

export interface FindPostsOptions {
  page: number;
  limit: number;
  sort: PostSortField;
  order: SortDirection;
  published?: boolean;
  categoryId?: string;
  tagId?: string;
  search?: string;
  authorId?: string;
}

export interface CreatePostData {
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  coverImage?: string | null;
  published: boolean;
  categoryId: string;
  authorId: string;
  tagIds: string[];
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  excerpt?: string | null;
  coverImage?: string | null;
  published?: boolean;
  categoryId?: string;
  slug?: string;
  publishedAt?: Date | null;
  tagIds?: string[];
}

export interface PostsRepository {
  findMany(options: FindPostsOptions): Promise<PaginatedPostResult>;
  findBySlug(slug: string): Promise<PostAggregate | null>;
  findBasicBySlug(slug: string): Promise<PostEntity | null>;
  findTagIdsByPostId(postId: string): Promise<string[]>;
  fetchSlugsByPrefix(prefix: string, excludePostId?: string): Promise<string[]>;
  findCategoryIdBySlug(slug: string): Promise<string | undefined>;
  findTagIdBySlug(slug: string): Promise<string | undefined>;
  create(data: CreatePostData): Promise<PostAggregate>;
  update(postId: string, data: UpdatePostData): Promise<void>;
  delete(postId: string): Promise<void>;
  categoryExists(categoryId: string): Promise<boolean>;
  findExistingTagIds(tagIds: string[]): Promise<string[]>;
  incrementViewCount(postId: string): Promise<number>;
}

export const POSTS_REPOSITORY = Symbol('POSTS_REPOSITORY');
