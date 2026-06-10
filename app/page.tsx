import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { HomePromptLauncher } from "@/components/home-prompt-launcher";
import {
  PaintByNumbersSheetPreview,
  PrintableSheetPreview,
} from "@/components/printable-previews";
import { siteConfig, useCasePages } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Color Printables | Create Free Coloring Pages to Print",
  description:
    "Create printable coloring pages from any idea. Generate kids, classroom, Sunday school, adult, and paint-by-numbers pages, then print or download as PDF.",
  keywords: [
    "coloring pages to print",
    "printable coloring pages",
    "free coloring page generator",
    "generate coloring pages free",
    "AI coloring page generator",
    "coloring pages PDF",
    "paint by numbers generator",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Color Printables | Create Free Coloring Pages to Print",
    description:
      "Generate custom coloring pages and paint-by-numbers printables, then print or download as PDF.",
    type: "website",
    siteName: siteConfig.name,
    url: "/",
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Color Printables | Create Free Coloring Pages to Print",
    description:
      "Create printable coloring pages from any idea, then print or download as PDF.",
    images: ["/og-image.svg"],
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: siteConfig.url,
    description: siteConfig.description,
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" },
      { "@type": "Offer", price: "4.99", priceCurrency: "USD", name: "Credits - 10 exports" },
      { "@type": "Offer", price: "9.99", priceCurrency: "USD", name: "Unlimited - monthly" },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to create printable coloring pages",
    description:
      "Create a coloring page from a prompt, choose a style, then print or download the result as PDF.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Describe the page",
        text: "Type the subject, lesson, character, animal, or pattern you want to color.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Choose a style",
        text: "Pick a regular coloring page or a paint-by-numbers page with a color guide.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Print or download",
        text: "Generate the printable, then print it or save it as a PDF.",
      },
    ],
  },
];

const benefits = [
  "Print-ready PDF exports",
  "Children, Teen, and Adults difficulty",
  "Classic coloring pages and paint by numbers",
  "Useful for classrooms, homes, church, and relaxation",
];

const examples = [
  "a rainy day dinosaur activity for kids",
  "Noah's Ark with animals walking two by two",
  "alphabet letter B with butterflies and books",
  "intricate floral mandala with butterflies",
  "simple classroom page about the water cycle",
  "paint by numbers garden with 12 colors",
];

