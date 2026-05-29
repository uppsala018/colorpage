"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen px-6 py-12 max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <h1 className="font-display text-3xl font-semibold text-foreground">
            My pages
          </h1>
          <Link
            href="/create"
            className="bg-coral-500 hover:bg-coral-600 text-white font-body font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            + New page
          </Link>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="aspect-[3/4] rounded-2xl bg-ink-100 border border-ink-200 flex items-center justify-center">
            <p className="text-ink-400 text-sm font-body text-center px-4">
              Your first coloring page will appear here
            </p>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}
