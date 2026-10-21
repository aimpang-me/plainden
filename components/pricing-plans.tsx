"use client";

import { useState } from "react";
import { checkoutAction, portalAction } from "@/app/pricing/actions";
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

const cardClass =
  "flex h-full flex-col gap-5 rounded-[10px] border border-line bg-paper p-5 shadow-[0_1px_2px_rgba(40,30,10,0.05),0_4px_14px_rgba(40,30,10,0.05)]";

export function PricingPlans() {
  const tools = singleToolPlans();
  const bundle = bundlePlan();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [toolKey, setToolKey] = useState(tools[0]?.entitlementKey ?? "");
  const selected = tools.find((tool) => tool.entitlementKey === toolKey) ?? tools[0];

  return (
    <div className="grid grid-cols-1 gap-6">
      <BillingToggle interval={interval} onChange={setInterval} />
      <ul className="grid grid-cols-1 items-stretch gap-4 min-[801px]:grid-cols-3">
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
            <form action={checkoutAction} className="mt-auto grid gap-4">
              <input type="hidden" name="lookupKey" value={lookupKeyFor(selected, interval)} />
              <Select
                label="Tool"
                name="tool"
                value={selected.entitlementKey}
                options={tools.map((tool) => ({ value: tool.entitlementKey, label: tool.name }))}
                onChange={(event) => setToolKey(event.target.value)}
              />
              <Button type="submit" className="w-full">
                Checkout
              </Button>
            </form>
          </li>
        ) : null}
        <li className={cardClass}>
          <PlanHeading name="All tools" price={priceLabel(bundle, interval)} recommended />
          <FeatureList items={["Limits removed on every tool."]} />
          <form action={checkoutAction} className="mt-auto">
            <input type="hidden" name="lookupKey" value={lookupKeyFor(bundle, interval)} />
            <Button type="submit" className="w-full">
              Checkout
            </Button>
          </form>
        </li>
      </ul>
      <form action={portalAction}>
        <Button type="submit" variant="plain">
          Open billing portal
        </Button>
      </form>
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
        <div className="flex rounded-full bg-fill p-1">
          <PeriodOption
            label="Monthly"
            value="month"
            checked={interval === "month"}
            onChange={onChange}
          />
          <PeriodOption label="Annual" value="year" checked={interval === "year"} onChange={onChange} />
        </div>
      </fieldset>
      <p className="text-sm text-muted">Annual billing is two months free.</p>
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
    <label className="relative inline-flex h-9 cursor-pointer items-center rounded-full px-3 text-[13px] font-medium has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink">
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
        <h2 className="font-serif text-[22px] font-normal tracking-[-0.01em]">{name}</h2>
        {recommended ? (
          <span className="inline-flex rounded-full bg-fill px-2.5 py-0.5 text-[11px] text-ink">Recommended</span>
        ) : null}
      </div>
      <p className="text-[28px] font-medium tabular-nums tracking-[-0.02em]">{price}</p>
    </div>
  );
}

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid list-disc gap-2 pl-5 text-sm text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function priceLabel(plan: CheckoutPlan, interval: BillingInterval): string {
  return formatPrice(amountFor(plan, interval), interval);
}
