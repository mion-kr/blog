import { Injectable } from '@nestjs/common';
import { blogSettings, db } from '@repo/database';

import {
  SettingsRepository,
  SettingsRow,
  SettingsUpsertEntry,
} from './settings.repository';

/**
 * Drizzle 기반 설정 저장소 구현입니다.
 */
@Injectable()
export class DrizzleSettingsRepository implements SettingsRepository {
  /**
   * 저장된 설정 행을 모두 조회합니다.
   */
  async findAll(): Promise<SettingsRow[]> {
    const rows = await db.select().from(blogSettings);

    // 저장소는 DB 행을 설정 키/값 계약으로만 정규화합니다.
    return rows.map((row) => ({
      key: row.key as SettingsRow['key'],
      value: row.value,
    }));
  }

  /**
   * 변경된 설정 키/값을 upsert 합니다.
   */
  async upsertMany(entries: SettingsUpsertEntry[], userId: string): Promise<void> {
    const now = new Date();

    // 변경 집합을 하나의 트랜잭션으로 묶어 설정 정합성을 유지합니다.
    await db.transaction(async (tx) => {
      for (const { key, value } of entries) {
        await tx
          .insert(blogSettings)
          .values({
            key,
            value,
            updatedAt: now,
            updatedBy: userId,
          })
          .onConflictDoUpdate({
            target: blogSettings.key,
            set: {
              value,
              updatedAt: now,
              updatedBy: userId,
            },
          });
      }
    });
  }
}
