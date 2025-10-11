import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { S3_CLIENT_TOKEN } from './uploads.constants';

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: S3_CLIENT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('MINIO_ENDPOINT');
        const port = configService.get<string>('MINIO_PORT');
        const useSSL =
          (configService.get<string>('MINIO_USE_SSL') ?? 'false').toLowerCase() ===
          'true';
        const accessKey = configService.get<string>('MINIO_USER');
        const secretKey = configService.get<string>('MINIO_PASSWORD');

        if (!endpoint || !accessKey || !secretKey) {
          throw new Error(
            'MinIO 설정이 누락되었습니다. MINIO_ENDPOINT/MINIO_USER/MINIO_PASSWORD를 확인해주세요.',
          );
        }

        const protocol = useSSL ? 'https' : 'http';
        const endpointUrl = port
          ? `${protocol}://${endpoint}:${port}`
          : `${protocol}://${endpoint}`;

        return new S3Client({
          region: 'us-east-1',
          endpoint: endpointUrl,
          forcePathStyle: true,
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
        });
      },
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
