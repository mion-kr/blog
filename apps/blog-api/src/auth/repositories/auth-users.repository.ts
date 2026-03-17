import type { users } from '@repo/database';

type UserRecord = typeof users.$inferSelect;
type UserInsert = typeof users.$inferInsert;

/**
 * 인증 전략이 필요로 하는 사용자 upsert 입력입니다.
 */
export interface UpsertAuthUserInput {
  googleId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  image?: string;
}

/**
 * 인증용 사용자 저장소 계약입니다.
 */
export interface AuthUsersRepository {
  /**
   * Google 계정 식별자로 사용자를 조회합니다.
   */
  findByGoogleId(googleId: string): Promise<UserRecord | null>;

  /**
   * 사용자 정보를 변경분만 반영해 갱신합니다.
   */
  updateById(userId: string, updates: Partial<UserInsert>): Promise<void>;

  /**
   * 사용자를 생성합니다.
   */
  create(user: UpsertAuthUserInput): Promise<UserRecord>;
}

/**
 * 인증용 사용자 저장소 DI 토큰입니다.
 */
export const AUTH_USERS_REPOSITORY = Symbol('AUTH_USERS_REPOSITORY');
