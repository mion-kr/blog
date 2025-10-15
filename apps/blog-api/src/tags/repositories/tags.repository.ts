import { TagEntity } from '../domain/tag.model';

export type TagSortField = 'createdAt' | 'updatedAt' | 'name' | 'postCount';
export type SortDirection = 'asc' | 'desc';

export interface FindTagsOptions {
  page: number;
  limit: number;
  sort: TagSortField;
  order: SortDirection;
  search?: string;
}

export interface CreateTagData {
  name: string;
  slug: string;
}

export interface UpdateTagData {
  name?: string;
  slug?: string;
}

export interface TagsRepository {
  findMany(
    options: FindTagsOptions,
  ): Promise<{ items: TagEntity[]; total: number }>;
  findBySlug(slug: string): Promise<TagEntity | null>;
  findById(id: string): Promise<TagEntity | null>;
  create(data: CreateTagData): Promise<TagEntity>;
  update(id: string, data: UpdateTagData): Promise<TagEntity>;
  delete(id: string): Promise<void>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  existsByName(name: string, excludeId?: string): Promise<boolean>;
  updatePostCount(tagId: string): Promise<void>;
  updateMultiplePostCounts(tagIds: string[]): Promise<void>;
  countPosts(tagId: string): Promise<number>;
}

export const TAGS_REPOSITORY = Symbol('TAGS_REPOSITORY');
