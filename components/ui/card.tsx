import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <section className="surface overflow-hidden">
      {title ? <h2 className="border-b border-line px-4 py-3 text-[13px] font-medium">{title}</h2> : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
