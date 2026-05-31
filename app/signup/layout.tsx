import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up Free — ColoringAI",
  description: "Create a free ColoringAI account and start generating custom coloring pages with AI. No credit card required.",
  robots: { index: true, follow: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
