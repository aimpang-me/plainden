import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, name, className = "", ...props }: InputProps) {
  const inputId = id ?? name;
  return (
    <label className="grid gap-1.5 text-[13px] text-muted" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        name={name}
        className={`h-12 w-full min-w-0 rounded-xl border border-line bg-paper px-3.5 text-[15px] text-ink ${className}`}
        {...props}
      />
    </label>
  );
}
