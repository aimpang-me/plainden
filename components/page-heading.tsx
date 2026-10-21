import type { ReactNode } from "react";

export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="title text-balance text-[30px] leading-tight max-[900px]:text-[26px]">
      {children}
    </h1>
  );
}
