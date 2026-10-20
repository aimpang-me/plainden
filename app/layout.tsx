import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteOrigin } from "@/lib/seo";
import "./globals.css";

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
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SiteHeader />
        <main id="content" className="mx-auto max-w-3xl px-4 py-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
