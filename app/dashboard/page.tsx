"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

interface UserDoc {
  plan: "free" | "credits" | "unlimited";
  credits: number;
}

interface Generation {
  id: string;
  prompt: string;
  imageUrl: string;
  size: string;
  orientation: string;
}

function DashboardContent() {
  const { user } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const [userSnap, genSnap] = await Promise.all([
          getDoc(doc(db, "users", user!.uid)),
          getDocs(
            query(
              collection(db, "generations"),
              where("userId", "==", user!.uid),
              orderBy("createdAt", "desc"),
              limit(3)
            )
          ),
        ]);

        if (userSnap.exists()) {
          setUserDoc(userSnap.data() as UserDoc);
        }

        setGenerations(
          genSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Generation, "id">),
          }))
        );
      } finally {
        setDataLoading(false);
      }
    }

    fetchData();
  }, [user]);

  async function handleRedownload(generationId: string) {
    setDownloadingId(generationId);
    setDownloadError("");

    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ generationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "DAILY_LIMIT") {
          setDownloadError(
            "You've used your free export today. Upgrade for more."
          );
          return;
        }
        if (data.code === "NO_CREDITS") {
          setDownloadError("You're out of credits.");
          return;
        }
        throw new Error("Export failed");
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

  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "there";

  return (
    <main className="min-h-screen px-6 py-14 max-w-xl mx-auto">
      {/* Greeting */}
      <div className="mb-10">
        <p className="font-body text-ink-400 text-sm mb-1">Welcome back</p>
        <h1 className="font-display text-3xl font-semibold text-foreground capitalize">
          {displayName}
        </h1>
      </div>

      {/* Primary action */}
      <Link
        href="/create"
        className="block w-full bg-coral-500 hover:bg-coral-600 text-white font-body font-semibold text-lg py-4 rounded-2xl transition-colors text-center"
      >
        Create new coloring page
      </Link>

      {/* Plan info */}
      {!dataLoading && userDoc && (
        <p className="text-center font-body text-ink-400 text-sm mt-3 mb-12">
          {userDoc.plan === "free" && "Free plan · 1 free export/day"}
          {userDoc.plan === "credits" &&
            `${userDoc.credits ?? 0} credit${userDoc.credits === 1 ? "" : "s"} remaining`}
          {userDoc.plan === "unlimited" && "Unlimited plan"}
          {userDoc.plan !== "unlimited" && (
            <>
              {" · "}
              <Link href="/pricing" className="text-coral-500 hover:underline">
                Upgrade
              </Link>
            </>
          )}
        </p>
      )}
      {dataLoading && <div className="mb-12 mt-3 h-4" />}

      {/* Recent pages */}
      <section>
        <h2 className="font-display text-xl font-semibold text-foreground mb-5">
          Your recent pages
        </h2>

        {downloadError && (
          <p className="text-coral-500 text-sm font-body mb-4">
            {downloadError}{" "}
            <Link href="/pricing" className="underline font-medium">
              Upgrade →
            </Link>
          </p>
        )}

        {dataLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-ink-100 animate-pulse"
              />
            ))}
          </div>
        ) : generations.length === 0 ? (
          <div className="border border-ink-200 rounded-2xl px-6 py-12 text-center">
            <p className="font-body text-ink-400">
              Nothing yet.{" "}
              <Link href="/create" className="text-coral-500 hover:underline">
                Create your first page →
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {generations.map((g) => (
              <button
                key={g.id}
                onClick={() => handleRedownload(g.id)}
                disabled={downloadingId === g.id}
                title={`Download: ${g.prompt}`}
                className="group aspect-[3/4] rounded-2xl overflow-hidden border border-ink-200 bg-white relative focus:outline-none focus:ring-2 focus:ring-coral-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.imageUrl}
                  alt={g.prompt}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-end justify-center pb-3">
                  {downloadingId === g.id ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity font-body text-white text-xs font-medium bg-foreground/60 px-2 py-1 rounded-lg">
                      Download PDF
                    </span>
                  )}
                </div>
              </button>
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
