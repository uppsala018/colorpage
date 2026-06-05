import Link from "next/link";
import {
  absoluteUrl,
  getUseCasePage,
  siteConfig,
  useCasePages,
  type UseCaseSlug,
} from "@/lib/site-config";
import {
  PaintByNumbersSheetPreview,
  PrintableSheetPreview,
} from "@/components/printable-previews";

export function UseCasePage({ slug }: { slug: UseCaseSlug }) {
  const page = getUseCasePage(slug);
  const related = useCasePages
    .filter((item) => item.slug !== slug)
    .slice(0, 4);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.description,
      url: absoluteUrl(page.path),
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
      },
      about: page.primaryKeyword,
      audience: {
        "@type": "Audience",
        audienceType: page.audience,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.title,
          item: absoluteUrl(page.path),
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to create ${page.title.toLowerCase()}`,
      description: page.description,
      step: page.steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step,
        text: step,
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <section className="relative overflow-hidden border-b border-ink-200 bg-background">
          <div className="absolute inset-0 opacity-40">
            <div className="h-full w-full bg-[linear-gradient(to_right,#E8E5DF_1px,transparent_1px),linear-gradient(to_bottom,#E8E5DF_1px,transparent_1px)] bg-[size:44px_44px]" />
          </div>
          <div className="relative mx-auto grid min-h-[72svh] max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 md:grid-cols-[1fr_420px] md:px-6">
            <div>
              <p className="mb-4 font-body text-sm font-semibold uppercase tracking-widest text-coral-500">
                {page.eyebrow}
              </p>
              <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-foreground md:text-6xl">
                {page.title}
              </h1>
              <p className="mt-5 max-w-2xl font-body text-lg leading-relaxed text-ink-600">
                {page.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={createHref(page.slug, page.ctaPrompt)}
                  className="inline-flex items-center justify-center rounded-xl bg-coral-500 px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-coral-600"
                >
                  {page.ctaLabel}
                </Link>
                <Link
                  href="/free-coloring-page-generator"
                  className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-white px-6 py-3 font-body font-semibold text-foreground transition-colors hover:border-ink-400"
                >
                  Try the free generator
                </Link>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[360px]">
              {page.visual === "pbn" ? (
                <PaintByNumbersSheetPreview />
              ) : (
                <PrintableSheetPreview variant={page.visual} />
              )}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 md:px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="font-body text-sm font-semibold uppercase tracking-widest text-ink-400">
                Example scenario
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-foreground">
                {page.scenarioTitle}
              </h2>
            </div>
            <div className="space-y-5 font-body text-base leading-relaxed text-ink-600">
              <p>{page.scenario}</p>
              <p>{page.outcome}</p>
            </div>
          </div>
        </section>

        <section className="bg-ink-100 px-4 py-16 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {page.steps.map((step, index) => (
                <div key={step} className="rounded-[8px] border border-ink-200 bg-background p-6">
                  <span className="font-display text-3xl font-semibold text-coral-500">
                    {index + 1}
                  </span>
                  <p className="mt-4 font-body text-base font-semibold text-foreground">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 md:px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-foreground">
                Prompt ideas for this page
              </h2>
              <div className="mt-6 grid gap-3">
                {page.promptIdeas.map((prompt) => (
                  <Link
                    key={prompt}
                    href={createHref(page.slug, prompt)}
                    className="rounded-[8px] border border-ink-200 bg-white px-4 py-3 font-body text-sm text-ink-600 transition-colors hover:border-coral-400 hover:text-foreground"
                  >
                    {prompt}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-display text-3xl font-semibold text-foreground">
                Why it works
              </h2>
              <ul className="mt-6 grid gap-3">
                {page.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 font-body text-sm text-ink-600">
                    <span className="mt-1 h-2 w-2 rounded-full bg-coral-500" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-foreground px-4 py-16 text-white md:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="font-body text-sm font-semibold uppercase tracking-widest text-white/60">
                Ready to print
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold">
                Create a custom printable page for your exact situation.
              </h2>
            </div>
            <Link
              href={createHref(page.slug, page.ctaPrompt)}
              className="rounded-xl bg-white px-6 py-3 font-body font-semibold text-foreground transition-colors hover:bg-coral-50"
            >
              {page.ctaLabel}
            </Link>
          </div>
        </section>

        <section className="px-4 py-16 md:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-semibold text-foreground">
              More ways to use Color Printables
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={item.path}
                  className="rounded-[8px] border border-ink-200 bg-white p-5 transition-colors hover:border-coral-400"
                >
                  <p className="font-body text-xs font-semibold uppercase tracking-widest text-coral-500">
                    {item.label}
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold text-foreground">
                    {item.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function createHref(slug: UseCaseSlug, prompt: string): string {
  const params = new URLSearchParams({ prompt });
  if (slug === "paint-by-numbers") {
    params.set("type", "paint_by_numbers");
    params.set("difficulty", "medium");
  }
  if (slug === "adult-coloring-pages") {
    params.set("difficulty", "hard");
  }
  if (slug === "preschool") {
    params.set("difficulty", "easy");
  }
  return `/create?${params.toString()}`;
}
