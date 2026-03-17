import { applyDecorators, Type, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/guards/admin.guard';

/**
 * 공개 전용 컨트롤러의 Swagger 메타데이터를 고정합니다.
 */
export function ApiPublicController(
  tag: string,
  ...models: Array<Type<unknown>>
) {
  const decorators = [ApiTags(tag)];

  // 모델이 있을 때만 Swagger schema registry에 등록합니다.
  if (models.length > 0) {
    decorators.push(ApiExtraModels(...models));
  }

  return applyDecorators(...decorators);
}

/**
 * 공개/관리자 엔드포인트가 함께 있는 feature 컨트롤러 메타데이터를 고정합니다.
 */
export function ApiFeatureController(
  tag: string,
  ...models: Array<Type<unknown>>
) {
  const decorators = [ApiTags(tag), ApiBearerAuth()];

  // 공개/관리자 엔드포인트가 같은 컨트롤러에 섞여 있을 때 공통 모델을 등록합니다.
  if (models.length > 0) {
    decorators.push(ApiExtraModels(...models));
  }

  return applyDecorators(...decorators);
}

/**
 * ADMIN 전용 컨트롤러의 인증/인가와 Swagger 메타데이터를 고정합니다.
 */
export function ApiAdminController(
  tag: string,
  ...models: Array<Type<unknown>>
) {
  const decorators = [ApiTags(tag), ApiBearerAuth(), UseGuards(AdminGuard)];

  // ADMIN 전용 컨트롤러에서 사용하는 응답 모델을 공통 등록합니다.
  if (models.length > 0) {
    decorators.push(ApiExtraModels(...models));
  }

  return applyDecorators(...decorators);
}
