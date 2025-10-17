// 블로그 관련 타입 정의

export interface Category {
  id: string; // UUID, Primary Key
  name: string; // 카테고리 이름 (예: "개발", "일상", "리뷰")
  slug: string; // URL 친화적 문자열 (예: "development", "daily", "review")
  description?: string; // 카테고리 설명
  color?: string; // 테마 색상 (hex 코드)
  postCount: number; // 해당 카테고리의 발행된 포스트 수
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string; // UUID, Primary Key
  name: string; // 태그 이름 (예: "Next.js", "TypeScript", "블로그")
  slug: string; // URL 친화적 문자열 (예: "nextjs", "typescript", "blog")
  postCount: number; // 해당 태그를 사용하는 발행된 포스트 수
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string; // UUID, Primary Key
  title: string; // 제목 (MDX H1에서 추출)
  slug: string; // URL 친화적 제목 (예: "my-first-post")
  content: string; // MDX 원본 내용
  excerpt?: string; // 요약 (자동 생성 또는 수동 입력)
  coverImage?: string; // 썸네일 이미지 URL
  published: boolean; // 발행 상태 (draft/published)
  viewCount: number; // 조회수 (기본값: 0)
  categoryId: string; // 카테고리 ID (Foreign Key)
  authorId: string; // 작성자 ID (Foreign Key - Mion만 가능)
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date; // 발행일시
}

export interface PostTag {
  postId: string; // Post ID (Foreign Key)
  tagId: string; // Tag ID (Foreign Key)
  createdAt: Date;
}

// 포스트 목록 조회용 (관계 포함)
export interface PostWithRelations extends Post {
  category: Category;
  tags: Tag[];
  author: {
    id: string;
    name: string;
    image?: string;
  };
}

// 포스트 생성/수정 DTO
export interface CreatePostDto {
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  coverImageKey?: string;
  published: boolean;
  categoryId: string;
  tagIds: string[];
  draftUuid?: string;
}

export interface UpdatePostDto extends Partial<CreatePostDto> {}

// 카테고리 DTO
export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

// 태그 DTO
export interface CreateTagDto {
  name: string;
  slug: string;
}

export interface UpdateTagDto extends Partial<CreateTagDto> {}

// API 응답 DTO
export interface PostResponseDto extends PostWithRelations {
  // PostWithRelations에서 상속받은 모든 속성들 사용
  // 추가적인 API 응답 전용 필드가 있다면 여기에 추가
}

// 블로그 설정 DTO
export interface BlogSettings {
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  postsPerPage: number;
  profileImageUrl?: string;
}

export interface UpdateBlogSettingsDto extends Partial<BlogSettings> {
  profileImageRemove?: boolean;
}

export interface PublicSiteSettings {
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  profileImageUrl?: string | null;
}
