import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { shellTools } from "@/lib/catalog/shell";
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
        <AppShell tools={shellTools()}>{children}</AppShell>
      </body>
    </html>
  );
}
