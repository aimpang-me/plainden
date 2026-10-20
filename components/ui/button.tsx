import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "plain";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const tone = variant === "primary" ? "bg-ink text-paper" : "bg-fill text-ink";
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full border-0 px-[18px] py-2.5 text-sm font-medium disabled:opacity-50 ${tone} ${className}`}
      {...props}
    />
  );
}
