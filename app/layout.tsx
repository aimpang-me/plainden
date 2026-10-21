import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { AppShell } from "@/components/app-shell";
import { CookieBanner } from "@/components/cookie-banner";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { sidebarAccountLabel } from "@/lib/auth/sidebar-account";
import { shellTools } from "@/lib/catalog/shell";
import { planLabelFor } from "@/lib/payments/plan-label";
import { siteOrigin } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

const themeScript =
  'try{var t=localStorage.getItem("plainden-theme");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}';

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: "plainden", template: "%s | plainden" },
    description: "Small browser tools with a free limit and a $5 monthly plan.",
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable} data-theme="light" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppShell
          tools={shellTools()}
          accountLabel={<AccountSlot />}
          drawerAccountLabel={<AccountSlot />}
          planLabel={<PlanSlot />}
          drawerPlanLabel={<PlanSlot />}
        >
          {children}
        </AppShell>
        <CookieBanner />
      </body>
    </html>
  );
}

function AccountSlot() {
  return (
    <Suspense fallback={<span className="block min-w-0 truncate text-[13px]">Sign in</span>}>
      <AccountLabel />
    </Suspense>
  );
}

async function AccountLabel() {
  await connection();
  let email: string | null = null;
  try {
    const current = await getCurrentUser();
    email = current?.email ?? null;
  } catch {
    email = null;
  }
  return <span className="block min-w-0 truncate text-[13px]">{sidebarAccountLabel(email)}</span>;
}

function PlanSlot() {
  return (
    <Suspense fallback={null}>
      <PlanLabel />
    </Suspense>
  );
}

async function PlanLabel() {
  await connection();
  let planLabel = "Free plan";
  try {
    const current = await getCurrentUser();
    if (current) planLabel = await planLabelFor(current.id);
  } catch {
    planLabel = "Free plan";
  }
  return <span className="block text-[11px] text-secondary">{planLabel}</span>;
}
