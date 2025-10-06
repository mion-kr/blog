export interface PostAuthor {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
}

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  postCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PostTag {
  id: string;
  name: string;
  slug: string;
  postCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PostEntity {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  coverImage?: string | null;
  published: boolean;
  viewCount: number;
  categoryId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
}

export interface PostAggregate extends PostEntity {
  category: PostCategory;
  author: PostAuthor;
  tags: PostTag[];
}

export interface PaginatedPostResult {
  items: PostAggregate[];
  total: number;
}
