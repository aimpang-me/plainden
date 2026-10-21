import type { Metadata } from "next";
import { paddleMerchantSentence } from "@/lib/legal/paddle";

export const metadata: Metadata = {
  title: "Refunds",
  description: "How returns work for plainden plans.",
};

export default function Page() {
  return (
    <article className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-balance text-[40px] font-medium leading-[1.1] tracking-[-0.03em]">Refunds</h1>
      <p>Paid plans are sold by Paddle. Use the receipt from Paddle to ask for a return.</p>
      <p>{paddleMerchantSentence}</p>
      <p>
        Questions go to <a href="mailto:support@plainden.com">support@plainden.com</a>.
      </p>
    </article>
  );
}
