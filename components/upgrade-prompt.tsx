import Link from "next/link";

type UpgradePromptProps = {
  reason: string;
};

export function UpgradePrompt({ reason }: UpgradePromptProps) {
  return (
    <div className="rounded-3xl border border-line-soft bg-fill p-4 text-sm">
      <p>{reason}</p>
      <Link href="/pricing">See pricing</Link>
    </div>
  );
}
