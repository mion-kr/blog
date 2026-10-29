import type { ReactNode } from "react";

import styles from "./legal-document.module.css";

interface LegalDocumentProps {
  children: ReactNode;
  intro: ReactNode;
  title: string;
}

export function LegalDocument({ children, intro, title }: LegalDocumentProps) {
  return (
    <main id="main" className={styles.document}>
      <header className="page-head">
        <div className="container">
          <p className="meta">Legal</p>
          <h1>{title}</h1>
          <p className="lead">{intro}</p>
        </div>
      </header>

      <div className="container">
        <div className={styles.content}>{children}</div>
      </div>
    </main>
  );
}
