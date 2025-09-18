import { type ComponentPropsWithoutRef, type JSX, type ReactNode } from "react";

type CardProps = {
  className?: string;
  title: string;
  children: ReactNode;
  href: string;
  appendUtm?: boolean;
} & Omit<ComponentPropsWithoutRef<"a">, "children" | "href">;

const UTM_QUERY =
  "utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo";

export function Card({
  className,
  title,
  children,
  href,
  target = "_blank",
  rel,
  appendUtm = true,
  ...anchorProps
}: CardProps): JSX.Element {
  const computedHref = appendUtm
    ? `${href}${href.includes("?") ? "&" : "?"}${UTM_QUERY}`
    : href;

  const computedRel = rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);

  return (
    <a
      className={className}
      href={computedHref}
      target={target}
      rel={computedRel}
      {...anchorProps}
    >
      <h2>
        {title} <span>-&gt;</span>
      </h2>
      <p>{children}</p>
    </a>
  );
}
