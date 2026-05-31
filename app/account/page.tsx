"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, type UserDoc } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";

const AVATAR_COLORS = [
  "#E8614D", "#5dade2", "#4a8c3f", "#7d3c98", "#d4ac0d", "#117a65",
];

function avatarColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function PlanDetails({ userDoc }: { userDoc: UserDoc }) {
  const today = new Date().toISOString().split("T")[0];
  const usedToday = userDoc.lastExportDate === today ? (userDoc.freeExportsToday ?? 0) : 0;

  if (userDoc.plan === "unlimited") {
    return (
      <div className="space-y-1">
        <p className="font-body text-sm font-semibold text-foreground">Unlimited plan</p>
        <p className="font-body text-sm text-ink-400">Unlimited PDF exports, priority generation.</p>
      </div>
    );
  }

  if (userDoc.plan === "credits") {
    return (
      <div className="space-y-1">
        <p className="font-body text-sm font-semibold text-foreground">
          {userDoc.credits ?? 0} credit{userDoc.credits === 1 ? "" : "s"} remaining
        </p>
        <p className="font-body text-sm text-ink-400">
          Each export uses 1 credit. Credits never expire.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="font-body text-sm font-semibold text-foreground">
        Free plan · {usedToday}/1 export used today
      </p>
      <p className="font-body text-sm text-ink-400">
        1 free PDF export per day, with watermark.
      </p>
    </div>
  );
}

function AccountContent() {
  const router = useRouter();
  const { user, userDoc, signOut } = useAuth();

  const bgColor = user ? avatarColor(user.uid) : "#E8614D";
  const initial = (user?.displayName ?? user?.email ?? "?")[0].toUpperCase();
  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "";

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const planLabel: Record<UserDoc["plan"], string> = {
    free: "Free",
    credits: "Credits",
    unlimited: "Unlimited",
  };
  const planBadgeStyle: Record<UserDoc["plan"], string> = {
    free: "bg-ink-100 text-ink-600",
    credits: "bg-blue-50 text-blue-700",
    unlimited: "bg-coral-50 text-coral-600",
  };

  return (
    <main className="min-h-screen px-4 py-10 max-w-lg mx-auto">
      <h1 className="font-display text-3xl font-semibold text-foreground mb-8">
        Account
      </h1>

      {/* ── Profile section ────────────────────────────────────────────── */}
      <section className="border border-ink-200 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold font-body shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-body font-semibold text-foreground truncate capitalize">
              {displayName}
            </p>
            <p className="font-body text-sm text-ink-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Plan badge + details */}
        <div className="flex items-start gap-3">
          {userDoc && (
            <span className={`font-body text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${planBadgeStyle[userDoc.plan]}`}>
              {planLabel[userDoc.plan]}
            </span>
          )}
          {userDoc ? (
            <PlanDetails userDoc={userDoc} />
          ) : (
            <div className="h-4 w-40 bg-ink-100 rounded animate-pulse" />
          )}
        </div>
      </section>

      {/* ── Upgrade CTAs ───────────────────────────────────────────────── */}
      {(!userDoc || userDoc.plan !== "unlimited") && (
        <section className="border border-ink-200 rounded-2xl p-6 mb-4">
          <p className="font-body text-sm font-semibold text-foreground mb-4">
            Upgrade your plan
          </p>
          <div className="flex flex-col gap-3">
            {(!userDoc || userDoc.plan === "free") && (
              <Link
                href="/pricing"
                className="flex items-center justify-between border border-ink-200 hover:border-coral-400 rounded-xl px-4 py-3 transition-colors group"
              >
                <div>
                  <p className="font-body text-sm font-semibold text-foreground">
                    Buy credits
                  </p>
                  <p className="font-body text-xs text-ink-400">
                    $4.99 for 10 exports — no subscription
                  </p>
                </div>
                <span className="font-body text-sm text-coral-500 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </Link>
            )}
            <Link
              href="/pricing"
              className="flex items-center justify-between bg-coral-500 hover:bg-coral-600 rounded-xl px-4 py-3 transition-colors group"
            >
              <div>
                <p className="font-body text-sm font-semibold text-white">
                  Go Unlimited
                </p>
                <p className="font-body text-xs text-white/70">
                  $9.99/month — unlimited exports, no watermark
                </p>
              </div>
              <span className="font-body text-sm text-white group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* ── Sign out ───────────────────────────────────────────────────── */}
      <section className="border border-ink-200 rounded-2xl p-6">
        <p className="font-body text-xs text-ink-400 uppercase tracking-wider mb-4">
          Danger zone
        </p>
        <button
          onClick={handleSignOut}
          className="font-body text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
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
