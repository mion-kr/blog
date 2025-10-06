export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}
