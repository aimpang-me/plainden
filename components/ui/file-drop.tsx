type FileDropProps = {
  label: string;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
};

export function FileDrop({ label, onFiles, multiple = false, accept }: FileDropProps) {
  return (
    <label className="grid min-w-0 gap-1.5 rounded-xl border border-dashed border-line p-4 text-[13px] text-muted">
      {label}
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        className="h-12 w-full min-w-0 text-[15px] text-ink"
        onChange={(event) => {
          const list = event.target.files;
          onFiles(list ? Array.from(list) : []);
        }}
      />
    </label>
  );
}
