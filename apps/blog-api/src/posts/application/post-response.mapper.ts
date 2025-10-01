import { PostAggregate } from '../domain/post.model';
import { PostResponseDto } from '../dto/post-response.dto';

export function mapToPostResponse(post: PostAggregate): PostResponseDto {
  const category = post.category;
  const author = post.author;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt ?? undefined,
    coverImage: post.coverImage ?? undefined,
    published: post.published,
    viewCount: post.viewCount,
    categoryId: post.categoryId,
    authorId: post.authorId,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt ?? undefined,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      postCount: category.postCount ?? 0,
      createdAt: category.createdAt ?? post.createdAt,
      updatedAt: category.updatedAt ?? post.updatedAt,
    },
    author: {
      id: author.id,
      name: author.name,
      image: author.image ?? undefined,
    },
    tags: post.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag.postCount ?? 0,
      createdAt: tag.createdAt ?? post.createdAt,
      updatedAt: tag.updatedAt ?? post.updatedAt,
    })),
  } as PostResponseDto;
}
