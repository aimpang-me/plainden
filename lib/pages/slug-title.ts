const titles: Record<string, string> = {
  "merge-pdf": "Merge PDF",
  "split-pdf": "Split PDF",
  "compress-pdf": "Compress PDF",
  "jpg-to-pdf": "JPG to PDF",
  "privacy-policy-generator": "Privacy policy generator",
  "terms-and-conditions-generator": "Terms and conditions generator",
  "cookie-policy-generator": "Cookie policy generator",
  "refund-policy-generator": "Refund policy generator",
};

export function titleForSlug(slug: string): string | null {
  return titles[slug] ?? null;
}