export default function HomePage() {
  const featuredUseCases = useCasePages.filter((page) =>
    ["teacher", "sunday-school", "parents", "adult-coloring-pages", "paint-by-numbers", "free-coloring-page-generator"].includes(page.slug)
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <OutputTypes />
        <UseCases pages={featuredUseCases} />
        <PromptExamples />
        <SeoContent />
        <FAQ />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink-200 bg-background">
      <div className="absolute inset-0 opacity-30">
        <div className="h-full w-full bg-[linear-gradient(to_right,#E8E5DF_1px,transparent_1px),linear-gradient(to_bottom,#E8E5DF_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>
      <div className="relative mx-auto flex min-h-[88svh] max-w-6xl flex-col justify-center px-4 py-20 md:px-6">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-coral-200 bg-coral-50 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-coral-500" aria-hidden />
            <span className="font-body text-xs font-semibold text-coral-600">
              Free printable coloring page generator
            </span>
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.04] text-foreground md:text-7xl">
            Coloring pages to print
            <span className="text-coral-500"> in seconds</span>
          </h1>
          <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-ink-600 md:text-xl">
            Type an idea, generate a custom coloring page, then print it or save it as a PDF. For kids, classrooms, Sunday school, adults, and paint by numbers.
          </p>
        </div>
        <HomePromptLauncher />
        <div className="mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3 font-body text-sm text-ink-600">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral-100">
                <span className="h-1.5 w-1.5 rounded-full bg-coral-500" aria-hidden />
              </span>
              {benefit}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    { label: "Works from any browser", sub: "Laptop, tablet, or phone" },
    { label: "A5, A4, and A3 export", sub: "Portrait and landscape" },
    { label: "Free to try", sub: "No account needed to start" },
    { label: "Ready in 15–30 seconds", sub: "Fast AI generation" },
  ];

  return (
    <section className="border-b border-ink-200 bg-white px-4 py-6 md:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="font-body text-sm font-semibold text-foreground">{item.label}</span>
            <span className="mt-0.5 font-body text-xs text-ink-400">{item.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Describe what you need",
      text: "Use plain language: a school topic, Bible story, animal, party theme, or relaxing pattern.",
    },
    {
      number: "02",
      title: "Choose the printable style",
      text: "Create a classic black-and-white page or a numbered paint-by-numbers sheet with a color guide.",
    },
    {
      number: "03",
      title: "Print or save as PDF",
      text: "Download the result and make one copy or enough pages for a whole class.",
    },
  ];

  return (
    <section className="px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-coral-500">
            Simple workflow
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
            From prompt to printable
            <br />in three steps
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="group relative rounded-2xl border border-ink-200 bg-white p-7 transition-shadow hover:shadow-md">
              <p className="font-display text-5xl font-semibold text-ink-100 transition-colors group-hover:text-coral-100">
                {step.number}
              </p>
              <h3 className="mt-4 font-body text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink-600">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OutputTypes() {
  const pbnPage = useCasePages.find((p) => p.slug === "paint-by-numbers");
  const freePage = useCasePages.find((p) => p.slug === "free-coloring-page-generator");

  return (
    <section className="bg-ink-100 px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-coral-500">
            Printable formats
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
            Two generators in one place
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-6 rounded-2xl border border-ink-200 bg-background p-7 sm:flex-row sm:items-start">
            <PrintableSheetPreview
              variant="classroom"
              imageSrc={freePage?.exampleImage}
              className="w-full shrink-0 sm:w-40"
            />
            <div className="flex flex-col">
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Coloring page generator
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-ink-600">
                Clean black outlines on a white printable page. Choose Children, Teen, or Adults to control the amount of detail.
              </p>
              <Link href="/free-coloring-page-generator" className="mt-5 inline-flex items-center gap-1 font-body text-sm font-semibold text-coral-500 hover:underline">
                Explore coloring pages
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-6 rounded-2xl border border-ink-200 bg-background p-7 sm:flex-row sm:items-start">
            <PaintByNumbersSheetPreview
              imageSrc={pbnPage?.exampleImage}
              className="w-full shrink-0 sm:w-40"
            />
            <div className="flex flex-col">
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Paint by numbers generator
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-ink-600">
                Numbered regions plus a color guide. Pick Easy, Medium, or Hard for 6, 12, or 24 colors.
              </p>
              <Link href="/paint-by-numbers" className="mt-5 inline-flex items-center gap-1 font-body text-sm font-semibold text-coral-500 hover:underline">
                Explore paint by numbers
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCases({ pages }: { pages: typeof useCasePages }) {
  return (
    <section className="px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-coral-500">
              Use-case guides
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              Built for real
              <br />printable moments
            </h2>
          </div>
          <Link href="/teacher" className="shrink-0 font-body text-sm font-semibold text-coral-500 hover:underline">
            Start with teacher printables →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={page.path}
              className="group flex flex-col rounded-2xl border border-ink-200 bg-white p-6 transition-all hover:border-coral-300 hover:shadow-sm"
            >
              {page.exampleImage && (
                <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl">
                  <Image
                    src={page.exampleImage}
                    alt={page.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}
              <p className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-coral-500">
                {page.label}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-foreground">
                {page.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink-600 line-clamp-2">
                {page.description}
              </p>
              <span className="mt-4 font-body text-xs font-semibold text-coral-500 opacity-0 transition-opacity group-hover:opacity-100">
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PromptExamples() {
  return (
    <section className="bg-foreground px-4 py-24 text-white md:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col justify-center">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
            Prompt examples
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">
            Use exactly the idea you need
          </h2>
          <p className="mt-5 font-body text-sm leading-relaxed text-white/60">
            Search results show generic pages. Color Printables creates a new printable around your exact classroom, child, Bible lesson, party, or relaxation theme.
          </p>
          <Link
            href="/create"
            className="mt-8 inline-flex items-center gap-2 self-start rounded-xl bg-coral-500 px-5 py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-coral-600"
          >
            Start creating →
          </Link>
        </div>
        <div className="grid gap-3">
          {examples.map((example) => (
            <Link
              key={example}
              href={`/create?prompt=${encodeURIComponent(example)}`}
              className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 font-body text-sm text-white/80 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              <span>{example}</span>
              <span className="text-white/30 transition-colors group-hover:text-white/70" aria-hidden>→</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SeoContent() {
  return (
    <section className="px-4 py-24 md:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-4xl font-semibold text-foreground">
          A practical printable coloring page generator
        </h2>
        <div className="mt-8 space-y-5 font-body text-base leading-relaxed text-ink-600">
          <p>
            Color Printables helps you create coloring pages to print without hunting through old worksheets or generic image results. Describe the page you want, choose a difficulty level, and generate a print-ready design for your exact situation.
          </p>
          <p>
            Teachers can create classroom activities, parents can make quick screen-free pages for kids, Sunday school leaders can prepare Bible story printables, and adults can create detailed mandala-like pages for relaxation.
          </p>
          <p>
            You can start with a regular coloring page or switch to paint by numbers when you want numbered regions and a matching color guide.
          </p>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Can I create coloring pages for free?",
      a: "Yes. You can try the generator for free and create printable coloring pages before choosing a paid plan.",
    },
    {
      q: "Can I print the pages from a classroom laptop?",
      a: "Yes. Generate a page in the browser, download the PDF, and print one copy or multiple copies from your normal printer.",
    },
    {
      q: "Can I make adult coloring pages?",
      a: "Yes. Choose Adults difficulty for more detail, smaller areas, mandala-like patterns, flowers, butterflies, and relaxing line art.",
    },
    {
      q: "Does it also make paint by numbers?",
      a: "Yes. Paint by Numbers creates numbered regions and a color guide with Easy, Medium, or Hard color counts.",
    },
    {
      q: "How many credits do I need?",
      a: "Each PDF export uses 1 credit. Generating a preview is always free — you only spend a credit when you download.",
    },
  ];

  return (
    <section className="bg-ink-100 px-4 py-24 md:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-4xl font-semibold text-foreground">
          Questions about printable coloring pages
        </h2>
        <dl className="mt-10 divide-y divide-ink-200">
          {faqs.map((faq) => (
            <div key={faq.q} className="py-6">
              <dt className="font-body text-base font-semibold text-foreground">{faq.q}</dt>
              <dd className="mt-2 font-body text-sm leading-relaxed text-ink-600">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SiteFooter() {
  const links = [
    { href: "/create", label: "Create" },
    { href: "/teacher", label: "Teachers" },
    { href: "/sunday-school", label: "Sunday School" },
    { href: "/adult-coloring-pages", label: "Adults" },
    { href: "/paint-by-numbers", label: "Paint by Numbers" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <footer className="border-t border-ink-200 bg-white px-4 py-10 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" className="font-display text-2xl font-semibold text-coral-500">
              {siteConfig.name}
            </Link>
            <p className="mt-2 max-w-xs font-body text-sm leading-relaxed text-ink-400">
              Create printable coloring pages and PDF downloads from any idea.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-sm text-ink-600 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 border-t border-ink-100 pt-6">
          <p className="font-body text-xs text-ink-400">
            © {new Date().getFullYear()} {siteConfig.name}. Secure payment via Stripe.
          </p>
        </div>
      </div>
    </footer>
  );
}
