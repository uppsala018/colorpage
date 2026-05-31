import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In — ColoringAI",
  description: "Sign in to your ColoringAI account to download and manage your coloring pages.",
  robots: { index: true, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
