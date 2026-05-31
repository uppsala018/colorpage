"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth, type UserDoc } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface Generation {
  id: string;
  prompt: string;
  imageUrl: string;
  size: string;
  orientation: string;
  type: string;
  createdAt: { toDate: () => Date } | null;
}

const AVATAR_COLORS = [
  "#E8614D", "#5dade2", "#4a8c3f", "#7d3c98", "#d4ac0d", "#117a65",
];

function avatarColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function formatDate(ts: { toDate: () => Date } | null): string {
  if (!ts) return "";
  try {
    return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function PlanBadge({ plan }: { plan: UserDoc["plan"] }) {
  const styles: Record<UserDoc["plan"], string> = {
    free: "bg-ink-100 text-ink-600",
    credits: "bg-blue-50 text-blue-700",
    unlimited: "bg-coral-50 text-coral-600",
  };
  const labels: Record<UserDoc["plan"], string> = {
    free: "Free",
    credits: "Credits",
    unlimited: "Unlimited",
  };
  return (
    <span className={`font-body text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${styles[plan]}`}>
      {labels[plan]}
    </span>
  );
}

function PlanSummary({ userDoc }: { userDoc: UserDoc }) {
  const today = new Date().toISOString().split("T")[0];
  const usedToday = userDoc.lastExportDate === today ? (userDoc.freeExportsToday ?? 0) : 0;

  if (userDoc.plan === "unlimited") {
    return <span className="font-body text-sm text-ink-400">Unlimited exports</span>;
  }
  if (userDoc.plan === "credits") {
    return (
      <span className="font-body text-sm text-ink-400">
        {userDoc.credits ?? 0} credit{userDoc.credits === 1 ? "" : "s"} remaining
      </span>
    );
  }
  return (
    <span className="font-body text-sm text-ink-400">
      {usedToday}/1 free export today
    </span>
  );
}

function DashboardContent() {
  const { user, userDoc } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!user || !db) { setDataLoading(false); return; }

    async function fetchGenerations() {
      try {
        const snap = await getDocs(
          query(
            collection(db!, "generations"),
            where("userId", "==", user!.uid),
            orderBy("createdAt", "desc"),
            limit(20)
          )
        );
        setGenerations(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Generation, "id">),
          }))
        );
      } finally {
        setDataLoading(false);
      }
    }

    fetchGenerations();
  }, [user]);

  async function handleDownload(generationId: string) {
    setDownloadingId(generationId);
    setDownloadError("");
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ generationId }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.code === "DAILY_LIMIT") { setDownloadError("You've used your free export today."); return; }
        if (data.code === "NO_CREDITS") { setDownloadError("You're out of credits."); return; }
        throw new Error();
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "coloring-page.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(generationId: string) {
    if (!db) return;
    setDeletingId(generationId);
    try {
      await deleteDoc(doc(db, "generations", generationId));
      setGenerations((prev) => prev.filter((g) => g.id !== generationId));
    } catch {
      // silent — card remains visible
    } finally {
      setDeletingId(null);
    }
  }

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "";
  const bgColor = user ? avatarColor(user.uid) : "#E8614D";
  const initial = (user?.displayName ?? user?.email ?? "?")[0].toUpperCase();

  return (
    <main className="min-h-screen px-4 py-10 max-w-4xl mx-auto">

      {/* ── User info card ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 mb-10">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold font-body shrink-0"
          style={{ backgroundColor: bgColor }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-0.5">
            <h1 className="font-display text-2xl font-semibold text-foreground capitalize truncate">
              {displayName}
            </h1>
            {userDoc && <PlanBadge plan={userDoc.plan} />}
          </div>
          <p className="font-body text-sm text-ink-400 truncate mb-1">{user?.email}</p>
          {userDoc && <PlanSummary userDoc={userDoc} />}
          {userDoc && userDoc.plan !== "unlimited" && (
            <Link href="/pricing" className="font-body text-xs text-coral-500 hover:underline mt-0.5 inline-block">
              Upgrade →
            </Link>
          )}
        </div>
      </div>

      {/* ── Primary CTA ────────────────────────────────────────────────── */}
      <Link
        href="/create"
        className="block w-full bg-coral-500 hover:bg-coral-600 text-white font-body font-semibold text-lg py-4 rounded-2xl transition-colors text-center mb-10"
      >
        Create new coloring page
      </Link>

      {/* ── Pages grid ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xl font-semibold text-foreground mb-5">
          My coloring pages
        </h2>

        {downloadError && (
          <p className="text-coral-500 text-sm font-body mb-4">
            {downloadError}{" "}
            <Link href="/pricing" className="underline font-medium">Upgrade →</Link>
          </p>
        )}

        {dataLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl bg-ink-100 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : generations.length === 0 ? (
          <div className="border border-ink-200 rounded-2xl px-6 py-14 text-center">
            <p className="font-body text-ink-400 mb-2">No pages yet.</p>
            <Link href="/create" className="font-body text-coral-500 hover:underline font-medium">
              Create your first one →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {generations.map((g) => (
              <div
                key={g.id}
                className="border border-ink-200 rounded-2xl overflow-hidden bg-white flex flex-col"
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-ink-100 relative">
                  <Image
                    src={g.imageUrl}
                    alt={g.prompt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  {/* Type badge */}
                  <span className="absolute top-2 left-2 font-body text-xs font-semibold bg-white/90 text-ink-600 px-2 py-0.5 rounded-full">
                    {g.type === "paint_by_numbers" ? "PBN" : "Coloring"}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3 flex-1 flex flex-col gap-1">
                  <p className="font-body text-xs text-foreground line-clamp-2 leading-relaxed">
                    {g.prompt}
                  </p>
                  <p className="font-body text-xs text-ink-400 mt-auto">
                    {formatDate(g.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex border-t border-ink-100">
                  <button
                    onClick={() => handleDownload(g.id)}
                    disabled={downloadingId === g.id || deletingId === g.id}
                    className="flex-1 py-2.5 font-body text-xs font-semibold text-coral-500 hover:bg-coral-50 disabled:opacity-40 transition-colors"
                  >
                    {downloadingId === g.id ? "…" : "Download PDF"}
                  </button>
                  <div className="w-px bg-ink-100" />
                  <button
                    onClick={() => handleDelete(g.id)}
                    disabled={deletingId === g.id || downloadingId === g.id}
                    className="px-3 py-2.5 font-body text-xs text-ink-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                    aria-label="Delete"
                  >
                    {deletingId === g.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
