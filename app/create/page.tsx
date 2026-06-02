"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Difficulty, PaletteItem } from "@/lib/palette";

type Step = "prompt" | "loading" | "result";
type OutputType = "coloring_page" | "paint_by_numbers";
type Size = "a5" | "a4" | "a3";
type Orientation = "portrait" | "landscape";

// ── Templates ──────────────────────────────────────────────────────────────

interface TemplateItem {
  name: string;
  icon: string;
  prompt: string;
}

interface TemplateCategory {
  title: string;
  items: TemplateItem[];
}

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    title: "Animals",
    items: [
      { name: "Farm animals",   icon: "🐄", prompt: "Cute farm animals, cow sheep chicken pig" },
      { name: "Jungle animals", icon: "🦁", prompt: "Jungle animals, lion elephant giraffe" },
      { name: "Ocean animals",  icon: "🐋", prompt: "Ocean animals, whale fish octopus" },
    ],
  },
  {
    title: "Bible & Sunday School",
    items: [
      { name: "Noah's Ark",      icon: "🚢", prompt: "Noah's ark with animals" },
      { name: "Jesus & children", icon: "✝️", prompt: "Jesus with children" },
      { name: "Nativity scene",  icon: "⭐", prompt: "Nativity scene, baby Jesus manger" },
    ],
  },
  {
    title: "Nature & Seasons",
    items: [
      { name: "Spring flowers",  icon: "🌸", prompt: "Spring flowers, tulips daisies butterflies" },
      { name: "Christmas tree",  icon: "🎄", prompt: "Christmas tree with ornaments and snow" },
      { name: "Viking ship",     icon: "⛵", prompt: "Viking ship on a Nordic fjord" },
    ],
  },
  {
    title: "Alphabet & Learning",
    items: [
      { name: "Swedish ABC",   icon: "🔤", prompt: "Swedish alphabet letters A B C" },
      { name: "Numbers 1–10", icon: "🔢", prompt: "Numbers 1 to 10 with objects" },
    ],
  },
];

const PENDING_KEY = "pendingDownload";

