import { Injectable } from '@nestjs/common';
import { db, eq, users } from '@repo/database';

import {
  AuthUsersRepository,
  UpsertAuthUserInput,
} from './auth-users.repository';

type UserRecord = typeof users.$inferSelect;
type UserInsert = typeof users.$inferInsert;

/**
 * Drizzle 기반 인증용 사용자 저장소 구현입니다.
 */
@Injectable()
export class DrizzleAuthUsersRepository implements AuthUsersRepository {
  /**
   * Google 계정 식별자로 사용자를 조회합니다.
   */
  async findByGoogleId(googleId: string): Promise<UserRecord | null> {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);

    return existing[0] ?? null;
  }

  /**
   * 사용자 변경분을 갱신합니다.
   */
  async updateById(userId: string, updates: Partial<UserInsert>): Promise<void> {
    await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * 사용자를 생성합니다.
   */
  async create(user: UpsertAuthUserInput): Promise<UserRecord> {
    const [created] = await db
      .insert(users)
      .values({
        email: user.email,
        name: user.name,
        image: user.image,
        googleId: user.googleId,
        role: user.role,
      })
      .returning();

    return created;
  }
}
