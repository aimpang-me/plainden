type FileDropProps = {
  label: string;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
};

export function FileDrop({ label, onFiles, multiple = false, accept }: FileDropProps) {
  return (
    <label className="grid gap-1.5 rounded-xl border border-dashed border-line p-4 text-[13px] text-muted">
      {label}
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        className="text-[15px] text-ink"
        onChange={(event) => {
          const list = event.target.files;
          onFiles(list ? Array.from(list) : []);
        }}
      />
    </label>
  );
}
