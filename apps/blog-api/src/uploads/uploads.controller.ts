import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiExtraModels, ApiTags } from '@nestjs/swagger';

import { ApiAdminCreate } from '../common/decorators/api-responses.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  PreSignedUploadRequestDto,
  PreSignedUploadResponseDto,
} from './dto';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiExtraModels(PreSignedUploadResponseDto)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('pre-signed')
  @UseGuards(AdminGuard)
  @ApiAdminCreate(
    PreSignedUploadResponseDto,
    'MinIO에 파일 업로드를 위한 pre-signed URL 발급',
  )
  async createPreSignedUpload(
    @Body() dto: PreSignedUploadRequestDto,
  ): Promise<PreSignedUploadResponseDto> {
    return this.uploadsService.createPreSignedUrl(dto);
  }
}
