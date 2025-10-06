import type { CreatePostDto, UpdatePostDto } from '@repo/shared';

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (value === null) return false;
  const truthy = ['true', 'on', '1', 'yes'];
  return truthy.includes(String(value).toLowerCase());
}

function parseString(
  value: FormDataEntryValue | null | undefined,
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseStringRequired(
  value: FormDataEntryValue | null | undefined,
  field: string,
): string {
  const parsed = parseString(value);
  if (!parsed) {
    throw new Error(`${field} 값이 필요합니다.`);
  }
  return parsed;
}

export function parseCreatePostForm(formData: FormData): CreatePostDto {
  return {
    title: parseStringRequired(formData.get('title'), 'title'),
    content: String(formData.get('content') ?? ''),
    excerpt: parseString(formData.get('excerpt')),
    coverImage: parseString(formData.get('coverImage')),
    published: parseBoolean(formData.get('published')),
    categoryId: parseStringRequired(formData.get('categoryId'), 'categoryId'),
    tagIds: formData
      .getAll('tagIds')
      .map((value) => String(value))
      .filter((value) => value.length > 0),
  };
}

export function parseUpdatePostForm(formData: FormData): {
  slug: string;
  payload: UpdatePostDto;
} {
  const slug = parseStringRequired(formData.get('slug'), 'slug');

  const payload: UpdatePostDto = {
    title: parseString(formData.get('title')),
    content: parseString(formData.get('content')),
    excerpt: parseString(formData.get('excerpt')),
    coverImage: parseString(formData.get('coverImage')),
    published: parseBoolean(formData.get('published')),
    categoryId: parseString(formData.get('categoryId')),
    tagIds: formData
      .getAll('tagIds')
      .map((value) => String(value))
      .filter((value) => value.length > 0),
  };

  return { slug, payload };
}

export function parseDeletePostForm(formData: FormData): string {
  return parseStringRequired(formData.get('slug'), 'slug');
}
