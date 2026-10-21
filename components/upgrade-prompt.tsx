import Link from "next/link";

type UpgradePromptProps = {
  reason: string;
};

export function UpgradePrompt({ reason }: UpgradePromptProps) {
  return (
    <div className="rounded-card border border-line bg-hover p-4 text-[13px]">
      <p>{reason}</p>
      <Link href="/pricing">See pricing</Link>
    </div>
  );
}
