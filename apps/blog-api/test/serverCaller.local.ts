import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { EncryptJWT } from 'jose';
import hkdf from '@panva/hkdf';

async function main() {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
  assert.equal(databaseUrl.hostname, '127.0.0.1');
  assert.equal(databaseUrl.pathname, '/caller_auth_test');
  assert.ok(databaseUrl.port);
  assert.equal(process.env.VERCEL, undefined);
  assert.equal(process.env.NODE_ENV, 'test');
  // 공유 개발값을 수정하지 않고 이 검증 프로세스에서만 사용하는 비밀입니다.
  process.env.BLOG_API_LOCAL_SECRET = randomBytes(32).toString('hex');
  const callerHeaders = {
    'X-Mion-Local-Caller': process.env.BLOG_API_LOCAL_SECRET,
  };
  const { AppModule } = await import('../src/app.module');
  const { db, users, categories, tags, posts, eq } = await import(
    '@repo/database'
  );
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const config = app.get(ConfigService);
  const ids: Record<'admin' | 'user' | 'category' | 'post', string> = {
    admin: randomUUID(),
    user: randomUUID(),
    category: randomUUID(),
    post: randomUUID(),
  };
  const slug = `caller-auth-${ids.post}`;
  const adminEmail = `caller-admin-${ids.admin}@example.invalid`;
  const userEmail = `caller-user-${ids.user}@example.invalid`;
  const signingSecret =
    config.get<string>('NEXTAUTH_SECRET') ?? config.get<string>('JWT_SECRET');
  assert.ok(signingSecret);
  const key = await hkdf(
    'sha256',
    signingSecret,
    '',
    'NextAuth.js Generated Encryption Key',
    32,
  );
  const session = (id: string, email: string) =>
    new EncryptJWT({ sub: id, googleId: id, email })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .encrypt(key);
  const adminToken = await session(ids.admin, adminEmail);
  const userToken = await session(ids.user, userEmail);
  const adminHeaders = {
    ...callerHeaders,
    Authorization: `Bearer ${adminToken}`,
  };
  const userHeaders = {
    ...callerHeaders,
    Authorization: `Bearer ${userToken}`,
  };
  let createdSlug: string | undefined;
  let tagId: string | undefined;
  try {
    await db.insert(users).values([
      {
        id: ids.admin,
        googleId: ids.admin,
        name: 'Caller Test Admin',
        email: adminEmail,
        role: 'ADMIN',
      },
      {
        id: ids.user,
        googleId: ids.user,
        name: 'Caller Test User',
        email: userEmail,
        role: 'USER',
      },
    ]);
    const [category] = await db
      .insert(categories)
      .values({ name: slug, slug })
      .returning();
    ids.category = category.id;
    const [tag] = await db
      .insert(tags)
      .values({ name: slug, slug })
      .returning();
    tagId = tag.id;
    await db.insert(posts).values({
      id: ids.post,
      title: 'Caller Test',
      slug,
      content: 'Local test content',
      authorId: ids.admin,
      categoryId: ids.category,
      published: true,
    });
    await app.listen(3112, '127.0.0.1');
    const baseUrl = await app.getUrl();
    const call = async (
      label: string,
      method: string,
      path: string,
      expected: number,
      headers: Record<string, string> = {},
      body?: object,
    ) => {
      const response = await fetch(`${baseUrl}/api${path}`, {
        method,
        headers: {
          ...headers,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(response.status, expected, label);
      console.log(`${label}: ${response.status}`);
      return response;
    };
    for (const [method, path] of [
      ['GET', '/posts'],
      ['GET', `/posts/${slug}`],
      ['POST', '/posts'],
      ['PUT', `/posts/${slug}`],
      ['DELETE', `/posts/${slug}`],
      ['GET', '/admin/posts'],
      ['GET', `/admin/posts/${slug}`],
    ]) {
      await call(
        '호출자 누락 ' + method + ' ' + path.replace(slug, ':slug'),
        method,
        path,
        401,
        { Authorization: `Bearer ${adminToken}` },
      );
    }
    const list = await call(
      '방문자 로그인 없는 목록',
      'GET',
      '/posts',
      200,
      callerHeaders,
    );
    assert.ok(
      (await list.json()).data.some(
        (post: { slug: string }) => post.slug === slug,
      ),
    );
    const detail = await call(
      '방문자 로그인 없는 상세',
      'GET',
      `/posts/${slug}?trackView=false`,
      200,
      callerHeaders,
    );
    assert.equal((await detail.json()).data.slug, slug);
    for (const [method, path] of [
      ['GET', '/admin/posts'],
      ['GET', `/admin/posts/${slug}`],
      ['POST', '/posts'],
      ['PUT', `/posts/${slug}`],
      ['DELETE', `/posts/${slug}`],
    ]) {
      await call(
        '사용자 인증 누락 ' + method,
        method,
        path,
        401,
        callerHeaders,
      );
      await call('일반 사용자 ' + method, method, path, 403, userHeaders);
    }
    await call('관리자 목록', 'GET', '/admin/posts', 200, adminHeaders);
    await call('관리자 상세', 'GET', `/admin/posts/${slug}`, 200, adminHeaders);
    const created = await call(
      '관리자 생성',
      'POST',
      '/posts',
      201,
      adminHeaders,
      {
        title: `Caller Created ${ids.post}`,
        content: 'Local test content',
        categoryId: ids.category,
        tagIds: [tagId],
        published: false,
      },
    );
    createdSlug = (await created.json()).data.slug;
    assert.ok(createdSlug);
    await call(
      '초안 공개 조회 차단',
      'GET',
      `/posts/${createdSlug}?trackView=false`,
      404,
      callerHeaders,
    );
    await call(
      '관리자 수정',
      'PUT',
      `/posts/${createdSlug}`,
      200,
      adminHeaders,
      { content: 'Caller Updated' },
    );
    await call(
      '관리자 삭제',
      'DELETE',
      `/posts/${createdSlug}`,
      204,
      adminHeaders,
    );
    await call('잘못된 OIDC 우회 차단', 'GET', '/posts', 401, {
      ...callerHeaders,
      'X-Mion-Caller-OIDC': 'invalid',
    });
    config.set('NODE_ENV', 'production');
    await call('운영의 로컬 인증 차단', 'GET', '/posts', 401, callerHeaders);
    config.set('NODE_ENV', 'test');
    config.set('VERCEL', '1');
    await call('Vercel의 로컬 인증 차단', 'GET', '/posts', 401, callerHeaders);
    console.log('실제 Nest/DB 호출 검증 완료');
  } finally {
    // 이 실행이 만든 행만 정리합니다. 다른 데이터에는 접근하지 않습니다.
    if (createdSlug) await db.delete(posts).where(eq(posts.slug, createdSlug));
    await db.delete(posts).where(eq(posts.id, ids.post));
    await db.delete(categories).where(eq(categories.id, ids.category));
    if (tagId) await db.delete(tags).where(eq(tags.id, tagId));
    await db.delete(users).where(eq(users.id, ids.admin));
    await db.delete(users).where(eq(users.id, ids.user));
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error.name, error.message);
    process.exit(1);
  });
