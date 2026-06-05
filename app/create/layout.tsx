import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Printable Coloring Page",
  description:
    "Generate a custom coloring page or paint by numbers printable. Pick a template or describe your own scene, then print or download as PDF.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/create" },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
