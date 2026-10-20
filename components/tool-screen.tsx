import Link from "next/link";
import { relatedTools, type ResolvedPage } from "@/lib/pages/resolve";

export function ToolScreen({ page }: { page: ResolvedPage }) {
  switch (page.kind) {
    case "planned":
      return (
        <article className="grid gap-6">
          <h1 className="text-3xl">{page.tool.name}</h1>
          <p>{page.tool.description}</p>
          <p>This tool is not built yet.</p>
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
    <article className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="text-3xl">{page.headline}</h1>
        {page.intro ? <p>{page.intro}</p> : <p>{page.config.description}</p>}
      </header>
      <Tool slug={page.slug} preset={page.preset} />
      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="mb-2 text-xl">
          Steps
        </h2>
        <ol className="list-decimal pl-5">
          {page.copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-2 text-xl">
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
      <h2 id="related-heading" className="mb-2 text-xl">
        Related tools
      </h2>
      <ul className="grid gap-2">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link href={`/${tool.slugs[0]}`}>{tool.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
