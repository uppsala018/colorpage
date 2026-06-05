"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OutputType = "coloring_page" | "paint_by_numbers";
type Difficulty = "easy" | "medium" | "hard";

export function HomePromptLauncher() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("a friendly dinosaur in a flower garden");
  const [type, setType] = useState<OutputType>("coloring_page");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (prompt.trim()) params.set("prompt", prompt.trim());
    params.set("type", type);
    params.set("difficulty", difficulty);
    router.push(`/create?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className="mt-8 w-full max-w-2xl rounded-[8px] border border-ink-200 bg-white/95 p-3 shadow-sm backdrop-blur"
    >
      <label htmlFor="home-prompt" className="sr-only">
        Coloring page prompt
      </label>
      <textarea
        id="home-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={2}
        className="block w-full resize-none rounded-[6px] border border-ink-200 bg-background px-4 py-3 font-body text-base text-foreground outline-none transition focus:border-coral-500 focus:ring-2 focus:ring-coral-100"
      />
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="grid grid-cols-2 gap-2 md:w-[280px]">
          <button
            type="button"
            onClick={() => setType("coloring_page")}
            className={`rounded-[6px] border px-3 py-2 font-body text-sm font-semibold transition-colors ${
              type === "coloring_page"
                ? "border-coral-500 bg-coral-50 text-coral-600"
                : "border-ink-200 text-ink-600 hover:border-ink-400"
            }`}
          >
            Coloring
          </button>
          <button
            type="button"
            onClick={() => setType("paint_by_numbers")}
            className={`rounded-[6px] border px-3 py-2 font-body text-sm font-semibold transition-colors ${
              type === "paint_by_numbers"
                ? "border-coral-500 bg-coral-50 text-coral-600"
                : "border-ink-200 text-ink-600 hover:border-ink-400"
            }`}
          >
            Numbers
          </button>
        </div>
        <select
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value as Difficulty)}
          className="rounded-[6px] border border-ink-200 bg-background px-3 py-2 font-body text-sm font-semibold text-ink-600 outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-100 md:w-[140px]"
        >
          <option value="easy">{type === "paint_by_numbers" ? "Easy" : "Children"}</option>
          <option value="medium">{type === "paint_by_numbers" ? "Medium" : "Teen"}</option>
          <option value="hard">{type === "paint_by_numbers" ? "Hard" : "Adults"}</option>
        </select>
        <button
          type="submit"
          className="rounded-[6px] bg-coral-500 px-5 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-coral-600 md:ml-auto"
        >
          Create printable
        </button>
      </div>
    </form>
  );
}
