import type { Tag, TagsQuery } from '@repo/shared';

export interface AdminTagsData {
  tags: Tag[];
  total: number;
  query: TagsQuery;
}
