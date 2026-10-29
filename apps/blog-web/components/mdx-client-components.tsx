"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

function extractMermaidDefinition(children: React.ReactNode): string {
  if (!children) {
    return "";
  }

  if (typeof children === "string") {
    return children.trim();
  }

  if (Array.isArray(children)) {
    return children
      .map((child) => extractMermaidDefinition(child))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (typeof children === "object") {
    if (
      "value" in children &&
      typeof (children as { value?: unknown }).value === "string"
    ) {
      return ((children as { value: string }).value || "").trim();
    }

    if ("props" in children) {
      // @ts-expect-error - best effort extraction from nested nodes
      return extractMermaidDefinition(children.props?.children ?? "");
    }
  }

  return "";
}

// Editorial 토큰(oklch)의 hex 값입니다. Mermaid 색 해석기는 oklch를 읽지 못합니다.
const MERMAID_THEME_VARIABLES = {
  fontSize: "15px",
  primaryColor: "#f6f4ef",
  primaryBorderColor: "#2a2833",
  primaryTextColor: "#1d1b24",
  lineColor: "#2a2833",
  clusterBkg: "transparent",
  clusterBorder: "#5f5b55",
  edgeLabelBackground: "#efece5",
  tertiaryColor: "#efece5",
};

type MermaidModule =
  Awaited<typeof import("mermaid")> extends {
    default: infer T;
  }
    ? T
    : Awaited<typeof import("mermaid")>;

let mermaidModule: MermaidModule | null = null;
let mermaidModulePromise: Promise<MermaidModule> | null = null;

async function loadMermaid(): Promise<MermaidModule> {
  if (mermaidModule) {
    return mermaidModule;
  }

  if (!mermaidModulePromise) {
    mermaidModulePromise = import("mermaid").then((mod) => {
      const instance =
        (mod as Partial<{ default: MermaidModule }>).default ??
        (mod as unknown as MermaidModule);
      mermaidModule = instance;
      return instance;
    });
  }

  return mermaidModulePromise;
}

export function MermaidChart({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const definition = useMemo(
    () => extractMermaidDefinition(children),
    [children],
  );
  const chartId = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  useEffect(() => {
    if (!definition) {
      if (chartRef.current) {
        chartRef.current.innerHTML = "";
      }
      return;
    }

    let cancelled = false;
    const target = chartRef.current;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const mermaid = await loadMermaid();
        if (cancelled) return;

        // 웹폰트가 늦게 오면 글자 폭을 대체 글꼴로 재서 상자 안 글자가 잘리므로, 본문 글꼴을 먼저 불러온 뒤 그립니다.
        const fontFamily = target
          ? getComputedStyle(target).fontFamily
          : "sans-serif";
        try {
          // Mermaid 라벨은 보통 400, 강조(<b>)는 700으로 그립니다.
          await Promise.all([
            document.fonts.load(`400 15px ${fontFamily}`, "다이어그램"),
            document.fonts.load(`700 15px ${fontFamily}`, "다이어그램"),
          ]);
          await document.fonts.ready;
        } catch {
          // 글꼴 로딩 실패는 대체 글꼴로 그립니다.
        }
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          // 글 안 %%{init}%%의 fontFamily(예: Pretendard)는 로딩하지 않는 글꼴이라 라벨 폭이 어긋나므로 막습니다. 앞 6개는 Mermaid 기본값입니다.
          secure: [
            "secure",
            "securityLevel",
            "startOnLoad",
            "maxTextSize",
            "suppressErrorRendering",
            "maxEdges",
            "fontFamily",
          ],
          flowchart: { curve: "linear", padding: 16 },
          themeVariables: { ...MERMAID_THEME_VARIABLES, fontFamily },
        });

        const { svg } = await mermaid.render(chartId, definition);
        if (cancelled) return;

        if (target) {
          target.innerHTML = svg;
        }
      } catch (renderError) {
        console.error("Failed to render Mermaid diagram", renderError);
        if (!cancelled) {
          setError("Mermaid 다이어그램을 렌더링하지 못했어요.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (target) {
        target.innerHTML = "";
      }
    };
  }, [chartId, definition]);

  const handleCopy = async () => {
    if (
      !definition ||
      typeof navigator === "undefined" ||
      !navigator.clipboard
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(definition);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error("Failed to copy Mermaid diagram", copyError);
    }
  };

  if (!definition) {
    return null;
  }

  return (
    <figure data-mermaid-chart className="diagram">
      {error ? (
        <div className="diagram-error">{error}</div>
      ) : (
        <div
          ref={chartRef}
          data-loading={isLoading}
          className={cn(isLoading ? "animate-pulse opacity-70" : "")}
        />
      )}
      <div className="diagram-bar">
        <button type="button" className="btn" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </figure>
  );
}

export function CodeBlock({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = typeof children === "string" ? children : "";

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error("Failed to copy text:", copyError);
    }
  };

  if (className?.includes("language-")) {
    const language = className.replace("language-", "");

    return (
      <div className="code">
        <div className="code-bar">
          <span>{language.toUpperCase()}</span>
          <button className="btn" type="button" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code {...props}>{children}</code>
  );
}
