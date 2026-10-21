type FileDropProps = {
  label: string;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
};

export function FileDrop({ label, onFiles, multiple = false, accept }: FileDropProps) {
  return (
    <label className="surface surface-dashed grid min-w-0 gap-1.5 text-[13px] text-secondary">
      {label}
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        className="w-full min-w-0 text-[13px] text-text"
        onChange={(event) => {
          const list = event.target.files;
          onFiles(list ? Array.from(list) : []);
        }}
      />
    </label>
  );
}
