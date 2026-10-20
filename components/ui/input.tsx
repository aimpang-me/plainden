import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, name, ...props }: InputProps) {
  const inputId = id ?? name;
  return (
    <label className="grid gap-1 text-sm" htmlFor={inputId}>
      {label}
      <input id={inputId} name={name} className="border border-line bg-paper px-2 py-1 text-ink" {...props} />
    </label>
  );
}
