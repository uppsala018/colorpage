"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface Plan {
  name: string;
  badge?: string;
  price: string;
  unit: string;
  per: string;
  features: string[];
  limit: string;
  highlighted: boolean;
  cta:
    | { type: "link"; label: string; href: string }
    | { type: "checkout"; label: string; plan: "credits" | "unlimited" };
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "0",
    unit: "$",
    per: "forever",
    limit: "1 export / day",
    features: [
      "1 export per day",
      "Watermark on downloads",
      "High-res PDF",
      "Standard resolution",
    ],
    highlighted: false,
    cta: { type: "link", label: "Get started free", href: "/signup" },
  },
  {
    name: "Credits",
    price: "4.99",
    unit: "$",
    per: "for 10 exports",
    limit: "10 exports",
    features: [
      "10 exports, use anytime",
      "No watermark",
      "High-res PDF (300 DPI)",
      "Credits never expire",
    ],
    highlighted: false,
    cta: { type: "checkout", label: "Buy credits", plan: "credits" },
  },
  {
    name: "Unlimited",
    badge: "Recommended",
    price: "9.99",
    unit: "$",
    per: "per month",
    limit: "Unlimited",
    features: [
      "Unlimited exports",
      "No watermark",
      "High-res PDF (300 DPI)",
      "Priority generation",
      "Cancel anytime",
    ],
    highlighted: true,
    cta: { type: "checkout", label: "Go unlimited", plan: "unlimited" },
  },
];

export default function PricingPage() {
  const [showLimitBanner, setShowLimitBanner] = useState(false);

  useEffect(() => {
    setShowLimitBanner(new URLSearchParams(window.location.search).get("reason") === "anon-limit");
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <h1 className="font-display text-5xl font-semibold text-foreground mb-3 text-center">
        Simple, honest pricing
      </h1>
      <p className="font-body text-ink-400 text-lg mb-14 text-center">
        Start free. Only pay when you need more.
      </p>

      {showLimitBanner && (
        <div className="w-full max-w-3xl mb-8 rounded-2xl border border-coral-200 bg-coral-50 px-5 py-4">
          <p className="font-body text-sm font-semibold text-foreground mb-1">
            You used your free anonymous pages.
          </p>
          <p className="font-body text-sm text-ink-600">
            Create an account with email or Google, then choose Free, Credits, or Unlimited to keep creating and save your pages.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/signup?returnTo=/pricing" className="font-body text-sm font-semibold bg-coral-500 text-white px-4 py-2 rounded-xl hover:bg-coral-600">
              Sign up
            </Link>
            <Link href="/login?returnTo=/pricing" className="font-body text-sm font-semibold border border-ink-200 px-4 py-2 rounded-xl hover:border-ink-400">
              Log in
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl items-start">
        {plans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </div>

      <p className="mt-10 font-body text-ink-400 text-sm text-center">
        Secure payment via Stripe
      </p>
    </main>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout(plan: "credits" | "unlimited") {
    setError("");

    if (!user) {
      router.push("/login?returnTo=/pricing");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Checkout failed");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-3xl border p-7 flex flex-col relative ${
        plan.highlighted
          ? "border-coral-500 shadow-md"
          : "border-ink-200"
      } bg-background`}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-coral-500 text-white font-body text-xs font-semibold px-3 py-1 rounded-full">
          {plan.badge}
        </span>
      )}

      <p className="font-body text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3">
        {plan.name}
      </p>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="font-body text-lg text-foreground">{plan.unit}</span>
        <span className="font-display text-4xl font-semibold text-foreground">
          {plan.price}
        </span>
      </div>
      <p className="font-body text-sm text-ink-400 mb-6">{plan.per}</p>

      <ul className="flex flex-col gap-2.5 mb-8 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 font-body text-sm text-foreground">
            <CheckIcon className="text-coral-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {error && (
        <p className="text-coral-500 text-xs font-body mb-3">{error}</p>
      )}

      {plan.cta.type === "link" ? (
        <Link
          href={plan.cta.href}
          className="block text-center font-body font-semibold py-3 rounded-xl transition-colors bg-coral-500 text-white hover:bg-coral-600"
        >
          {plan.cta.label}
        </Link>
      ) : (
        <button
          onClick={() =>
            handleCheckout((plan.cta as { plan: "credits" | "unlimited" }).plan)
          }
          disabled={loading}
          className="w-full font-body font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 bg-coral-500 text-white hover:bg-coral-600"
        >
          {loading ? "Redirecting…" : plan.cta.label}
        </button>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12.5 3.5 L5.5 11.5 L2.5 8.5" />
    </svg>
  );
}
