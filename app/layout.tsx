import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteOrigin } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

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
    <html lang="en" className={inter.className} data-theme="light" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SiteHeader />
        <main id="content" className="mx-auto w-full max-w-[1120px] px-8 pb-28 pt-24 max-[800px]:px-5 max-[800px]:pb-16 max-[800px]:pt-14">
          {children}
        </main>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
