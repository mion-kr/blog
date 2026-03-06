import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DrizzleAuthUsersRepository } from './repositories/drizzle-auth-users.repository';
import { AUTH_USERS_REPOSITORY } from './repositories/auth-users.repository';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    JwtStrategy,
    DrizzleAuthUsersRepository,
    {
      provide: AUTH_USERS_REPOSITORY,
      useExisting: DrizzleAuthUsersRepository,
    },
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
