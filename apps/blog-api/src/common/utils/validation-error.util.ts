import { ValidationError } from 'class-validator';
import type { ValidationError as ApiValidationError } from '@repo/shared';

/**
 * class-validator ValidationError 배열을 프론트에서 사용하기 쉬운 구조로 변환합니다.
 */
export function formatValidationErrors(
  validationErrors: ValidationError[],
): ApiValidationError[] {
  const formatted: ApiValidationError[] = [];

  const traverse = (error: ValidationError, parentPath?: string) => {
    const fieldPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      Object.values(error.constraints)
        .filter(
          (message): message is string =>
            typeof message === 'string' && message.length > 0,
        )
        .forEach((message) => {
          formatted.push({
            field: fieldPath,
            message,
            value: error.value,
          });
        });
    }

    if (error.children && error.children.length > 0) {
      error.children.forEach((child) => traverse(child, fieldPath));
    }
  };

  validationErrors.forEach((error) => traverse(error));

  return formatted;
}
