import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <section className="border border-line p-4">
      {title ? <h2 className="mb-3 text-lg">{title}</h2> : null}
      {children}
    </section>
  );
}
