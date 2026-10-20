import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "plain";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const tone = variant === "primary" ? "bg-ink text-paper" : "bg-fill text-ink";
  return (
    <button
      className={`inline-flex h-12 items-center justify-center rounded-full border-0 px-[18px] text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 ${tone} ${className}`}
      {...props}
    />
  );
}
