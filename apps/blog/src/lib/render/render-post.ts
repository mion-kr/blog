// 글 본문(MDX 문자열)을 JS 실행 없이 HTML로 바꾼다(design.md D2). 이관 전 MDXRenderer와 같은 마크업을 낸다.
import type { Element, ElementContent, Properties, Root as HastRoot, Text } from 'hast';
import type { Code, Root as MdastRoot, RootContent } from 'mdast';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';
import { icons } from './icons';
import { parseXPostUrl } from './x-post-url';

type JsxNode = { type: 'mdxJsxFlowElement' | 'mdxJsxTextElement'; name: string | null; attributes: Array<{ type: string; name?: string; value?: unknown }>; children: RootContent[] };
type State = { all: (node: unknown) => ElementContent[] };

class RenderError extends Error {}

const h = (tagName: string, properties: Properties = {}, children: ElementContent[] = []): Element => ({ type: 'element', tagName, properties, children });
const t = (value: string): Text => ({ type: 'text', value });

const callout = (type: 'info' | 'warning' | 'error' | 'success', role: string, children: ElementContent[]) =>
  h('div', { className: `callout callout--${type}`, role }, [icons[type](), ...children]);

const EMPTY = callout('info', 'note', [h('p', {}, [t('표시할 콘텐츠가 없습니다.')])]);
const FAILED = callout('error', 'alert', [h('div', {}, [h('strong', {}, [t('콘텐츠 로딩 오류')]), h('p', {}, [t('콘텐츠를 렌더링하는 중 오류가 발생했습니다.')])])]);

// 이관 전 remarkMermaid와 같다: ```mermaid 코드 블록을 MermaidChart JSX로 바꾼다.
function remarkMermaid() {
  return (tree: MdastRoot) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || index === undefined || node.lang?.toLowerCase() !== 'mermaid') return;
      parent.children[index] = { type: 'mdxJsxFlowElement', name: 'MermaidChart', attributes: [], children: [{ type: 'text', value: node.value || '' }] } as never;
      return SKIP;
    });
  };
}

function stringAttributes(node: JsxNode): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (const a of node.attributes) {
    if (a.type !== 'mdxJsxAttribute' || !a.name) continue;
    if (a.value === null || a.value === undefined) out[a.name] = true;
    else if (typeof a.value === 'string') out[a.name] = a.value;
    // {…} 표현식 속성은 실행하지 않고 버린다.
  }
  return out;
}

function textOf(nodes: ElementContent[]): string {
  return nodes.map((n) => (n.type === 'text' ? n.value : n.type === 'element' ? textOf(n.children) : '')).join('');
}

function figureImage(src: unknown, alt: unknown): Element {
  if (typeof src !== 'string' || !src) return h('span', { className: 'body-figure' }, [h('span', { className: 'caption' }, [t('이미지를 로드할 수 없습니다')])]);
  const altText = typeof alt === 'string' ? alt : '';
  const children: ElementContent[] = [h('img', { src, alt: altText, width: '800', height: '400', loading: 'lazy' })];
  if (altText) children.push(h('span', { className: 'caption' }, [t(altText)]));
  return h('span', { className: 'body-figure' }, children);
}

function link(href: unknown, children: ElementContent[]): Element {
  if (typeof href !== 'string' || !href) return h('span', {}, children);
  if (href.startsWith('http') || href.startsWith('//')) {
    return h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, [...children, icons.external()]);
  }
  return h('a', { href }, children);
}

function xEmbed(url: unknown): Element {
  const post = typeof url === 'string' ? parseXPostUrl(url) : null;
  if (!post) return h('p', { role: 'status' }, [t('올바른 X 게시물 주소가 아닙니다.')]);
  return h('figure', { className: 'not-prose my-8 w-full min-w-0', dataXEmbed: post.id }, [
    h('div', { className: 'w-full overflow-x-auto' }),
    h('figcaption', { className: 'mt-2 text-center text-sm' }, [
      h('span', { role: 'status' }, [t('X 게시물을 불러오는 중입니다. ')]),
      h('a', { href: post.href, target: '_blank', rel: 'noopener noreferrer', className: 'text-[var(--color-text-primary)] underline underline-offset-4 hover:decoration-2' }, [t('X에서 원문 보기')]),
    ]),
  ]);
}

