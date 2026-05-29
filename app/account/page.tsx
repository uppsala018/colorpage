"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";

function AccountContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
      <h1 className="font-display text-4xl font-semibold text-foreground mb-8">
        Account
      </h1>

      <section className="border border-ink-200 rounded-2xl p-6 mb-4">
        <p className="font-body text-ink-400 text-sm mb-1">Signed in as</p>
        <p className="font-body font-medium text-foreground mb-4 truncate">
          {user?.email}
        </p>
        <p className="font-body text-ink-400 text-sm mb-1">Current plan</p>
        <p className="font-body font-semibold text-foreground text-lg mb-4">Free</p>
        <Link
          href="/pricing"
          className="inline-block bg-coral-500 hover:bg-coral-600 text-white font-body font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          Upgrade to Pro
        </Link>
      </section>

      <section className="border border-ink-200 rounded-2xl p-6">
        <p className="font-body text-ink-400 text-sm mb-4">Danger zone</p>
        <button
          onClick={handleSignOut}
          className="font-body text-ink-600 hover:text-foreground underline text-sm transition-colors"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}
