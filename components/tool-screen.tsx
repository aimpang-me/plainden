import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { relatedTools, type ResolvedPage } from "@/lib/pages/resolve";
import { titleForSlug } from "@/lib/pages/slug-title";

export function ToolScreen({ page }: { page: ResolvedPage }) {
  switch (page.kind) {
    case "planned":
      return (
        <article className="grid grid-cols-1 gap-8">
          <header className="max-w-3xl">
            <PageHeading>{titleForSlug(page.slug) ?? page.tool.name}</PageHeading>
            <p className="mt-2 text-pretty text-[13px] text-secondary">{page.tool.description}</p>
          </header>
          <p className="text-center text-secondary">This tool is not built yet.</p>
          <Related currentId={page.tool.id} />
        </article>
      );
    case "tool":
      return <RegisteredToolScreen page={page} />;
    default: {
      const unreachable: never = page;
      return unreachable;
    }
  }
}

function RegisteredToolScreen({ page }: { page: Extract<ResolvedPage, { kind: "tool" }> }) {
  const Tool = page.Tool;
  return (
    <article className="grid grid-cols-1 gap-8">
      <header className="min-w-0 max-w-3xl">
        <PageHeading>{page.headline}</PageHeading>
        <p className="mt-2 text-pretty text-[13px] text-secondary">{page.intro ? page.intro : page.config.description}</p>
      </header>
      <Tool slug={page.slug} preset={page.preset} />
      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="mb-3 text-[13px] text-secondary">
          Steps
        </h2>
        <ol className="list-decimal pl-5">
          {page.copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-3 text-[13px] text-secondary">
          FAQ
        </h2>
        <ul className="grid gap-3">
          {page.faq.map((item) => (
            <li key={item.question}>
              <h3 className="font-medium">{item.question}</h3>
              <p>{item.answer}</p>
            </li>
          ))}
        </ul>
      </section>
      <Related currentId={page.config.id} />
    </article>
  );
}

function Related({ currentId }: { currentId: string }) {
  const tools = relatedTools(currentId);
  return (
    <section aria-labelledby="related-heading">
      <h2 id="related-heading" className="mb-3 text-[13px] text-secondary">
        Related tools
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link href={`/${tool.slugs[0]}`}>{tool.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