export default function CreatePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [step, setStep] = useState<Step>("prompt");
  const [prompt, setPrompt] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [outputType, setOutputType] = useState<OutputType>("coloring_page");
  const [size, setSize] = useState<Size>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [generationId, setGenerationId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [colorPalette, setColorPalette] = useState<PaletteItem[]>([]);
  const [generateError, setGenerateError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Elapsed timer — counts up while generating
  useEffect(() => {
    if (step !== "loading") {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [step]);

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
      setDifficulty(saved.difficulty ?? "medium");
      setColorPalette(saved.colorPalette ?? []);
      setStep("result");
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
    }
  }, [authLoading, user]);

  // Core generate logic — accepts prompt string so templates can call it directly
  async function runGenerate(promptText: string) {
    const trimmed = promptText.trim();
    if (!trimmed) return;

    setGenerateError("");
    setStep("loading");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) headers["Authorization"] = `Bearer ${await user.getIdToken()}`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: trimmed, type: outputType, size, orientation, difficulty }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      setImageUrl(data.imageUrl);
      setGenerationId(data.id ?? null);
      setColorPalette(data.colorPalette ?? []);
      setStep("result");
    } catch {
      setGenerateError("Generation failed. Please try again.");
      setStep("prompt");
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    await runGenerate(prompt);
  }

  function handleTemplateClick(templatePrompt: string) {
    setPrompt(templatePrompt);
    runGenerate(templatePrompt);
  }

  async function fetchPdf(): Promise<Blob> {
    const token = await user!.getIdToken();

    let gId = generationId;
    if (!gId) {
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: prompt.trim(), type: outputType, size, orientation, difficulty }),
      });
      if (!genRes.ok) throw new Error("Generation failed");
      const genData = await genRes.json();
      gId = genData.id ?? null;
      if (genData.imageUrl) setImageUrl(genData.imageUrl);
      if (gId) setGenerationId(gId);
      if (genData.colorPalette) setColorPalette(genData.colorPalette);
    }

    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ prompt, imageUrl, generationId, outputType, size, orientation, difficulty, colorPalette }));
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
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 3000);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "DAILY_LIMIT") setDownloadError("You've used your free export today. Upgrade for more.");
      else if (code === "NO_CREDITS") setDownloadError("You're out of credits. Buy more to continue.");
      else setDownloadError("Download failed. Please try again.");
    } finally {
      setDownloadLoading(false);
    }
  }

  async function handlePrint() {
    setDownloadError("");
    if (!user) {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ prompt, imageUrl, generationId, outputType, size, orientation, difficulty, colorPalette }));
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
      if (code === "DAILY_LIMIT") setDownloadError("You've used your free export today. Upgrade for more.");
      else if (code === "NO_CREDITS") setDownloadError("You're out of credits. Buy more to continue.");
      else setDownloadError("Failed to open PDF. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  }

  function handleCreateAnother() {
    setStep("prompt");
    setGenerationId(null);
    setImageUrl("");
    setColorPalette([]);
    setDownloadError("");
    setDownloadDone(false);
    setGenerateError("");
    setPrompt("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (step === "loading") {
    const timerMsg =
      elapsed < 5
        ? "This usually takes 15–30 seconds"
        : elapsed < 25
        ? `${elapsed}s — almost there…`
        : `${elapsed}s — still working, hang tight…`;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-full border-4 border-ink-200 border-t-coral-500 animate-spin" />
        <p className="font-body text-foreground text-lg font-medium">
          {outputType === "paint_by_numbers"
            ? "Creating your paint by numbers page…"
            : "Creating your coloring page…"}
        </p>
        <p className="font-body text-ink-400 text-sm">{timerMsg}</p>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────
  if (step === "result") {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="w-full bg-white border border-ink-200 rounded-3xl overflow-hidden mb-6 shadow-sm">
            <div className="relative w-full aspect-[3/4]">
              <Image
                src={imageUrl}
                alt="Your generated coloring page"
                fill
                className="object-contain"
                sizes="(max-width: 512px) 100vw, 512px"
                priority
              />
            </div>
          </div>

          {outputType === "paint_by_numbers" && colorPalette.length > 0 && (
            <div className="mb-6 p-4 bg-white border border-ink-200 rounded-2xl">
              <p className="font-body text-sm font-semibold text-foreground mb-3">
                Color guide and instructions
              </p>
              <p className="font-body text-xs text-ink-500 mb-4 leading-relaxed">
                Match each number on the page with the same numbered color below, then fill every outlined area.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {colorPalette.map((item) => (
                  <div key={item.number} className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-md border border-ink-200 shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: item.hex,
                        color: isLightColor(item.hex) ? "#1a1a1a" : "#ffffff",
                      }}
                    >
                      {item.number}
                    </div>
                    <span className="font-body text-xs text-ink-600 truncate">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={downloadLoading || downloadDone}
            className={`w-full disabled:opacity-70 text-white font-body font-semibold text-lg py-4 rounded-2xl transition-colors mb-3 ${
              downloadDone
                ? "bg-green-600"
                : "bg-coral-500 hover:bg-coral-600"
            }`}
          >
            {downloadDone ? "Downloaded ✓" : downloadLoading ? "Preparing PDF…" : "Download PDF"}
          </button>

          {downloadError && (
            <p role="alert" className="text-coral-500 text-sm font-body text-center mb-4">
              {downloadError}{" "}
              <Link href="/pricing" className="underline font-medium">Upgrade →</Link>
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
            <span className="text-ink-200" aria-hidden>·</span>
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
    <main className="min-h-screen px-4 py-12 flex flex-col items-center">
      <div className="w-full max-w-xl">
        <h1 className="font-display text-4xl font-semibold text-foreground mb-2 text-center">
          What should I draw?
        </h1>
        <p className="font-body text-ink-400 text-center mb-8">
          Pick a template or describe what you want to color.
        </p>

        {/* ── Templates section ────────────────────────────────────────── */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setTemplatesOpen((o) => !o)}
            className="flex items-center gap-2 font-body text-sm font-semibold text-foreground hover:text-coral-500 transition-colors mb-4"
          >
            <span>Start with a template</span>
            <span className="text-xs text-ink-400" aria-hidden>
              {templatesOpen ? "▲" : "▾"}
            </span>
          </button>

          {templatesOpen && (
            <div className="space-y-5">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <div key={cat.title}>
                  <p className="font-body text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2.5">
                    {cat.title}
                  </p>
                  {/* Horizontally scrollable row, bleeds to screen edge on mobile */}
                  <div className="overflow-x-auto -mx-4 px-4">
                    <div className="flex gap-3 pb-1" style={{ width: "max-content" }}>
                      {cat.items.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleTemplateClick(item.prompt)}
                          className="flex flex-col items-center gap-2 w-28 shrink-0 px-3 py-4 rounded-2xl border border-ink-200 bg-white hover:border-coral-400 hover:bg-coral-50 active:scale-95 transition-all text-center focus:outline-none focus:ring-2 focus:ring-coral-500"
                        >
                          <span className="text-2xl leading-none" aria-hidden>
                            {item.icon}
                          </span>
                          <span className="font-body text-xs text-ink-600 leading-tight">
                            {item.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-ink-200" />
          <span className="font-body text-xs text-ink-400">or write your own</span>
          <div className="flex-1 h-px bg-ink-200" />
        </div>

        {/* ── Prompt form ──────────────────────────────────────────────── */}
        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to color..."
            rows={4}
            className="w-full border border-ink-200 rounded-2xl px-4 py-3 font-body text-foreground bg-background resize-none focus:outline-none focus:ring-2 focus:ring-coral-500 text-lg"
          />

          {/* Options toggle */}
          <button
            type="button"
            onClick={() => setOptionsOpen((o) => !o)}
            className="flex items-center gap-1.5 font-body text-sm text-ink-400 hover:text-foreground self-start transition-colors"
          >
            <span aria-hidden>⚙</span>
            <span>Options</span>
            <span className="text-xs" aria-hidden>{optionsOpen ? "▲" : "▾"}</span>
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
                  <ToggleBtn key={val} active={outputType === val} onClick={() => setOutputType(val)}>
                    {label}
                  </ToggleBtn>
                ))}
              </OptionRow>

              {/* Difficulty (only for paint by numbers) */}
              {outputType === "paint_by_numbers" && (
                <OptionRow label="Difficulty">
                  {(
                    [
                      ["easy", "Easy (6 colors)"],
                      ["medium", "Medium (12)"],
                      ["hard", "Hard (24)"],
                    ] as [Difficulty, string][]
                  ).map(([val, label]) => (
                    <ToggleBtn key={val} active={difficulty === val} onClick={() => setDifficulty(val)}>
                      {label}
                    </ToggleBtn>
                  ))}
                </OptionRow>
              )}

              {/* Size */}
              <OptionRow label="Size">
                {(["a5", "a4", "a3"] as Size[]).map((s) => (
                  <ToggleBtn key={s} active={size === s} onClick={() => setSize(s)}>
                    {s.toUpperCase()}
                  </ToggleBtn>
                ))}
              </OptionRow>

              {/* Orientation */}
              <OptionRow label="Orientation">
                {(["portrait", "landscape"] as Orientation[]).map((o) => (
                  <ToggleBtn key={o} active={orientation === o} onClick={() => setOrientation(o)}>
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

// ── Helpers ────────────────────────────────────────────────────────────────

function isLightColor(hex: string): boolean {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-body text-sm text-ink-400 w-28 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-body text-sm px-3 py-2.5 rounded-lg border transition-colors ${
        active
          ? "bg-coral-500 text-white border-coral-500"
          : "text-ink-600 border-ink-200 hover:border-ink-400 bg-background"
      }`}
    >
      {children}
    </button>
  );
}
