type FileDropProps = {
  label: string;
  onFiles: (files: File[]) => void;
};

export function FileDrop({ label, onFiles }: FileDropProps) {
  return (
    <label className="grid gap-1 border border-dashed border-line p-3 text-sm">
      {label}
      <input
        type="file"
        onChange={(event) => {
          const list = event.target.files;
          onFiles(list ? Array.from(list) : []);
        }}
      />
    </label>
  );
}
