"use client";

import { Check, Copy } from "lucide-react";
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

        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
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
    <figure className="my-8 flex flex-col items-center gap-3">
      <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-white p-4">
        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div
            ref={chartRef}
            data-loading={isLoading}
            className={cn(
              "flex justify-center",
              isLoading ? "animate-pulse opacity-70" : "",
            )}
          />
        )}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-2 py-0.5 text-[9px] text-slate-200 transition hover:bg-slate-700"
        style={{ fontSize: 9, lineHeight: "1" }}
      >
        {copied ? (
          <>
            <Check className="h-2.5 w-2.5" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-2.5 w-2.5" /> Copy
          </>
        )}
      </button>
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
      <div className="relative my-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-5 py-2">
          <span className="text-[9px] font-medium tracking-widest text-gray-600">
            {language.toUpperCase()}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-gray-600 hover:bg-gray-200"
            type="button"
            style={{ fontSize: 9, lineHeight: "1" }}
          >
            {copied ? (
              <>
                <Check className="h-2.5 w-2.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-2.5 w-2.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="overflow-x-auto p-4">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code
      className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-red-600"
      {...props}
    >
      {children}
    </code>
  );
}
