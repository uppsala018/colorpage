import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Coloring Page — ColoringAI",
  description: "Generate a custom coloring page or paint by numbers with AI. Pick a template or describe your own scene.",
  robots: { index: true, follow: true },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
