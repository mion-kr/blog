import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ServerCallerGuard } from './serverCallerGuard';

describe('ServerCallerGuard 로컬 HTTP 인증', () => {
  let server: Server;
  let baseUrl: string;
  let config: ConfigService;
  const secret = randomBytes(32).toString('hex');

  beforeEach(async () => {
    config = new ConfigService({
      NODE_ENV: 'test',
      BLOG_API_LOCAL_SECRET: secret,
    });
    const guard = new ServerCallerGuard(config);
    server = createServer(async (req, res) => {
      try {
        await guard.canActivate(new ExecutionContextHost([req, res]));
        res.writeHead(200).end();
      } catch (error) {
        res.writeHead(error instanceof UnauthorizedException ? 401 : 500).end();
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it('사용자 토큰 없이 개발 호출자를 허용한다', async () => {
    config.set('NODE_ENV', 'development');
    expect(
      (await fetch(baseUrl, { headers: { 'X-Mion-Local-Caller': secret } }))
        .status,
    ).toBe(200);
  });

  it('테스트 환경의 호출자를 허용한다', async () => {
    expect(
      (await fetch(baseUrl, { headers: { 'X-Mion-Local-Caller': secret } }))
        .status,
    ).toBe(200);
  });

  it.each(['production', '', undefined])(
    '환경 %s에서는 로컬 인증을 거부한다',
    async (environment) => {
      config.set('NODE_ENV', environment);
      expect(
        (await fetch(baseUrl, { headers: { 'X-Mion-Local-Caller': secret } }))
          .status,
      ).toBe(401);
    },
  );

  it.each(['1', '0', ''])(
    'VERCEL=%s가 존재하면 로컬 인증을 거부한다',
    async (vercel) => {
      config.set('VERCEL', vercel);
      expect(
        (await fetch(baseUrl, { headers: { 'X-Mion-Local-Caller': secret } }))
          .status,
      ).toBe(401);
    },
  );

  it.each(['', 'incorrect'])('로컬 비밀 불일치를 거부한다', async (value) => {
    expect(
      (await fetch(baseUrl, { headers: { 'X-Mion-Local-Caller': value } }))
        .status,
    ).toBe(401);
  });

  it('로컬 비밀 설정이 없으면 거부한다', async () => {
    config.set('BLOG_API_LOCAL_SECRET', undefined);
    expect(
      (await fetch(baseUrl, { headers: { 'X-Mion-Local-Caller': secret } }))
        .status,
    ).toBe(401);
  });

  it('localhost Origin과 Referer만으로 인증을 우회할 수 없다', async () => {
    expect(
      (await fetch(baseUrl, { headers: { Origin: baseUrl, Referer: baseUrl } }))
        .status,
    ).toBe(401);
  });

  it('OIDC 미설정과 잘못된 토큰은 유효한 로컬 비밀이 있어도 거부한다', async () => {
    expect(
      (
        await fetch(baseUrl, {
          headers: {
            'X-Mion-Caller-OIDC': 'invalid',
            'X-Mion-Local-Caller': secret,
          },
        })
      ).status,
    ).toBe(401);
  });
});
