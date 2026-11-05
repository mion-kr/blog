import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { getDb, schema } from '../db';
import type { GoogleIdentity } from './oauth';

const { users } = schema;

/** 이관 전 jwt.strategy ensureUserExists: google_id 기준, 바뀐 이름·사진만 갱신(사진 없으면 유지). */
export async function upsertAdminUser(identity: GoogleIdentity) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.googleId, identity.sub)).get();
  if (existing) {
    const updates: { name?: string; image?: string } = {};
    if (existing.name !== identity.name) updates.name = identity.name;
    if (identity.picture && existing.image !== identity.picture) updates.image = identity.picture;
    if (Object.keys(updates).length === 0) return existing;
    await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, existing.id));
    return { ...existing, ...updates };
  }
  const now = new Date();
  const created = { id: uuidv7(), email: identity.email, name: identity.name, image: identity.picture, googleId: identity.sub, role: 'ADMIN' as const, createdAt: now, updatedAt: now };
  await db.insert(users).values(created);
  return created;
}
