// 글 본문 상호작용: 코드 복사, mermaid 렌더(이관 전 MermaidChart), X 게시물 임베드, 글 주소 복사.
const COPIED_MS = 2000;

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  } catch {
    return false;
  }
}

function flash(button: HTMLButtonElement, ms = COPIED_MS) {
  const label = button.textContent;
  button.textContent = 'Copied';
  setTimeout(() => (button.textContent = label), ms);
}

// 코드 블록 Copy
for (const button of document.querySelectorAll<HTMLButtonElement>('.mdx-content .code-bar button')) {
  button.addEventListener('click', async () => {
    const code = button.closest('.code')?.querySelector('code')?.textContent ?? '';
    if (await copyText(code)) flash(button);
  });
}

// mermaid(이관 전 MermaidChart와 같은 설정)
const MERMAID_THEME_VARIABLES = {
  fontSize: '15px', primaryColor: '#f6f4ef', primaryBorderColor: '#2a2833', primaryTextColor: '#1d1b24', lineColor: '#2a2833',
  clusterBkg: 'transparent', clusterBorder: '#5f5b55', edgeLabelBackground: '#efece5', tertiaryColor: '#efece5',
};
const figures = [...document.querySelectorAll<HTMLElement>('figure[data-mermaid-chart]')];
if (figures.length > 0) {
  void (async () => {
    const mermaid = (await import('mermaid')).default;
    const target0 = figures[0]!.querySelector<HTMLElement>(':scope > div:not(.diagram-bar)');
    const fontFamily = target0 ? getComputedStyle(target0).fontFamily : 'sans-serif';
    try {
      await Promise.all([document.fonts.load(`400 15px ${fontFamily}`, '다이어그램'), document.fonts.load(`700 15px ${fontFamily}`, '다이어그램')]);
      await document.fonts.ready;
    } catch {
      // 글꼴 로딩 실패는 대체 글꼴로 그린다.
    }
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize', 'suppressErrorRendering', 'maxEdges', 'fontFamily'],
      flowchart: { curve: 'linear', padding: 16 },
      themeVariables: { ...MERMAID_THEME_VARIABLES, fontFamily },
    });
    for (const [index, figure] of figures.entries()) {
      const definition = figure.querySelector('[data-mermaid-source]')?.textContent?.trim() ?? '';
      const target = figure.querySelector<HTMLElement>(':scope > div:not(.diagram-bar)');
      if (!definition || !target) continue;
      target.dataset.loading = 'true';
      target.className = 'animate-pulse opacity-70';
      try {
        const { svg } = await mermaid.render(`mermaid-${index}-${Math.random().toString(36).slice(2, 10)}`, definition);
        target.innerHTML = svg;
      } catch (error) {
        console.error('Failed to render Mermaid diagram', error);
        const message = document.createElement('div');
        message.className = 'diagram-error';
        message.textContent = 'Mermaid 다이어그램을 렌더링하지 못했어요.';
        target.replaceWith(message);
      } finally {
        target.dataset.loading = 'false';
        target.className = '';
      }
    }
  })();
}
for (const figure of figures) {
  const button = figure.querySelector<HTMLButtonElement>('.diagram-bar button');
  button?.addEventListener('click', async () => {
    const definition = figure.querySelector('[data-mermaid-source]')?.textContent?.trim() ?? '';
    if (definition && (await copyText(definition))) flash(button);
  });
}

// X 게시물(이관 전 XEmbed·xWidgets)
type XWidgets = { widgets: { createTweet(id: string, target: HTMLElement, options: { align: 'center'; dnt: boolean }): Promise<HTMLElement | undefined> }; ready(cb: (api: XWidgets) => void): void };
const X_EMBED_TIMEOUT_MS = 15_000;
let widgetsPromise: Promise<XWidgets> | null = null;
function loadXWidgets(): Promise<XWidgets> {
  widgetsPromise ??= new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://platform.x.com/widgets.js"], script[src="https://platform.twitter.com/widgets.js"], script#twitter-wjs');
    const script = existing ?? document.createElement('script');
    const timeout = window.setTimeout(fail, X_EMBED_TIMEOUT_MS);
    function cleanup() {
      window.clearTimeout(timeout);
      script.removeEventListener('load', ready);
      script.removeEventListener('error', fail);
    }
    function fail() {
      cleanup();
      reject(new Error('X 위젯을 불러오지 못했습니다.'));
    }
    function ready() {
      const api = (window as Window & { twttr?: XWidgets }).twttr;
      if (!api?.ready) return;
      api.ready((loaded) => {
        cleanup();
        resolve(loaded);
      });
    }
    script.addEventListener('load', ready);
    script.addEventListener('error', fail);
    ready();
    if (!existing) {
      script.id = 'twitter-wjs';
      script.src = 'https://platform.x.com/widgets.js';
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return widgetsPromise;
}
for (const figure of document.querySelectorAll<HTMLElement>('figure[data-x-embed]')) {
  const id = figure.dataset.xEmbed!;
  const container = figure.querySelector<HTMLElement>(':scope > div')!;
  const status = figure.querySelector<HTMLElement>('[role="status"]')!;
  const target = document.createElement('div');
  container.appendChild(target);
  let done = false;
  const setError = () => {
    done = true;
    target.remove();
    status.textContent = 'X 게시물을 표시할 수 없습니다. ';
  };
  const timeout = window.setTimeout(setError, X_EMBED_TIMEOUT_MS);
  loadXWidgets()
    .then((api) => api.widgets.createTweet(id, target, { align: 'center', dnt: true }))
    .then((element) => {
      if (done) return;
      window.clearTimeout(timeout);
      if (element) status.textContent = '';
      else setError();
    })
    .catch(() => {
      if (done) return;
      window.clearTimeout(timeout);
      setError();
    });
}

// 글 주소 복사(이관 전 CopyLinkButton)
const copyLink = document.querySelector<HTMLButtonElement>('[data-copy-link]');
copyLink?.addEventListener('click', async () => {
  if (!(await copyText(window.location.href))) return;
  copyLink.dataset.copied = 'true';
  const live = copyLink.querySelector('[aria-live]');
  if (live) live.textContent = 'Copied';
  setTimeout(() => {
    copyLink.dataset.copied = 'false';
    if (live) live.textContent = '';
  }, 1600);
});
