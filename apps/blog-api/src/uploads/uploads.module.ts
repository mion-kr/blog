import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { S3_CLIENT_TOKEN } from './uploads.constants';
import { UploadPolicyService } from './application/upload-policy.service';
import { ContentImageFinalizer } from './application/content-image-finalizer';
import { ObjectStorageService } from './storage/object-storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [
    ObjectStorageService,
    UploadPolicyService,
    ContentImageFinalizer,
    UploadsService,
    {
      provide: S3_CLIENT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('S3_ENDPOINT');
        const region = configService.get<string>('S3_REGION');
        const accessKey = configService.get<string>('S3_ACCESS_KEY_ID');
        const secretKey = configService.get<string>('S3_SECRET_ACCESS_KEY');

        if (!endpoint || !region || !accessKey || !secretKey) {
          throw new Error(
            '오브젝트 스토리지 설정이 누락되었습니다. S3_ENDPOINT/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY를 확인해주세요.',
          );
        }

        return new S3Client({
          region,
          endpoint,
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
