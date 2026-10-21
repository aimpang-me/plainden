import type { Metadata } from "next";
import { paddleMerchantSentence } from "@/lib/legal/paddle";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using plainden tools and paid plans.",
};

export default function Page() {
  return (
    <article className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-balance text-[40px] font-medium leading-[1.1] tracking-[-0.03em]">Terms</h1>
      <p>
        plainden gives you browser tools with a free limit. A paid plan is $5 a month for one tool, or $9 a month for
        every tool.
      </p>
      <p>{paddleMerchantSentence}</p>
      <p>
        You keep the files you create. Do not upload anything you are not allowed to process. The tools run in your
        browser except for account, billing, and hosted policy pages.
      </p>
      <p>
        Questions go to <a href="mailto:support@plainden.com">support@plainden.com</a>.
      </p>
    </article>
  );
}
