import type { ReactNode } from "react";

import styles from "./legal-document.module.css";

interface LegalDocumentProps {
  children: ReactNode;
  intro: ReactNode;
  title: string;
}

export function LegalDocument({ children, intro, title }: LegalDocumentProps) {
  return (
    <article className={styles.document}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Legal</p>
        <h1>{title}</h1>
        <p className={styles.intro}>{intro}</p>
      </header>

      <div className={styles.content}>{children}</div>
    </article>
  );
}
