import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <section className="surface overflow-hidden">
      {title ? <h2 className="panel-title">{title}</h2> : null}
      {children}
    </section>
  );
}
