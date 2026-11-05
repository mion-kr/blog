import { describe, expect, it } from 'vitest';
import { renderPostHtml } from '../src/lib/render/render-post';

const r = (s: string) => renderPostHtml(s);

describe('renderPostHtml', () => {
  it('전체를 div.mdx-content로 감싼다', async () => {
    expect(await r('안녕')).toBe('<div class="mdx-content"><p>안녕</p></div>');
  });

  it('빈 본문(공백만)은 안내 문구', async () => {
    const html = await r('  \n ');
    expect(html).toContain('class="callout callout--info" role="note"');
    expect(html).toContain('<p>표시할 콘텐츠가 없습니다.</p>');
  });

  it('GFM 표는 div.table-box로 감싼다', async () => {
    expect(await r('| a | b |\n| - | - |\n| 1 | 2 |')).toMatch(/<div class="table-box"><table>[\s\S]*<td>1<\/td>[\s\S]*<\/table><\/div>/);
  });

  it('언어가 있는 코드 블록: .code > .code-bar(대문자 언어 + Copy) + pre > code.language-*', async () => {
    const html = await r('```ts\nconst a = 1;\n```');
    expect(html).toContain('<div class="code"><div class="code-bar"><span>TS</span><button class="btn" type="button">Copy</button></div><pre><code class="language-ts">const a = 1;\n</code></pre></div>');
  });

  it('언어가 없는 코드 블록은 pre 없이 code만(이관 전과 같음)', async () => {
    expect(await r('```\nplain\n```')).toBe('<div class="mdx-content"><code>plain\n</code></div>');
  });

  it('인라인 코드는 code', async () => {
    expect(await r('a `b` c')).toContain('<p>a <code>b</code> c</p>');
  });

  // 원문 줄 앞 공백은 이관 전처럼 mdast→hast 변환에서 지워진다(이관 전 Copy 버튼도 같은 값).
  it('mermaid는 figure.diagram에 원문을 숨겨 담고 Copy 버튼을 둔다', async () => {
    const html = await r('```mermaid\nflowchart LR\n  A --> B\n```');
    expect(html).toContain('<figure data-mermaid-chart class="diagram">');
    expect(html).toContain('<pre hidden data-mermaid-source>flowchart LR\nA --> B</pre>');
    expect(html).toContain('<div class="diagram-bar"><button type="button" class="btn">Copy</button></div>');
  });

  it('XEmbed 정상 주소: figure[data-x-embed]와 원문 링크', async () => {
    const html = await r('<XEmbed url="https://x.com/a/status/20?s=1" />');
    expect(html).toContain('<figure class="not-prose my-8 w-full min-w-0" data-x-embed="20">');
    expect(html).toContain('<a href="https://x.com/i/web/status/20" target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('X에서 원문 보기');
  });

  it('XEmbed 잘못된 주소: 안내 문구', async () => {
    expect(await r('<XEmbed url="https://evil.test/a/status/1" />')).toContain('<p role="status">올바른 X 게시물 주소가 아닙니다.</p>');
  });

  it('이미지: span.body-figure > img(lazy) + alt 캡션, src 없으면 안내', async () => {
    const html = await r('![고양이](https://media.mion-space.dev/a.webp)');
    expect(html).toContain('<span class="body-figure"><img src="https://media.mion-space.dev/a.webp" alt="고양이" width="800" height="400" loading="lazy"><span class="caption">고양이</span></span>');
    expect(await r('<Image alt="x" />')).toContain('<span class="body-figure"><span class="caption">이미지를 로드할 수 없습니다</span></span>');
  });

  it('소문자 HTML 태그는 같은 요소로, 문자열 속성만 옮기고 on* 속성은 버린다', async () => {
    const html = await r('<details open className="x" onClick="alert(1)" data-k={1}>\n\n내용\n\n</details>');
    expect(html).toContain('<details open class="x">');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('data-k');
  });

  it('h1은 h2로 낮추고 제목에는 scroll-mt-16', async () => {
    expect(await r('# 하나\n\n### 셋')).toBe('<div class="mdx-content"><h2 class="scroll-mt-16">하나</h2>\n<h3 class="scroll-mt-16">셋</h3></div>');
  });

  it('외부 링크(http·//)는 새 탭 + 아이콘, 내부·앵커 링크는 그대로', async () => {
    const ext = await r('[a](https://e.com) [b](//e.com)');
    expect(ext.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(ext).toContain('lucide-external-link ml-1 h-3 w-3');
    expect(await r('[c](/posts/x) [d](#h)')).toContain('<a href="/posts/x">c</a> <a href="#h">d</a>');
  });

  it('AlertBox는 callout', async () => {
    expect(await r('<AlertBox type="warning">주의</AlertBox>')).toContain('<div class="callout callout--warning" role="note">');
  });

  it('맵에 없는 대문자 JSX, JS 표현식, import는 오류 안내 박스', async () => {
    for (const src of ['<Unknown />', '값 {1 + 1}', "import x from 'y'\n\n본문"]) {
      const html = await r(src);
      expect(html, src).toContain('class="callout callout--error" role="alert"');
      expect(html).toContain('콘텐츠를 렌더링하는 중 오류가 발생했습니다.');
    }
  });

  it('MDX 문법 오류도 오류 안내 박스', async () => {
    expect(await r('<div>닫히지 않음')).toContain('callout callout--error');
  });
});