function mermaid(children: ElementContent[]): Element | null {
  const definition = textOf(children).trim();
  if (!definition) return null;
  return h('figure', { dataMermaidChart: true, className: 'diagram' }, [
    h('pre', { hidden: true, dataMermaidSource: true }, [t(definition)]),
    h('div'),
    h('div', { className: 'diagram-bar' }, [h('button', { type: 'button', className: 'btn' }, [t('Copy')])]),
  ]);
}

function jsx(state: State, node: JsxNode): ElementContent | ElementContent[] {
  const children = state.all(node);
  const name = node.name;
  if (!name) return children; // <>…</>
  const attrs = stringAttributes(node);
  switch (name) {
    case 'XEmbed': return xEmbed(attrs.url);
    case 'MermaidChart': return mermaid(children) ?? [];
    case 'Image': return figureImage(attrs.src, attrs.alt);
    case 'Link': return link(attrs.href, children);
    case 'AlertBox': {
      const type = (['info', 'warning', 'error', 'success'] as const).find((v) => v === attrs.type) ?? 'info';
      return callout(type, 'note', [h('div', {}, children)]);
    }
  }
  if (/^[A-Z]/.test(name) || name.includes('.')) throw new RenderError(`알 수 없는 컴포넌트 ${name}`);
  const properties: Properties = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (/^on/i.test(key)) continue;
    properties[key === 'className' ? 'className' : key === 'htmlFor' ? 'htmlFor' : key] = value;
  }
  return h(name, properties, children);
}

function unsupported(): never {
  throw new RenderError('JS 표현식·import는 실행하지 않는다');
}

// 이관 전 컴포넌트 맵(h1→h2, 제목 scroll-mt-16, 표 감싸기, 이미지, 링크, 코드 블록)을 HTML 트리에 적용한다.
function rehypeComponents() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      const replace = (next: ElementContent | ElementContent[]) => {
        const list = Array.isArray(next) ? next : [next];
        parent.children.splice(index, 1, ...(list as never[]));
        return [SKIP, index + list.length] as const;
      };
      if (/^h[1-6]$/.test(node.tagName)) {
        node.tagName = node.tagName === 'h1' ? 'h2' : node.tagName;
        node.properties = { ...node.properties, className: ['scroll-mt-16'] };
        return;
      }
      if (node.tagName === 'table' && !(parent.type === 'element' && parent.properties?.className?.toString() === 'table-box')) {
        return replace(h('div', { className: 'table-box' }, [node]));
      }
      if (node.tagName === 'img' && node.properties?.loading !== 'lazy') return replace(figureImage(node.properties?.src, node.properties?.alt));
      if (node.tagName === 'a' && node.properties?.target === undefined && !node.data) {
        const next = link(node.properties?.href, node.children);
        next.data = { done: true } as never;
        return replace(next);
      }
      if (node.tagName === 'pre' && node.properties?.dataMermaidSource === undefined) {
        const code = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
        const cls = (code?.properties?.className as string[] | undefined)?.find((c) => c.startsWith('language-'));
        if (!code || !cls) return replace(code ? [code] : node.children);
        const language = cls.replace('language-', '');
        return replace(h('div', { className: 'code' }, [
          h('div', { className: 'code-bar' }, [h('span', {}, [t(language.toUpperCase())]), h('button', { className: 'btn', type: 'button' }, [t('Copy')])]),
          h('pre', { dataDone: true }, [code]),
        ]));
      }
      return;
    });
    visit(tree, 'element', (node: Element) => {
      if (node.data) delete node.data;
      if (node.properties?.dataDone) delete node.properties.dataDone;
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkGfm)
  .use(remarkMermaid)
  .use(remarkRehype, {
    handlers: {
      mdxJsxFlowElement: jsx as never,
      mdxJsxTextElement: jsx as never,
      mdxFlowExpression: unsupported,
      mdxTextExpression: unsupported,
      mdxjsEsm: unsupported,
    },
  })
  .use(rehypeComponents)
  .use(rehypeStringify);

export async function renderPostHtml(content: string): Promise<string> {
  const wrap = (inner: string) => `<div class="mdx-content">${inner}</div>`;
  if (!content.trim()) return processor.stringify({ type: 'root', children: [EMPTY] } as never);
  try {
    const tree = await processor.run(processor.parse(content));
    return wrap(processor.stringify(tree as never));
  } catch (error) {
    console.error('MDX render error', error instanceof RenderError ? error.message : 'parse');
    return processor.stringify({ type: 'root', children: [FAILED] } as never);
  }
}
