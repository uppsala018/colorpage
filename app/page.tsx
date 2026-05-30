import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Coloring Pages Generator — Free Printable Coloring Pages",
  description:
    "Generate custom coloring pages and paint by numbers with AI. Perfect for kids, teachers, and Sunday school. Free to try.",
  keywords: [
    "printable coloring pages",
    "AI coloring pages",
    "Sunday school coloring pages",
    "coloring page generator",
  ],
  openGraph: {
    title: "AI Coloring Pages Generator — Free Printable Coloring Pages",
    description:
      "Generate custom coloring pages and paint by numbers with AI. Perfect for kids, teachers, and Sunday school. Free to try.",
    type: "website",
    siteName: "ColoringAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Coloring Pages Generator — Free Printable Coloring Pages",
    description:
      "Generate custom coloring pages and paint by numbers with AI. Free to try.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ColoringAI",
  applicationCategory: "DesignApplication",
  description:
    "Generate custom printable coloring pages and paint by numbers with AI.",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" },
    { "@type": "Offer", price: "4.99", priceCurrency: "USD", name: "Credits — 10 pages" },
    { "@type": "Offer", price: "9.99", priceCurrency: "USD", name: "Unlimited — per month" },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <Hero />
        <HowItWorks />
        <OutputTypes />
        <WhoItsFor />
        <Pricing />
        <FAQ />
      </main>
      <SiteFooter />
    </>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="min-h-[88vh] flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-body text-coral-500 font-semibold text-sm uppercase tracking-widest mb-4">
        Free to try — no account needed
      </p>
      <h1 className="font-display text-5xl md:text-7xl font-semibold text-foreground leading-[1.1] mb-5 max-w-3xl">
        Make beautiful coloring pages in seconds
      </h1>
      <p className="font-body text-ink-400 text-lg md:text-xl max-w-md mb-10">
        Type what you want. We generate it. Print and color.
      </p>
      <Link
        href="/create"
        className="bg-coral-500 hover:bg-coral-600 text-white font-body font-semibold text-lg px-9 py-4 rounded-2xl transition-colors shadow-sm"
      >
        Create your first free page →
      </Link>
      <p className="mt-5 font-body text-ink-400 text-sm">
        No sign-up required to generate. Download prompts sign-in.
      </p>
    </section>
  );
}

/* ─── How it works ──────────────────────────────────────────────────────── */

const steps = [
  {
    n: "1",
    label: "Type a description",
    icon: <PencilIcon />,
  },
  {
    n: "2",
    label: "We generate your coloring page",
    icon: <SparkleIcon />,
  },
  {
    n: "3",
    label: "Download and print",
    icon: <PrinterIcon />,
  },
];

