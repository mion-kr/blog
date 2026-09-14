import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const webRequire = createRequire(resolve('apps/blog-web/package.json'));
const { compileMDX } = await import(pathToFileURL(webRequire.resolve('next-mdx-remote/rsc')));
const { default: remarkGfm } = await import(pathToFileURL(webRequire.resolve('remark-gfm')));
const directory = resolve('docs/content/2026-09-14/experience');
const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
let diagrams = 0;
for (const post of manifest.posts) {
  const source = await readFile(resolve(directory, post.revisedFile), 'utf8');
  await compileMDX({ source, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
  const blocks = [...source.matchAll(/```mermaid\n([\s\S]*?)```/g)];
  diagrams += blocks.length;
  console.log(`${post.key}: MDX 통과, 도표 ${blocks.length}개 블록 확인`);
}
console.log(`전체: MDX ${manifest.posts.length}개, Mermaid 블록 ${diagrams}개 (구문 검증 별도)`);
