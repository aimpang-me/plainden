import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-line bg-paper shadow-[0_1px_2px_rgba(40,30,10,0.05),0_4px_14px_rgba(40,30,10,0.05)]">
      {title ? <h2 className="border-b border-line px-4 py-3 text-[13px] font-medium">{title}</h2> : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
