import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly { value: string; label: string }[];
};

export function Select({ label, id, name, options, className = "", ...props }: SelectProps) {
  const selectId = id ?? name;
  return (
    <label className="grid gap-1.5 text-[13px] text-muted" htmlFor={selectId}>
      {label}
      <select
        id={selectId}
        name={name}
        className={`h-9 w-full min-w-0 rounded-[7px] border border-line bg-field px-2.5 text-[13px] text-ink ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
