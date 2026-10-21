import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "plain";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const tone = variant === "primary" ? "border border-ink bg-ink text-paper" : "border border-line bg-paper text-ink";
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[13px] font-medium transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 ${tone} ${className}`}
      {...props}
    />
  );
}
