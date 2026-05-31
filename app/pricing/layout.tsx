import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — ColoringAI",
  description: "Simple, honest pricing. Start free with 1 export per day. Buy credits or go unlimited for more.",
  robots: { index: true, follow: true },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
