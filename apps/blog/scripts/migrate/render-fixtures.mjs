// 이관 전 렌더러(apps/blog-web의 MDXRenderer, next-mdx-remote compileMDX)로 덤프 본문을 렌더해 회귀 고정 자료를 만든다.
// 운영 HTTP는 쓰지 않는다(조회수 증가 방지). 입력: .migration/dump.json, 출력: test/fixtures/posts/{slug}.{mdx,html}
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../..');
const web = path.resolve(app, '../blog-web');
const outDir = path.join(app, 'test/fixtures/posts');
const bundle = path.join(app, '.migration/old-renderer.mjs');

const entry = `
import { renderToStaticMarkup } from 'react-dom/server';
import { MDXRenderer } from '@/components/mdx-renderer';
export async function render(content) { return renderToStaticMarkup(await MDXRenderer({ content })); }
`;

// next/image·next/link는 Next 런타임이 필요해 같은 속성의 img·a로 바꾼다(본문 구조 비교용).
const nextStubs = {
  name: 'next-stubs',
  setup(b) {
    b.onResolve({ filter: /^next\/(image|link)$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({
      contents: a.path === 'next/image'
        ? `import { createElement } from 'react'; export default function Image({ src, alt, width, height, sizes }) { return createElement('img', { src, alt, width, height, sizes }); }`
        : `import { createElement } from 'react'; export default function Link({ href, children, ...rest }) { return createElement('a', { href, ...rest }, children); }`,
      loader: 'js',
      resolveDir: web,
    }));
  },
};

await build({
  stdin: { contents: entry, resolveDir: web, loader: 'jsx' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  outfile: bundle,
  alias: { '@': web },
  plugins: [nextStubs],
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'error',
});

const { render } = await import(pathToFileURL(bundle).href);
const dump = JSON.parse(readFileSync(path.join(app, '.migration/dump.json'), 'utf8'));
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const published = dump.posts.filter((p) => p.published === 1);
for (const post of published) {
  writeFileSync(path.join(outDir, `${post.slug}.mdx`), post.content);
  writeFileSync(path.join(outDir, `${post.slug}.html`), await render(post.content));
}
console.log(`고정 자료 ${published.length}편`);
