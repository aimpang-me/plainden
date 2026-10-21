import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "plain";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

function buttonClass(variant: ButtonVariant): "btn btn-primary press" | "btn btn-plain press" {
  switch (variant) {
    case "primary":
      return "btn btn-primary press";
    case "plain":
      return "btn btn-plain press";
    default: {
      const unreachable: never = variant;
      return unreachable;
    }
  }
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`${buttonClass(variant)} ${className}`} {...props} />;
}
