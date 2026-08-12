import { UnauthorizedException } from '@nestjs/common';
import hkdf from '@panva/hkdf';
import { jwtDecrypt, type JWTPayload } from 'jose';

import type { AuthUsersRepository } from '../repositories/auth-users.repository';
import { JwtStrategy } from './jwt.strategy';

jest.mock('@panva/hkdf', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('jose', () => ({
  jwtDecrypt: jest.fn(),
}));

type AuthUserRecord = NonNullable<
  Awaited<ReturnType<AuthUsersRepository['findByGoogleId']>>
>;

const createUserRecord = (
  overrides: Partial<AuthUserRecord> = {},
): AuthUserRecord => ({
  id: 'user-id',
  email: 'user@example.com',
  name: 'Current User',
  image: null,
  googleId: 'google-user-id',
  role: 'USER',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('JwtStrategy', () => {
  const authUsersRepository: jest.Mocked<AuthUsersRepository> = {
    findByGoogleId: jest.fn(),
    updateById: jest.fn(),
    create: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) =>
      key === 'NEXTAUTH_SECRET' ? 'test-nextauth-secret' : undefined,
    ),
  };
  const jwtDecryptMock = jest.mocked(jwtDecrypt);
  const hkdfMock = jest.mocked(hkdf);

  beforeEach(() => {
    jest.clearAllMocks();
    hkdfMock.mockResolvedValue(new Uint8Array(32));
  });

  const decryptPayload = (payload: JWTPayload) => {
    jwtDecryptMock.mockResolvedValue({ payload } as never);
  };

  const validate = async (payload: JWTPayload) => {
    decryptPayload(payload);
    const strategy = new JwtStrategy(
      configService as never,
      authUsersRepository,
    );

    return strategy.validate({
      headers: { authorization: 'Bearer encrypted-session-token' },
    } as never);
  };

  it('keeps a downgraded server-side role when a stale administrator token is used', async () => {
    const existingUser = createUserRecord({ role: 'USER' });
    authUsersRepository.findByGoogleId.mockResolvedValue(existingUser);

    const authenticatedUser = await validate({
      sub: 'nextauth-user-id',
      email: existingUser.email,
      name: existingUser.name,
      googleId: existingUser.googleId,
      role: 'ADMIN',
    });

    expect(authenticatedUser.role).toBe('USER');
    expect(authUsersRepository.updateById).not.toHaveBeenCalled();
    expect(authUsersRepository.create).not.toHaveBeenCalled();
  });

  it('authenticates an existing administrator with the server-side role', async () => {
    const existingUser = createUserRecord({ role: 'ADMIN' });
    authUsersRepository.findByGoogleId.mockResolvedValue(existingUser);

    const authenticatedUser = await validate({
      sub: 'nextauth-user-id',
      email: existingUser.email,
      name: existingUser.name,
      googleId: existingUser.googleId,
      role: 'ADMIN',
    });

    expect(authenticatedUser).toMatchObject({
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      role: 'ADMIN',
    });
    expect(authUsersRepository.updateById).not.toHaveBeenCalled();
  });

  it('updates an existing profile without accepting the token role', async () => {
    const existingUser = createUserRecord({ role: 'USER' });
    authUsersRepository.findByGoogleId.mockResolvedValue(existingUser);

    const authenticatedUser = await validate({
      sub: 'nextauth-user-id',
      email: existingUser.email,
      name: 'Renamed User',
      googleId: existingUser.googleId,
      role: 'ADMIN',
    });

    expect(authUsersRepository.updateById).toHaveBeenCalledWith(
      existingUser.id,
      { name: 'Renamed User' },
    );
    expect(authenticatedUser.role).toBe('USER');
  });

  it('continues to provision a missing user for a first sign-in', async () => {
    const createdUser = createUserRecord({ role: 'ADMIN' });
    authUsersRepository.findByGoogleId.mockResolvedValue(null);
    authUsersRepository.create.mockResolvedValue(createdUser);

    const authenticatedUser = await validate({
      sub: 'nextauth-user-id',
      email: createdUser.email,
      name: createdUser.name,
      googleId: createdUser.googleId,
      role: 'ADMIN',
    });

    expect(authUsersRepository.create).toHaveBeenCalledWith({
      googleId: createdUser.googleId,
      email: createdUser.email,
      name: createdUser.name,
      role: 'ADMIN',
      image: undefined,
    });
    expect(authenticatedUser.role).toBe('ADMIN');
  });

  it('rejects a token missing its required identity claims', async () => {
    await expect(validate({ sub: 'nextauth-user-id' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
