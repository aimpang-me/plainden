import type { ReactNode } from "react";

export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-balance font-serif text-[28px] font-normal leading-tight tracking-[-0.01em] max-[900px]:text-[24px]">
      {children}
    </h1>
  );
}
