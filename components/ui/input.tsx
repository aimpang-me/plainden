import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, name, className = "", ...props }: InputProps) {
  const inputId = id ?? name;
  return (
    <label className="grid gap-1.5 text-[13px] text-secondary" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        name={name}
        className={`field ${className}`}
        {...props}
      />
    </label>
  );
}
