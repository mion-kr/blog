import { Body, Controller, Post } from '@nestjs/common';

import { ApiAdminAction } from '../common/decorators/api-responses.decorator';
import {
  PreSignedUploadRequestDto,
  PreSignedUploadResponseDto,
} from './dto';
import { UploadsService } from './uploads.service';
import { ApiAdminController } from '../common/decorators';

@ApiAdminController('uploads', PreSignedUploadResponseDto)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('pre-signed')
  @ApiAdminAction(
    PreSignedUploadResponseDto,
    'MinIO에 파일 업로드를 위한 pre-signed URL 발급',
    'ADMIN 권한으로 업로드용 pre-signed URL을 발급합니다.',
    'pre-signed URL이 발급되었습니다.',
    201,
  )
  async createPreSignedUpload(
    @Body() dto: PreSignedUploadRequestDto,
  ): Promise<PreSignedUploadResponseDto> {
    return this.uploadsService.createPreSignedUrl(dto);
  }
}
