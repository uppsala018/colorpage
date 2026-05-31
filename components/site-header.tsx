"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const AVATAR_COLORS = [
  "#E8614D", "#5dade2", "#4a8c3f", "#7d3c98", "#d4ac0d", "#117a65",
];

function avatarColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function creditsBadgeText(
  plan: "free" | "credits" | "unlimited",
  credits: number
): string {
  if (plan === "unlimited") return "∞ Unlimited";
  if (plan === "credits") return `⚡ ${credits} credits`;
  return "1 free/day";
}

export function SiteHeader() {
  const { user, loading, userDoc, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push("/");
  }

  const initial = (user?.displayName ?? user?.email ?? "?")[0].toUpperCase();
  const bgColor = user ? avatarColor(user.uid) : "#E8614D";
  const badge = userDoc
    ? creditsBadgeText(userDoc.plan, userDoc.credits ?? 0)
    : null;

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-ink-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-display text-xl font-semibold text-coral-500">
          ColoringAI
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-ink-100 animate-pulse" />
          ) : user ? (
            <>
              {/* Credits badge — desktop only; mobile sees it in dropdown */}
              {badge && (
                <Link
                  href="/pricing"
                  className="hidden sm:block font-body text-sm text-ink-600 bg-ink-100 hover:bg-ink-200 px-3 py-1.5 rounded-full transition-colors"
                >
                  {badge}
                </Link>
              )}

              {/* Avatar + dropdown */}
              <div className="relative" ref={ref}>
                <button
                  onClick={() => setOpen((o) => !o)}
                  aria-label="Open user menu"
                  aria-expanded={open}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold font-body focus:outline-none focus:ring-2 focus:ring-coral-500 focus:ring-offset-2"
                  style={{ backgroundColor: bgColor }}
                >
                  {initial}
                </button>

                {open && (
                  <div className="absolute right-0 top-10 w-52 bg-white border border-ink-200 rounded-2xl shadow-lg py-1.5 z-50">
                    {/* Email + credits (mobile) */}
                    <div className="px-4 py-2.5 border-b border-ink-100 mb-1">
                      <p className="font-body text-xs text-ink-400 truncate">
                        {user.email}
                      </p>
                      {badge && (
                        <p className="font-body text-xs font-semibold text-foreground mt-0.5 sm:hidden">
                          {badge}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2.5 font-body text-sm text-foreground hover:bg-ink-100 transition-colors"
                    >
                      My pages
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2.5 font-body text-sm text-foreground hover:bg-ink-100 transition-colors"
                    >
                      Account
                    </Link>
                    <div className="border-t border-ink-100 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2.5 font-body text-sm text-ink-400 hover:text-foreground hover:bg-ink-100 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-body text-sm text-ink-600 hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="font-body text-sm font-semibold text-white bg-coral-500 hover:bg-coral-600 px-4 py-2 rounded-xl transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
