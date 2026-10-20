import Link from "next/link";

type UpgradePromptProps = {
  reason: string;
};

export function UpgradePrompt({ reason }: UpgradePromptProps) {
  return (
    <div className="border border-line p-3 text-sm">
      <p>{reason}</p>
      <Link href="/pricing">See pricing</Link>
    </div>
  );
}
