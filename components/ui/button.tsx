"use client";

import { motion } from "motion/react";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
> & {
  variant?: "primary" | "plain";
};

const press = { duration: 0.12, ease: "easeOut" } as const;

export function Button({ variant = "primary", className = "", disabled, type, ...props }: ButtonProps) {
  const tone =
    variant === "primary" ? "border border-ink bg-ink text-paper" : "border border-line bg-paper text-ink";
  const stretch = className.includes("w-full") ? "w-full" : "";
  return (
    <motion.span
      className={`inline-flex ${stretch}`}
      initial={false}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={press}
    >
      <button
        type={type}
        className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[13px] font-medium disabled:opacity-50 ${tone} ${className}`}
        disabled={disabled}
        {...props}
      />
    </motion.span>
  );
}
