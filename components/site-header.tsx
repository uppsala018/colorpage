"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { siteConfig } from "@/lib/site-config";

const AVATAR_COLORS = [
  "#E8614D",
  "#5dade2",
  "#4a8c3f",
  "#7d3c98",
  "#d4ac0d",
  "#117a65",
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
  if (plan === "unlimited") return "Unlimited";
  if (plan === "credits") return `${credits} credits`;
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
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-xl font-semibold text-coral-500">
          {siteConfig.name}
        </Link>

        <nav className="hidden items-center gap-1 font-body text-sm lg:flex">
          {[
            { href: "/create", label: "Create" },
            { href: "/teacher", label: "Teachers" },
            { href: "/sunday-school", label: "Sunday School" },
            { href: "/adult-coloring-pages", label: "Adults" },
            { href: "/pricing", label: "Pricing" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-ink-600 transition-colors hover:bg-ink-100 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-ink-100" />
          ) : user ? (
            <>
              {badge && (
                <Link
                  href="/pricing"
                  className="hidden rounded-full border border-ink-200 bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 sm:block"
                >
                  {badge}
                </Link>
              )}

              <div className="relative" ref={ref}>
                <button
                  onClick={() => setOpen((o) => !o)}
                  aria-label="Open user menu"
                  aria-expanded={open}
                  className="flex h-8 w-8 items-center justify-center rounded-full font-body text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-500 focus:ring-offset-2"
                  style={{ backgroundColor: bgColor }}
                >
                  {initial}
                </button>

                {open && (
                  <div className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xl">
                    <div className="border-b border-ink-100 px-4 py-3">
                      <p className="truncate font-body text-xs text-ink-400">
                        {user.email}
                      </p>
                      {badge && (
                        <p className="mt-0.5 font-body text-xs font-semibold text-foreground sm:hidden">
                          {badge}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center px-4 py-2.5 font-body text-sm text-foreground transition-colors hover:bg-ink-100"
                    >
                      My pages
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setOpen(false)}
                      className="flex items-center px-4 py-2.5 font-body text-sm text-foreground transition-colors hover:bg-ink-100"
                    >
                      Account
                    </Link>
                    <div className="border-t border-ink-100">
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2.5 text-left font-body text-sm text-ink-400 transition-colors hover:bg-ink-100 hover:text-foreground"
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
                className="rounded-lg px-3 py-2 font-body text-sm text-ink-600 transition-colors hover:bg-ink-100 hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-coral-500 px-4 py-2 font-body text-sm font-semibold text-white shadow-sm transition-all hover:bg-coral-600 hover:shadow-md"
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
