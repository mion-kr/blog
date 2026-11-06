// User 관련 타입 정의
export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export interface User {
  id: string; // UUID, Primary Key
  email: string; // Google에서 받은 이메일 (Unique)
  name: string; // Google에서 받은 이름
  image?: string; // Google 프로필 이미지 URL
  googleId: string; // Google OAuth ID (Unique)
  role: UserRole; // ADMIN 또는 USER
  createdAt: Date;
  updatedAt: Date;
}

// JWT 토큰 구조
export interface JWTPayload {
  sub: string; // 사용자 ID (UUID)
  email: string; // Google 이메일
  name: string; // Google에서 받은 이름
  role: UserRole; // ADMIN 또는 USER
  iat: number; // 발급 시간
  exp: number; // 만료 시간 (7일)
}

// 권한 매트릭스
export const PERMISSIONS = {
  ADMIN: {
    // 포스트 관련
    createPost: true,
    editPost: true,
    deletePost: true,
    publishPost: true,
    // 카테고리/태그 관리
    manageCategories: true,
    manageTags: true,
    // 사이트 관리
    viewAnalytics: true,
    manageUsers: true,
  },
  USER: {
    // 읽기 전용
    viewPosts: true,
    viewPublicProfile: true,
    // 향후 확장성을 위해 미리 정의
    createComment: false, // 나중에 댓글 기능 추가 시 활성화
    editOwnComment: false,
  },
} as const;