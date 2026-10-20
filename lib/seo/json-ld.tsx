import { jsonLdScript } from "./document";
import type { SeoPage } from "./pages";

export function JsonLd({ page, origin }: { page: SeoPage; origin: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(page, origin) }} />;
}
