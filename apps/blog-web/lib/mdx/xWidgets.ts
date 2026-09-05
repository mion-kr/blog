interface XWidgets {
  widgets: {
    createTweet(
      id: string,
      target: HTMLElement,
      options: { align: "center"; dnt: boolean },
    ): Promise<HTMLElement | undefined>;
  };
  ready(callback: (api: XWidgets) => void): void;
}

type XWindow = Window & { twttr?: XWidgets };

// 네트워크 차단 시 무한 로딩을 피하기 위한 대기 상한(밀리초)입니다.
export const X_EMBED_TIMEOUT_MS = 15_000;
let widgetsPromise: Promise<XWidgets> | null = null;

export function loadXWidgets(): Promise<XWidgets> {
  if (widgetsPromise) return widgetsPromise;

  widgetsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://platform.x.com/widgets.js"], script[src="https://platform.twitter.com/widgets.js"], script#twitter-wjs',
    );
    const script = existing ?? document.createElement("script");
    const timeout = window.setTimeout(fail, X_EMBED_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeout);
      script.removeEventListener("load", ready);
      script.removeEventListener("error", fail);
    }

    function fail() {
      cleanup();
      reject(new Error("X 위젯을 불러오지 못했습니다."));
    }

    function ready() {
      const api = (window as XWindow).twttr;
      if (!api?.ready) return;
      api.ready((loaded) => {
        cleanup();
        resolve(loaded);
      });
    }

    script.addEventListener("load", ready);
    script.addEventListener("error", fail);
    ready();

    if (!existing) {
      script.id = "twitter-wjs";
      script.src = "https://platform.x.com/widgets.js";
      script.async = true;
      document.head.append(script);
    }
  });

  return widgetsPromise;
}
