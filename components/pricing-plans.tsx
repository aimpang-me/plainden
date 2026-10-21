"use client";

import { useState } from "react";
import { checkoutAction } from "@/app/pricing/actions";
import { openPaddleCheckout } from "@/components/paddle-checkout";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  amountFor,
  bundlePlan,
  formatPrice,
  lookupKeyFor,
  singleToolPlans,
  type BillingInterval,
  type CheckoutPlan,
} from "@/lib/pricing/catalog";

const freeLimits = [
  "3 invoices or receipts a month",
  "Privacy, terms, cookie, and refund drafts you can copy",
  "PDFs up to 25 MB, 5 a day",
  "QR codes you can download",
  "10 images at a time, up to 10 MB each",
  "Video up to 100 MB",
  "CSV, JSON, and Excel up to 5 MB",
  "One subtitle file at a time",
] as const;

const cardClass = "surface flex flex-col gap-4";

export function PricingPlans({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const tools = singleToolPlans();
  const bundle = bundlePlan();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [toolKey, setToolKey] = useState(tools[0]?.entitlementKey ?? "");
  const [error, setError] = useState("");
  const selected = tools.find((tool) => tool.entitlementKey === toolKey) ?? tools[0];

  async function startCheckout(formData: FormData) {
    setError("");
    const result = await checkoutAction(formData);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    try {
      await openPaddleCheckout(result.transactionId, result.email);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payments are not configured.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <BillingToggle interval={interval} onChange={setInterval} />
      <ul className="stagger panel-stack">
        <li className={cardClass}>
          <PlanHeading name="Free" price="$0" />
          <FeatureList items={freeLimits} />
        </li>
        {selected ? (
          <li className={cardClass}>
            <PlanHeading name="One tool" price={priceLabel(selected, interval)} />
            <FeatureList
              items={[
                "Limits removed on the tool you pick.",
                "Receipt is included with Invoice generator.",
                "Cookie and refund policies are included with Privacy and terms.",
              ]}
            />
            <form action={checkoutEnabled ? startCheckout : undefined} className="grid gap-4">
              <input type="hidden" name="lookupKey" value={lookupKeyFor(selected, interval)} />
              <Select
                label="Tool"
                name="tool"
                value={selected.entitlementKey}
                options={tools.map((tool) => ({ value: tool.entitlementKey, label: tool.name }))}
                onChange={(event) => setToolKey(event.target.value)}
              />
              <Button type="submit" className="w-full" disabled={!checkoutEnabled}>
                Checkout
              </Button>
            </form>
          </li>
        ) : null}
        <li className={cardClass}>
          <PlanHeading name="All tools" price={priceLabel(bundle, interval)} recommended />
          <FeatureList items={["Limits removed on every tool."]} />
          <form action={checkoutEnabled ? startCheckout : undefined}>
            <input type="hidden" name="lookupKey" value={lookupKeyFor(bundle, interval)} />
            <Button type="submit" className="w-full" disabled={!checkoutEnabled}>
              Checkout
            </Button>
          </form>
        </li>
      </ul>
      {checkoutEnabled ? null : <p>Checkout is turned off.</p>}
      {error ? (
        <p role="alert" className="text-sm text-secondary">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BillingToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div className="grid justify-items-start gap-3">
      <fieldset className="w-fit">
        <legend className="sr-only">Billing period</legend>
        <div className="flex rounded-pill bg-hover p-1">
          <PeriodOption
            label="Monthly"
            value="month"
            checked={interval === "month"}
            onChange={onChange}
          />
          <PeriodOption label="Annual" value="year" checked={interval === "year"} onChange={onChange} />
        </div>
      </fieldset>
      <p className="text-sm text-secondary">Annual billing is two months free.</p>
    </div>
  );
}

function PeriodOption({
  label,
  value,
  checked,
  onChange,
}: {
  label: string;
  value: BillingInterval;
  checked: boolean;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <label className="relative inline-flex h-9 cursor-pointer items-center rounded-pill px-3 text-[13px] font-medium has-[:checked]:bg-text has-[:checked]:text-canvas has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text">
      <input
        className="absolute inset-0 cursor-pointer opacity-0 focus-visible:outline-none"
        type="radio"
        name="billing-period"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      {label}
    </label>
  );
}

function PlanHeading({ name, price, recommended = false }: { name: string; price: string; recommended?: boolean }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="title text-[22px]">{name}</h2>
        {recommended ? <span className="pill pill-gray">Recommended</span> : null}
      </div>
      <p className="text-[28px] font-medium tabular-nums tracking-[-0.02em]">{price}</p>
    </div>
  );
}

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid list-disc gap-2 pl-5 text-sm text-secondary">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function priceLabel(plan: CheckoutPlan, interval: BillingInterval): string {
  return formatPrice(amountFor(plan, interval), interval);
}
