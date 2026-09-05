import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
} from 'jose';
import { ServerCallerGuard } from './serverCallerGuard';

// 승인된 테스트 대역: JWKS 제공처만 바꾸고 서명/클레임 검증은 실제 jose를 실행합니다.
jest.mock('jose', () => ({
  ...jest.requireActual<typeof import('jose')>('jose'),
  createRemoteJWKSet: jest.fn(),
}));

describe('ServerCallerGuard OIDC 암호 검증', () => {
  const issuer = 'https://oidc.vercel.com/caller-test-team';
  const audience = 'https://vercel.com/caller-test-team';
  const subject =
    'owner:caller-test-team:project:caller-test-web:environment:production';
  let keys: Awaited<ReturnType<typeof generateKeyPair>>;
  let otherKeys: Awaited<ReturnType<typeof generateKeyPair>>;
  let server: Server;
  let baseUrl: string;
  let config: ConfigService;

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    otherKeys = await generateKeyPair('RS256');
  });

  beforeEach(async () => {
    const jwk = {
      ...(await exportJWK(keys.publicKey)),
      kid: 'caller-test-key',
      alg: 'RS256',
    };
    jest
      .mocked(createRemoteJWKSet)
      .mockReset()
      .mockReturnValue(
        createLocalJWKSet({ keys: [jwk] }) as ReturnType<
          typeof createRemoteJWKSet
        >,
      );
    config = new ConfigService({
      NODE_ENV: 'production',
      BLOG_API_CALLER_ISSUER: issuer,
      BLOG_API_CALLER_AUDIENCE: audience,
      BLOG_API_CALLER_SUBJECT: subject,
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

  const token = (
    overrides: JWTPayload = {},
    signingKey?: typeof keys.privateKey,
  ) => {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      iss: issuer,
      aud: audience,
      sub: subject,
      iat: now,
      exp: now + 60,
      ...overrides,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'caller-test-key' })
      .sign(signingKey ?? keys.privateKey);
  };
  const status = async (oidc: string) =>
    (await fetch(baseUrl, { headers: { 'X-Mion-Caller-OIDC': oidc } })).status;

  it('신뢰하는 서버의 정상 서명을 사용자 토큰 없이 허용한다', async () => {
    expect(await status(await token())).toBe(200);
    expect(createRemoteJWKSet).toHaveBeenCalledWith(
      new URL(`${issuer}/.well-known/jwks`),
    );
    expect(await status(await token())).toBe(200);
    expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
  });

  it('다른 키로 위조한 서명을 거부한다', async () => {
    expect(await status(await token({}, otherKeys.privateKey))).toBe(401);
  });

  it.each([
    ['만료', { exp: 1 }],
    ['만료 누락', { exp: undefined }],
    ['발급 시각 누락', { iat: undefined }],
    ['다른 issuer', { iss: 'https://oidc.vercel.com/other-test-team' }],
    ['다른 audience', { aud: 'https://vercel.com/other-test-team' }],
    [
      '다른 프로젝트',
      {
        sub: 'owner:caller-test-team:project:other-test-web:environment:production',
      },
    ],
    [
      '다른 환경',
      {
        sub: 'owner:caller-test-team:project:caller-test-web:environment:preview',
      },
    ],
    ['subject 누락', { sub: undefined }],
    ['아직 유효하지 않음', { nbf: 9999999999 }],
  ] as Array<[string, JWTPayload]>)(
    '%s 토큰을 거부한다',
    async (_label, claims) => {
      expect(await status(await token(claims))).toBe(401);
    },
  );

  it.each([
    'BLOG_API_CALLER_ISSUER',
    'BLOG_API_CALLER_AUDIENCE',
    'BLOG_API_CALLER_SUBJECT',
  ])('%s 미설정을 거부한다', async (name) => {
    config.set(name, '');
    expect(await status(await token())).toBe(401);
    expect(createRemoteJWKSet).not.toHaveBeenCalled();
  });

  it('Vercel 이외의 issuer 설정을 거부한다', async () => {
    config.set('BLOG_API_CALLER_ISSUER', 'https://example.invalid');
    expect(await status(await token())).toBe(401);
    expect(createRemoteJWKSet).not.toHaveBeenCalled();
  });

  it('깨진 토큰을 거부한다', async () => {
    expect(await status('invalid')).toBe(401);
  });

  it('JWKS 제공 실패를 거부한다', async () => {
    jest.mocked(createRemoteJWKSet).mockImplementation(() => {
      throw new Error('Test JWKS unavailable');
    });
    expect(await status(await token())).toBe(401);
  });

  it('global issuer의 공개 키 경로와 클레임을 검증한다', async () => {
    config.set('BLOG_API_CALLER_ISSUER', 'https://oidc.vercel.com');
    expect(await status(await token({ iss: 'https://oidc.vercel.com' }))).toBe(
      200,
    );
    expect(createRemoteJWKSet).toHaveBeenCalledWith(
      new URL('https://oidc.vercel.com/.well-known/jwks'),
    );
  });
});
