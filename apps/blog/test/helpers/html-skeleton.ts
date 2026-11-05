import { fromHtml } from 'hast-util-from-html';
import { toText } from 'hast-util-to-text';
import { selectAll } from 'hast-util-select';
import { remove } from 'unist-util-remove';
import type { Element, Root } from 'hast';

// 렌더 결과에서 비교할 구조를 뽑는다. mermaid 원문(새 렌더러만 담음)과 svg 아이콘은 비교에서 뺀다.
export function skeleton(html: string) {
  const tree = fromHtml(html, { fragment: true }) as Root;
  remove(tree, (n) => (n as Element).type === 'element' && ((n as Element).tagName === 'svg' || (n as Element).properties?.dataMermaidSource !== undefined));
  const count = (sel: string) => selectAll(sel, tree).length;
  return {
    counts: {
      headings: count('h2, h3, h4, h5, h6'),
      codeBlocks: count('div.code'),
      bareCode: count('div.mdx-content > code'),
      mermaid: count('figure[data-mermaid-chart]'),
      tables: count('div.table-box > table'),
      xEmbeds: count('figure[data-x-embed]'),
      images: count('span.body-figure'),
      lists: count('ul, ol'),
      blockquotes: count('blockquote'),
    },
    headings: selectAll('h2, h3, h4, h5, h6', tree).map((h) => `${h.tagName}:${toText(h)}`),
    links: selectAll('a', tree).map((a) => `${String(a.properties.href)}|${String(a.properties.target ?? '')}`),
    text: toText(tree).replace(/\s+/g, ' ').trim(),
  };
}
