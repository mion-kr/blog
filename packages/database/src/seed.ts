import { uuidv7 } from "uuidv7";
import { db } from "./connection";
import { categories, posts, postTags, tags, users } from "./schemas/index";

async function seed() {
  console.log("🌱 데이터베이스 시드 데이터 생성 시작...");

  // 1. 사용자 생성 (Mion 관리자)
  const adminUser = await db
    .insert(users)
    .values({
      id: uuidv7(),
      email: "admin@mion.blog",
      name: "Mion",
      googleId: "sample-google-id",
      role: "ADMIN",
    })
    .returning();

  console.log("✅ 관리자 사용자 생성 완료");

  // 2. 카테고리 생성
  const categoryData = [
    { name: "개발", slug: "development" },
    { name: "회고", slug: "retrospective" },
    { name: "튜토리얼", slug: "tutorial" },
  ];

  const insertedCategories = await db
    .insert(categories)
    .values(
      categoryData.map((cat) => ({
        id: uuidv7(),
        name: cat.name,
        slug: cat.slug,
      }))
    )
    .returning();

  console.log("✅ 카테고리 생성 완료");

  // 3. 태그 생성
  const tagData = [
    { name: "TypeScript", slug: "typescript" },
    { name: "Next.js", slug: "nextjs" },
    { name: "Node.js", slug: "nodejs" },
    { name: "개발일기", slug: "dev-diary" },
    { name: "AI", slug: "ai" },
  ];

  const insertedTags = await db
    .insert(tags)
    .values(
      tagData.map((tag) => ({
        id: uuidv7(),
        name: tag.name,
        slug: tag.slug,
      }))
    )
    .returning();

  console.log("✅ 태그 생성 완료");

  // 4. 샘플 포스트 생성
  const samplePosts = await db
    .insert(posts)
    .values([
      {
        id: uuidv7(),
        title: "Mion 블로그 첫 포스트",
        slug: "mion-blog-first-post",
        content: "# 안녕하세요!\n\n이것은 Mion 블로그의 첫 번째 포스트입니다.",
        excerpt: "Mion 블로그의 첫 번째 포스트입니다.",
        published: true,
        categoryId: insertedCategories[0]!.id,
        authorId: adminUser[0]!.id,
        publishedAt: new Date(),
      },
    ])
    .returning();

  console.log("✅ 샘플 포스트 생성 완료");

  // 5. 포스트-태그 관계 생성
  await db.insert(postTags).values([
    {
      postId: samplePosts[0]!.id,
      tagId: insertedTags[0]!.id, // TypeScript
    },
    {
      postId: samplePosts[0]!.id,
      tagId: insertedTags[1]!.id, // Next.js
    },
  ]);

  console.log("✅ 포스트-태그 관계 생성 완료");
  console.log("🎉 시드 데이터 생성이 모두 완료되었습니다!");
}

seed().catch(console.error);