function HowItWorks() {
  return (
    <section className="bg-ink-100 px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground text-center mb-14">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step) => (
            <div key={step.n} className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-coral-50 border border-coral-100 flex items-center justify-center text-coral-500">
                {step.icon}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-coral-500 font-semibold text-lg">
                  {step.n}.
                </span>
                <p className="font-body text-foreground font-medium">{step.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Output types ──────────────────────────────────────────────────────── */

function OutputTypes() {
  return (
    <section className="px-6 py-20 max-w-4xl mx-auto">
      <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground text-center mb-4">
        Two styles, one prompt
      </h2>
      <p className="font-body text-ink-400 text-center mb-14">
        Generate a classic coloring page or a paint by numbers — your choice.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <OutputCard
          label="Coloring Page"
          description="Clean black outlines on white. Print and color with any medium."
          visual={<ColoringPagePreview />}
        />
        <OutputCard
          label="Paint by Numbers"
          description="Numbered regions with a color key. Perfect for older kids and adults."
          visual={<PaintByNumbersPreview />}
        />
      </div>
    </section>
  );
}

function OutputCard({
  label,
  description,
  visual,
}: {
  label: string;
  description: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="border border-ink-200 rounded-3xl overflow-hidden">
      <div className="bg-white aspect-[4/3] flex items-center justify-center p-8">
        {visual}
      </div>
      <div className="px-6 py-5 bg-background border-t border-ink-200">
        <p className="font-display text-lg font-semibold text-foreground mb-1">{label}</p>
        <p className="font-body text-ink-400 text-sm">{description}</p>
      </div>
    </div>
  );
}

function ColoringPagePreview() {
  return (
    <svg
      viewBox="0 0 180 180"
      fill="none"
      stroke="#1C1917"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full max-w-[180px]"
      aria-label="Coloring page preview"
    >
      {/* Sun */}
      <circle cx="140" cy="36" r="16" />
      <line x1="140" y1="12" x2="140" y2="6" />
      <line x1="140" y1="60" x2="140" y2="66" />
      <line x1="116" y1="36" x2="110" y2="36" />
      <line x1="164" y1="36" x2="170" y2="36" />
      <line x1="123" y1="19" x2="118" y2="14" />
      <line x1="157" y1="53" x2="162" y2="58" />
      <line x1="157" y1="19" x2="162" y2="14" />
      <line x1="123" y1="53" x2="118" y2="58" />
      {/* Cloud */}
      <path d="M18 60 Q18 46 30 46 Q33 36 45 38 Q52 28 64 34 Q74 28 78 38 Q90 38 90 52 Q90 60 82 62 L26 62 Q18 62 18 60 Z" />
      {/* House */}
      <path d="M30 160 L30 110 L90 80 L150 110 L150 160 Z" />
      <rect x="68" y="128" width="44" height="32" />
      <rect x="42" y="112" width="28" height="24" />
      <rect x="110" y="112" width="28" height="24" />
      {/* Ground */}
      <line x1="10" y1="160" x2="170" y2="160" />
      {/* Tree */}
      <line x1="22" y1="160" x2="22" y2="130" />
      <ellipse cx="22" cy="120" rx="14" ry="16" />
    </svg>
  );
}

function PaintByNumbersPreview() {
  return (
    <svg
      viewBox="0 0 180 180"
      className="w-full max-w-[180px]"
      aria-label="Paint by numbers preview"
    >
      {/* Sky region */}
      <path d="M10 10 L170 10 L170 90 L10 90 Z" fill="#E8EEF4" stroke="#1C1917" strokeWidth="2" />
      <text x="90" y="55" textAnchor="middle" fontFamily="serif" fontSize="22" fill="#5C5650" fontWeight="600">1</text>
      {/* Ground */}
      <path d="M10 90 L170 90 L170 170 L10 170 Z" fill="#E8F4E8" stroke="#1C1917" strokeWidth="2" />
      <text x="90" y="138" textAnchor="middle" fontFamily="serif" fontSize="22" fill="#5C5650" fontWeight="600">2</text>
      {/* Sun */}
      <circle cx="140" cy="40" r="20" fill="#FDF0B0" stroke="#1C1917" strokeWidth="2" />
      <text x="140" y="46" textAnchor="middle" fontFamily="serif" fontSize="14" fill="#5C5650" fontWeight="600">3</text>
      {/* House body */}
      <path d="M40 170 L40 110 L90 82 L140 110 L140 170 Z" fill="#F4E8E8" stroke="#1C1917" strokeWidth="2" />
      <text x="90" y="148" textAnchor="middle" fontFamily="serif" fontSize="14" fill="#5C5650" fontWeight="600">4</text>
      {/* Roof */}
      <path d="M32 115 L90 78 L148 115 Z" fill="#E8D8D8" stroke="#1C1917" strokeWidth="2" />
      <text x="90" y="108" textAnchor="middle" fontFamily="serif" fontSize="11" fill="#5C5650" fontWeight="600">5</text>
      {/* Color key strip */}
      <rect x="10" y="173" width="160" height="6" fill="none" stroke="#1C1917" strokeWidth="1" />
      {["#E8EEF4","#E8F4E8","#FDF0B0","#F4E8E8","#E8D8D8"].map((c, i) => (
        <rect key={i} x={10 + i * 32} y="173" width="32" height="6" fill={c} />
      ))}
    </svg>
  );
}

/* ─── Who it's for ──────────────────────────────────────────────────────── */

const audiences = [
  {
    title: "Families",
    body: "Keep kids busy with custom pages featuring their favorite characters, animals, or scenes.",
  },
  {
    title: "Teachers & Schools",
    body: "Create unique activity pages and worksheets in minutes — matched to any lesson topic.",
  },
  {
    title: "Churches & Sunday Schools",
    body: "Generate Bible story scenes, faith-based patterns, and holiday coloring pages instantly.",
  },
  {
    title: "Language Learning",
    body: "Pair vocabulary words with illustrated scenes to reinforce new language through coloring.",
  },
];

function WhoItsFor() {
  return (
    <section className="bg-ink-100 px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground text-center mb-14">
          Made for everyone who creates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="bg-background border border-ink-200 rounded-2xl p-6"
            >
              <p className="font-display text-lg font-semibold text-foreground mb-2">
                {a.title}
              </p>
              <p className="font-body text-ink-400 text-sm leading-relaxed">
                {a.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ───────────────────────────────────────────────────────────── */

const plans = [
  {
    name: "Free",
    price: "0",
    unit: "$",
    per: "forever",
    features: ["3 pages per month", "PNG download", "Standard quality"],
    cta: "Start free",
    href: "/signup",
    featured: false,
  },
  {
    name: "Credits",
    price: "4.99",
    unit: "$",
    per: "for 10 pages",
    features: ["No subscription", "PDF + PNG download", "High resolution", "Credits never expire"],
    cta: "Buy credits",
    href: "/pricing",
    featured: true,
  },
  {
    name: "Unlimited",
    price: "9.99",
    unit: "$",
    per: "per month",
    features: ["Unlimited pages", "PDF + PNG download", "High resolution", "Priority generation"],
    cta: "Go unlimited",
    href: "/pricing",
    featured: false,
  },
];

function Pricing() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground text-center mb-3">
          Simple, honest pricing
        </h2>
        <p className="font-body text-ink-400 text-center mb-14">
          Start free. Only pay when you need more.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-7 flex flex-col ${
                plan.featured
                  ? "bg-coral-500 border-coral-500 text-white"
                  : "bg-background border-ink-200 text-foreground"
              }`}
            >
              {plan.featured && (
                <span className="font-body text-xs font-semibold text-white/70 uppercase tracking-widest mb-3">
                  Most popular
                </span>
              )}
              <p
                className={`font-body font-semibold text-sm uppercase tracking-widest mb-2 ${
                  plan.featured ? "text-white/70" : "text-ink-400"
                }`}
              >
                {plan.name}
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-body text-lg">{plan.unit}</span>
                <span className="font-display text-4xl font-semibold">{plan.price}</span>
              </div>
              <p
                className={`font-body text-sm mb-6 ${
                  plan.featured ? "text-white/70" : "text-ink-400"
                }`}
              >
                {plan.per}
              </p>
              <ul className="flex flex-col gap-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-body text-sm">
                    <CheckIcon
                      className={`mt-0.5 shrink-0 ${
                        plan.featured ? "text-white" : "text-coral-500"
                      }`}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`block text-center font-body font-semibold py-3 rounded-xl transition-colors ${
                  plan.featured
                    ? "bg-white text-coral-500 hover:bg-coral-50"
                    : "bg-coral-500 text-white hover:bg-coral-600"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ───────────────────────────────────────────────────────────────── */

const faqs = [
  {
    q: "Is it really free to try?",
    a: "Yes. You get 3 free pages every month with no credit card required. You only need an account to download.",
  },
  {
    q: "What file formats can I download?",
    a: "Free accounts get PNG. Credits and Unlimited plans include high-resolution PDF — ideal for printing.",
  },
  {
    q: "How long does generation take?",
    a: "Most pages are ready in under 30 seconds. Complex scenes may take a little longer.",
  },
  {
    q: "Can I use these pages in my classroom or church?",
    a: "Absolutely. Personal, classroom, and church use are included in all plans. Contact us for commercial licensing.",
  },
];

function FAQ() {
  return (
    <section className="bg-ink-100 px-6 py-20">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground text-center mb-14">
          Common questions
        </h2>
        <dl className="flex flex-col gap-8">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <dt className="font-body font-semibold text-foreground mb-2">{faq.q}</dt>
              <dd className="font-body text-ink-400 text-sm leading-relaxed">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 px-6 py-8">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-display text-xl font-semibold text-coral-500">
          ColoringAI
        </span>
        <nav className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="font-body text-sm text-ink-400 hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="font-body text-sm text-ink-400 hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="font-body text-sm font-semibold text-white bg-coral-500 hover:bg-coral-600 px-4 py-2 rounded-xl transition-colors"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}

/* ─── Icons ─────────────────────────────────────────────────────────────── */

function PencilIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
      <path d="M5 3 L5.75 5.25 L8 6 L5.75 6.75 L5 9 L4.25 6.75 L2 6 L4.25 5.25 Z" />
      <path d="M19 14 L19.75 16.25 L22 17 L19.75 17.75 L19 20 L18.25 17.75 L16 17 L18.25 16.25 Z" />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3h12v6" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M13 4 L6 12 L3 9" />
    </svg>
  );
}
