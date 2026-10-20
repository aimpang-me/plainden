import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "plain";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const tone = variant === "primary" ? "bg-accent text-paper hover:opacity-90" : "bg-paper text-ink";
  return (
    <button
      className={`border border-line px-3 py-1 text-sm ${tone} ${className}`}
      {...props}
    />
  );
}
