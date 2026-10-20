import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <section className="rounded-3xl border border-line-soft bg-paper p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_40px_rgba(0,0,0,0.04)] max-[800px]:p-6">
      {title ? <h2 className="mb-6 text-[28px] font-medium tracking-[-0.02em]">{title}</h2> : null}
      {children}
    </section>
  );
}
