import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly { value: string; label: string }[];
};

export function Select({ label, id, name, options, ...props }: SelectProps) {
  const selectId = id ?? name;
  return (
    <label className="grid gap-1 text-sm" htmlFor={selectId}>
      {label}
      <select id={selectId} name={name} className="border border-line bg-paper px-2 py-1 text-ink" {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
