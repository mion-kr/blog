// 이관 전 slug 함수(packages/shared, 빌드 필요)로 기대값을 만든다. 입력: .migration/dump.json
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateSlug, generateEnglishSlug } = require('../../../../packages/shared/dist/utils/index.js');
const dump = JSON.parse(readFileSync('.migration/dump.json', 'utf8'));
const inputs = [
  ...dump.posts.map((p) => p.title),
  ...dump.categories.map((c) => c.name),
  ...dump.tags.map((t) => t.name),
  '!!!', '🎉', '개발 블로그 회고', 'Hello, World! 2026', '  공백  앞뒤  ', 'under_score 와 하이픈-', 'Nest.js', 'C++ & C#',
];
const cases = inputs.map((input) => ({ input, slug: generateSlug(input), english: generateEnglishSlug(input) }));
writeFileSync('test/fixtures/slugs.json', JSON.stringify(cases, null, 1) + '\n');
console.log(`slug 기대값 ${cases.length}개`);
