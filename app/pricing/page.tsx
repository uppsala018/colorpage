import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["3 pages per month", "PNG download", "Standard quality"],
    cta: "Get started",
    href: "/signup",
    primary: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "per month",
    features: [
      "Unlimited pages",
      "PDF + PNG download",
      "High-resolution output",
      "Priority generation",
    ],
    cta: "Start Pro",
    href: "/api/stripe/checkout",
    primary: true,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <h1 className="font-display text-5xl font-semibold text-foreground mb-2 text-center">
        Simple pricing
      </h1>
      <p className="font-body text-ink-400 text-lg mb-12 text-center">
        Start free. Upgrade when you need more.
      </p>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex-1 rounded-3xl p-8 border ${
              plan.primary
                ? "bg-coral-500 text-white border-coral-500"
                : "bg-background text-foreground border-ink-200"
            }`}
          >
            <p className="font-body font-semibold text-sm uppercase tracking-widest opacity-70 mb-2">
              {plan.name}
            </p>
            <p className="font-display text-5xl font-semibold mb-1">
              {plan.price}
            </p>
            <p className={`font-body text-sm mb-6 ${plan.primary ? "text-white/70" : "text-ink-400"}`}>
              {plan.period}
            </p>
            <ul className="font-body text-sm flex flex-col gap-2 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className={plan.primary ? "text-white" : "text-coral-500"}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={`block text-center font-body font-semibold py-3 rounded-xl transition-colors ${
                plan.primary
                  ? "bg-white text-coral-500 hover:bg-coral-50"
                  : "bg-coral-500 text-white hover:bg-coral-600"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
