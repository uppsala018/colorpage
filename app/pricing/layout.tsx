import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple Color Printables pricing. Start free with 1 export per day, buy credits, or go unlimited for more printable coloring pages.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
