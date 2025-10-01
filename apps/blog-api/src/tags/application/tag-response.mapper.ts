import { TagEntity } from '../domain/tag.model';
import { TagResponseDto } from '../dto/tag-response.dto';

export function mapToTagResponse(tag: TagEntity): TagResponseDto {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    postCount: tag.postCount,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  } as TagResponseDto;
}
