"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";

function CreateForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("Generation failed");
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <h1 className="font-display text-4xl font-semibold text-foreground mb-2 text-center">
          What should I draw?
        </h1>
        <p className="font-body text-ink-400 text-center mb-8">
          Describe a scene, character, animal, or pattern.
        </p>

        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A friendly dragon reading a book under a tree…"
            required
            rows={4}
            className="w-full border border-ink-200 rounded-2xl px-4 py-3 font-body text-foreground bg-background resize-none focus:outline-none focus:ring-2 focus:ring-coral-500 text-lg"
          />
          {error && (
            <p role="alert" className="text-coral-500 text-sm font-body">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || prompt.trim().length === 0}
            className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white font-body font-semibold text-lg py-4 rounded-2xl transition-colors"
          >
            {loading ? "Generating…" : "Generate coloring page"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function CreatePage() {
  return (
    <RequireAuth>
      <CreateForm />
    </RequireAuth>
  );
}
