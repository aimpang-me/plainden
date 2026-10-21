import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What plainden stores and which cookies it uses.",
};

export default function Page() {
  return (
    <article className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-balance text-[40px] font-medium leading-[1.1] tracking-[-0.03em]">Privacy</h1>
      <p>
        We store the email you use to sign in, your session, and the items you save on a paid plan. That can include
        invoices, receipts, QR codes, data presets, and hosted policy text.
      </p>
      <p>
        We do not sell that information. We do not run advertising cookies. A sign-in cookie is required to keep you
        signed in. Optional cookies stay off unless you accept them in the banner.
      </p>
      <p>Mail is sent from the address we configure when email delivery is turned on.</p>
      <p>
        Questions go to <a href="mailto:support@plainden.com">support@plainden.com</a>.
      </p>
    </article>
  );
}
