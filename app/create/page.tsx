"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Step = "prompt" | "loading" | "result";
type OutputType = "coloring_page" | "paint_by_numbers";
type Size = "a5" | "a4" | "a3";
type Orientation = "portrait" | "landscape";

const EXAMPLES = [
  "Noah's Ark",
  "Viking ship",
  "Farm animals",
  "Swedish alphabet",
  "Christmas nativity",
  "Cute dinosaurs",
];

const PENDING_KEY = "pendingDownload";

export default function CreatePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [step, setStep] = useState<Step>("prompt");
  const [prompt, setPrompt] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [outputType, setOutputType] = useState<OutputType>("coloring_page");
  const [size, setSize] = useState<Size>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  const [generationId, setGenerationId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Restore state after returning from login redirect
  useEffect(() => {
    if (authLoading) return;
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw || !user) return;

    try {
      const saved = JSON.parse(raw);
      sessionStorage.removeItem(PENDING_KEY);
      setPrompt(saved.prompt ?? "");
      setImageUrl(saved.imageUrl ?? "");
      setGenerationId(saved.generationId ?? null);
      setOutputType(saved.outputType ?? "coloring_page");
      setSize(saved.size ?? "a4");
      setOrientation(saved.orientation ?? "portrait");
      setStep("result");
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
    }
  }, [authLoading, user]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setGenerateError("");
    setStep("loading");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (user) {
        headers["Authorization"] = `Bearer ${await user.getIdToken()}`;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: prompt.trim(),
          type: outputType,
          size,
          orientation,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      setImageUrl(data.imageUrl);
      setGenerationId(data.id ?? null);
      setStep("result");
    } catch {
      setGenerateError("Generation failed. Please try again.");
      setStep("prompt");
    }
  }

  async function fetchPdf(): Promise<Blob> {
    const token = await user!.getIdToken();

    let gId = generationId;
    if (!gId) {
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          type: outputType,
          size,
          orientation,
        }),
      });
      if (!genRes.ok) throw new Error("Generation failed");
      const genData = await genRes.json();
      gId = genData.id ?? null;
      if (genData.imageUrl) setImageUrl(genData.imageUrl);
      if (gId) setGenerationId(gId);
    }

    const res = await fetch("/api/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ generationId: gId }),
    });

    if (!res.ok) {
      const data = await res.json();
      const err = new Error("Export failed") as Error & { code?: string };
      err.code = data.code;
      throw err;
    }

    return res.blob();
  }

  async function handleDownload() {
    setDownloadError("");

    if (!user) {
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ prompt, imageUrl, generationId, outputType, size, orientation })
      );
      router.push("/login?returnTo=/create");
      return;
    }

    setDownloadLoading(true);
    try {
      const blob = await fetchPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "coloring-page.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "DAILY_LIMIT") {
        setDownloadError("You've used your free export today. Upgrade for more.");
      } else if (code === "NO_CREDITS") {
        setDownloadError("You're out of credits. Buy more to continue.");
      } else {
        setDownloadError("Download failed. Please try again.");
      }
    } finally {
      setDownloadLoading(false);
    }
  }

  async function handlePrint() {
    setDownloadError("");

    if (!user) {
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ prompt, imageUrl, generationId, outputType, size, orientation })
      );
      router.push("/login?returnTo=/create");
      return;
    }

    setPrintLoading(true);
    try {
      const blob = await fetchPdf();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 15_000);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "DAILY_LIMIT") {
        setDownloadError("You've used your free export today. Upgrade for more.");
      } else if (code === "NO_CREDITS") {
        setDownloadError("You're out of credits. Buy more to continue.");
      } else {
        setDownloadError("Failed to open PDF. Please try again.");
      }
    } finally {
      setPrintLoading(false);
    }
  }

  function handleCreateAnother() {
    setStep("prompt");
    setGenerationId(null);
    setImageUrl("");
    setDownloadError("");
    setGenerateError("");
    setPrompt("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-14 h-14 rounded-full border-4 border-ink-200 border-t-coral-500 animate-spin" />
        <p className="font-body text-ink-400 text-lg">
          Creating your coloring page…
        </p>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────
  if (step === "result") {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="w-full bg-white border border-ink-200 rounded-3xl overflow-hidden mb-6 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Your generated coloring page"
              className="w-full object-contain"
            />
          </div>

          <button
            onClick={handleDownload}
            disabled={downloadLoading}
            className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white font-body font-semibold text-lg py-4 rounded-2xl transition-colors mb-3"
          >
            {downloadLoading ? "Preparing PDF…" : "Download PDF"}
          </button>

          {downloadError && (
            <p
              role="alert"
              className="text-coral-500 text-sm font-body text-center mb-4"
            >
              {downloadError}{" "}
              <Link
                href="/pricing"
                className="underline font-medium"
              >
                Upgrade →
              </Link>
            </p>
          )}

          <div className="flex items-center justify-center gap-6 mt-1">
            <button
              onClick={handlePrint}
              disabled={printLoading}
              className="font-body text-sm text-ink-400 hover:text-foreground disabled:opacity-50 transition-colors underline"
            >
              {printLoading ? "Opening…" : "Print"}
            </button>
            <span className="text-ink-200" aria-hidden>
              ·
            </span>
            <button
              onClick={handleCreateAnother}
              className="font-body text-sm text-ink-400 hover:text-foreground transition-colors underline"
            >
              Create another
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Prompt ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <h1 className="font-display text-4xl font-semibold text-foreground mb-2 text-center">
          What should I draw?
        </h1>
        <p className="font-body text-ink-400 text-center mb-8">
          Describe what you want to color.
        </p>

        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to color..."
            rows={5}
            className="w-full border border-ink-200 rounded-2xl px-4 py-3 font-body text-foreground bg-background resize-none focus:outline-none focus:ring-2 focus:ring-coral-500 text-lg"
          />

          {/* Example chips */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setPrompt(ex);
                  textareaRef.current?.focus();
                }}
                className="font-body text-sm text-ink-600 border border-ink-200 hover:border-coral-400 hover:text-coral-500 px-3 py-1.5 rounded-full transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Options toggle */}
          <button
            type="button"
            onClick={() => setOptionsOpen((o) => !o)}
            className="flex items-center gap-1.5 font-body text-sm text-ink-400 hover:text-foreground self-start transition-colors"
          >
            <span aria-hidden>⚙</span>
            <span>Options</span>
            <span className="text-xs" aria-hidden>
              {optionsOpen ? "▲" : "▾"}
            </span>
          </button>

          {optionsOpen && (
            <div className="border border-ink-200 rounded-2xl p-5 flex flex-col gap-5">
              {/* Output type */}
              <OptionRow label="Output type">
                {(
                  [
                    ["coloring_page", "Coloring Page"],
                    ["paint_by_numbers", "Paint by Numbers"],
                  ] as [OutputType, string][]
                ).map(([val, label]) => (
                  <ToggleBtn
                    key={val}
                    active={outputType === val}
                    onClick={() => setOutputType(val)}
                  >
                    {label}
                  </ToggleBtn>
                ))}
              </OptionRow>

              {/* Size */}
              <OptionRow label="Size">
                {(["a5", "a4", "a3"] as Size[]).map((s) => (
                  <ToggleBtn
                    key={s}
                    active={size === s}
                    onClick={() => setSize(s)}
                  >
                    {s.toUpperCase()}
                  </ToggleBtn>
                ))}
              </OptionRow>

              {/* Orientation */}
              <OptionRow label="Orientation">
                {(["portrait", "landscape"] as Orientation[]).map((o) => (
                  <ToggleBtn
                    key={o}
                    active={orientation === o}
                    onClick={() => setOrientation(o)}
                  >
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </ToggleBtn>
                ))}
              </OptionRow>
            </div>
          )}

          {generateError && (
            <p role="alert" className="text-coral-500 text-sm font-body">
              {generateError}
            </p>
          )}

          <button
            type="submit"
            disabled={!prompt.trim()}
            className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-40 text-white font-body font-semibold text-lg py-4 rounded-2xl transition-colors"
          >
            Generate →
          </button>
        </form>
      </div>
    </main>
  );
}

function OptionRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-body text-sm text-ink-400 w-28 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-body text-sm px-3 py-1.5 rounded-lg border transition-colors ${
        active
          ? "bg-coral-500 text-white border-coral-500"
          : "text-ink-600 border-ink-200 hover:border-ink-400 bg-background"
      }`}
    >
      {children}
    </button>
  );
}
