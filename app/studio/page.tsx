"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

// ── IndexedDB persistence via idb-keyval ────────────────────────────────────
const IDB_KEY = "studio-canvas-state";

async function saveToIdb(dataUrl: string) {
  const { set } = await import("idb-keyval");
  await set(IDB_KEY, dataUrl);
}

async function loadFromIdb(): Promise<string | undefined> {
  const { get } = await import("idb-keyval");
  return get(IDB_KEY);
}

// ── Paint-by-numbers config ─────────────────────────────────────────────────
const PALETTE = [
  { id: 1, label: "Sky",    color: "#87CEEB" },
  { id: 2, label: "L.Hill", color: "#90EE90" },
  { id: 3, label: "R.Hill", color: "#98FB98" },
  { id: 4, label: "House",  color: "#F4A460" },
  { id: 5, label: "Roof",   color: "#CD5C5C" },
  { id: 6, label: "Ground", color: "#7CFC00" },
];

type RegionState = { filled: boolean; animating: boolean; wrong: boolean };

// ── Types ────────────────────────────────────────────────────────────────────
type Mode = "draw" | "paint";

const MAX_HISTORY = 20;
const PEN_SUPPRESS_MS = 500;
const SAVE_DEBOUNCE_MS = 2000;

export default function StudioPage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // ── Drawing state (refs to avoid stale closures in event handlers) ──────
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const lastPenTime = useRef(0);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);

  // ── React state ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("draw");
  const [penActive, setPenActive] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [regions, setRegions] = useState<Record<number, RegionState>>(
    Object.fromEntries(PALETTE.map((p) => [p.id, { filled: false, animating: false, wrong: false }]))
  );
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);

  // ── Save debounce timer ────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      saveToIdb(canvas.toDataURL()).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // ── Canvas coordinate helper ───────────────────────────────────────────
  function getPos(e: PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  // ── History ────────────────────────────────────────────────────────────
  function pushHistory() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Truncate forward history
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }

  function undo() {
    const canvas = canvasRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    scheduleSave();
  }

  function redo() {
    const canvas = canvasRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    scheduleSave();
  }

  function reset() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pushHistory();
    scheduleSave();
    setRegions(Object.fromEntries(PALETTE.map((p) => [p.id, { filled: false, animating: false, wrong: false }])));
  }

  function saveAsPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "coloring-studio.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  // ── Canvas init + IDB restore ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }

    resize();

    // Restore from IDB
    loadFromIdb().then((saved) => {
      if (!saved || !canvas) return;
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
        pushHistory();
      };
      img.src = saved;
    }).catch(() => {});

    pushHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pointer event handlers ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;

    function isPalmRejected(e: PointerEvent): boolean {
      if (e.pointerType === "touch") {
        const now = Date.now();
        if (now - lastPenTime.current < PEN_SUPPRESS_MS) return true;
      }
      return false;
    }

    function onDown(e: PointerEvent) {
      if (isPalmRejected(e)) return;
      if (e.pointerType === "pen") lastPenTime.current = Date.now();
      setPenActive(e.pointerType === "pen");

      // Two-finger touch → pinch/pan, handled by CSS touch-action
      if (e.pointerType === "touch") return;

      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      pushHistory();
      drawing.current = true;
      lastPoint.current = getPos(e);

      const ctx = canvas.getContext("2d")!;
      ctx.beginPath();
      ctx.arc(lastPoint.current.x, lastPoint.current.y, strokeWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
    }

    function onMove(e: PointerEvent) {
      if (!drawing.current || e.pointerType === "touch") return;
      if (e.pointerType === "pen") lastPenTime.current = Date.now();
      e.preventDefault();

      const ctx = canvas.getContext("2d")!;
      const pos = getPos(e);
      const pressure = e.pressure > 0 ? e.pressure : 1;
      const width = strokeWidth * pressure;

      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(lastPoint.current!.x, lastPoint.current!.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPoint.current = pos;
    }

    function onUp(e: PointerEvent) {
      if (!drawing.current) return;
      drawing.current = false;
      lastPoint.current = null;
      if (e.pointerType !== "touch") scheduleSave();
    }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  // Deps intentionally include strokeColor and strokeWidth so handlers see current values
  }, [strokeColor, strokeWidth, scheduleSave]);

  // ── Paint-by-numbers region tap ────────────────────────────────────────
  function handleRegionTap(regionId: number) {
    if (!selectedColor) return;
    const correct = selectedColor === regionId;

    if (!correct) {
      setRegions((prev) => ({
        ...prev,
        [regionId]: { ...prev[regionId], wrong: true },
      }));
      setTimeout(() => {
        setRegions((prev) => ({
          ...prev,
          [regionId]: { ...prev[regionId], wrong: false },
        }));
      }, 600);
      return;
    }

    setRegions((prev) => ({
      ...prev,
      [regionId]: { filled: false, animating: true, wrong: false },
    }));
    setTimeout(() => {
      setRegions((prev) => ({
        ...prev,
        [regionId]: { filled: true, animating: false, wrong: false },
      }));
    }, 300);
  }

  const allDone = PALETTE.every((p) => regions[p.id]?.filled);

  // ── Toolbar buttons ────────────────────────────────────────────────────
  const toolbarBtn =
    "flex items-center justify-center h-12 min-w-[48px] px-3 rounded-xl font-body text-sm font-semibold transition-colors select-none";

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] overflow-hidden select-none">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] shrink-0">
        <Link href="/dashboard" className="font-body text-sm text-[#888] hover:text-white transition-colors">
          ← Back
        </Link>
        <span className="font-display text-sm text-white font-semibold tracking-wide">Studio</span>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-[#222] rounded-lg p-1">
          {(["draw", "paint"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md font-body text-xs font-semibold transition-colors ${
                mode === m ? "bg-coral-500 text-white" : "text-[#888] hover:text-white"
              }`}
            >
              {m === "draw" ? "Draw" : "Paint"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stylus indicator ─────────────────────────────────────────────── */}
      <div className="flex justify-center py-1 shrink-0">
        <span className="font-body text-xs text-[#666]">
          {penActive ? "✦ Stylus" : "✦ Touch"}
        </span>
      </div>

      {/* ── Canvas area ──────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Drawing canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            touchAction: mode === "draw" ? "none" : "pan-x pan-y pinch-zoom",
            display: mode === "draw" ? "block" : "none",
            background: "#fff",
          }}
        />

        {/* Paint-by-numbers overlay */}
        {mode === "paint" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2a2a2a]">
            <div className="relative" style={{ width: 340, height: 340 }}>
              {/* Base SVG */}
              <svg
                viewBox="0 0 400 400"
                width="340"
                height="340"
                style={{ position: "absolute", top: 0, left: 0 }}
              >
                {/* Region 1: Sky */}
                <path
                  onClick={() => handleRegionTap(1)}
                  d="M0,0 L400,0 L400,120 Q200,160 0,120 Z"
                  fill={
                    regions[1].wrong
                      ? "rgba(255,80,80,0.5)"
                      : regions[1].animating
                      ? "rgba(135,206,235,0.5)"
                      : regions[1].filled
                      ? "#87CEEB"
                      : "white"
                  }
                  stroke="#333"
                  strokeWidth="2"
                  style={{ cursor: "pointer", transition: "fill 300ms" }}
                />
                <text x="200" y="70" textAnchor="middle" fontSize="28" fill={regions[1].filled ? "transparent" : "#666"} fontFamily="sans-serif">1</text>
                {regions[1].filled && <text x="200" y="80" textAnchor="middle" fontSize="28" fill="#fff">✓</text>}

                {/* Region 2: Left hill */}
                <path
                  onClick={() => handleRegionTap(2)}
                  d="M0,120 Q50,80 120,100 Q80,180 0,200 Z"
                  fill={
                    regions[2].wrong ? "rgba(255,80,80,0.5)"
                    : regions[2].animating ? "rgba(144,238,144,0.5)"
                    : regions[2].filled ? "#90EE90" : "white"
                  }
                  stroke="#333" strokeWidth="2"
                  style={{ cursor: "pointer", transition: "fill 300ms" }}
                />
                <text x="55" y="155" textAnchor="middle" fontSize="24" fill={regions[2].filled ? "transparent" : "#666"} fontFamily="sans-serif">2</text>
                {regions[2].filled && <text x="55" y="162" textAnchor="middle" fontSize="20" fill="#fff">✓</text>}

                {/* Region 3: Right hill */}
                <path
                  onClick={() => handleRegionTap(3)}
                  d="M400,120 Q350,80 280,100 Q320,180 400,200 Z"
                  fill={
                    regions[3].wrong ? "rgba(255,80,80,0.5)"
                    : regions[3].animating ? "rgba(152,251,152,0.5)"
                    : regions[3].filled ? "#98FB98" : "white"
                  }
                  stroke="#333" strokeWidth="2"
                  style={{ cursor: "pointer", transition: "fill 300ms" }}
                />
                <text x="345" y="155" textAnchor="middle" fontSize="24" fill={regions[3].filled ? "transparent" : "#666"} fontFamily="sans-serif">3</text>
                {regions[3].filled && <text x="345" y="162" textAnchor="middle" fontSize="20" fill="#fff">✓</text>}

                {/* Region 4: House body */}
                <rect
                  onClick={() => handleRegionTap(4)}
                  x="140" y="200" width="120" height="100"
                  fill={
                    regions[4].wrong ? "rgba(255,80,80,0.5)"
                    : regions[4].animating ? "rgba(244,164,96,0.5)"
                    : regions[4].filled ? "#F4A460" : "white"
                  }
                  stroke="#333" strokeWidth="2"
                  style={{ cursor: "pointer", transition: "fill 300ms" }}
                />
                <text x="200" y="260" textAnchor="middle" fontSize="24" fill={regions[4].filled ? "transparent" : "#666"} fontFamily="sans-serif">4</text>
                {regions[4].filled && <text x="200" y="265" textAnchor="middle" fontSize="22" fill="#fff">✓</text>}

                {/* Region 5: Roof */}
                <polygon
                  onClick={() => handleRegionTap(5)}
                  points="120,200 200,130 280,200"
                  fill={
                    regions[5].wrong ? "rgba(255,80,80,0.5)"
                    : regions[5].animating ? "rgba(205,92,92,0.5)"
                    : regions[5].filled ? "#CD5C5C" : "white"
                  }
                  stroke="#333" strokeWidth="2"
                  style={{ cursor: "pointer", transition: "fill 300ms" }}
                />
                <text x="200" y="185" textAnchor="middle" fontSize="22" fill={regions[5].filled ? "transparent" : "#666"} fontFamily="sans-serif">5</text>
                {regions[5].filled && <text x="200" y="188" textAnchor="middle" fontSize="18" fill="#fff">✓</text>}

                {/* Region 6: Ground */}
                <path
                  onClick={() => handleRegionTap(6)}
                  d="M0,200 Q200,240 400,200 L400,400 L0,400 Z"
                  fill={
                    regions[6].wrong ? "rgba(255,80,80,0.5)"
                    : regions[6].animating ? "rgba(124,252,0,0.5)"
                    : regions[6].filled ? "#7CFC00" : "white"
                  }
                  stroke="#333" strokeWidth="2"
                  style={{ cursor: "pointer", transition: "fill 300ms" }}
                />
                <text x="200" y="340" textAnchor="middle" fontSize="28" fill={regions[6].filled ? "transparent" : "#666"} fontFamily="sans-serif">6</text>
                {regions[6].filled && <text x="200" y="345" textAnchor="middle" fontSize="26" fill="#fff">✓</text>}
              </svg>
            </div>
          </div>
        )}

        {/* All-done banner */}
        {mode === "paint" && allDone && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-[#1a1a1a]/90 rounded-3xl px-8 py-6 text-center">
              <p className="font-display text-3xl text-white mb-1">🎨 Complete!</p>
              <p className="font-body text-[#aaa] text-sm">All regions filled correctly</p>
            </div>
          </div>
        )}

        {/* Auth overlay */}
        {showAuthOverlay && (
          <div className="absolute inset-0 bg-[#1a1a1a]/80 flex items-center justify-center z-20 p-6">
            <div className="bg-[#222] rounded-3xl p-8 text-center max-w-xs w-full">
              <p className="font-display text-xl text-white mb-2">Save your progress</p>
              <p className="font-body text-[#888] text-sm mb-6">
                Sign in to save your artwork to the cloud.
              </p>
              <Link
                href="/login?returnTo=/studio"
                className="block w-full bg-coral-500 hover:bg-coral-600 text-white font-body font-semibold py-3 rounded-xl transition-colors"
              >
                Sign in
              </Link>
              <button
                onClick={() => setShowAuthOverlay(false)}
                className="mt-3 font-body text-sm text-[#666] hover:text-[#aaa] transition-colors"
              >
                Continue without saving
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Draw mode: stroke controls ────────────────────────────────────── */}
      {mode === "draw" && (
        <div className="flex items-center gap-3 px-4 py-2 bg-[#111] shrink-0 overflow-x-auto">
          {/* Color swatches */}
          {["#000000", "#E8614D", "#4a90d9", "#27ae60", "#f39c12", "#9b59b6", "#ffffff"].map((c) => (
            <button
              key={c}
              onClick={() => setStrokeColor(c)}
              style={{ background: c, borderColor: strokeColor === c ? "#fff" : "transparent" }}
              className="w-8 h-8 rounded-full border-2 shrink-0 transition-transform active:scale-90"
            />
          ))}
          {/* Stroke width */}
          <input
            type="range"
            min={1}
            max={24}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-24 shrink-0 accent-coral-500"
          />
          <span className="font-body text-xs text-[#666] shrink-0 w-6">{strokeWidth}</span>
        </div>
      )}

      {/* ── Paint mode: palette ───────────────────────────────────────────── */}
      {mode === "paint" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#111] shrink-0 overflow-x-auto">
          {PALETTE.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedColor(p.id)}
              style={{
                background: p.color,
                borderColor: selectedColor === p.id ? "#fff" : "transparent",
              }}
              className="flex flex-col items-center gap-0.5 border-2 rounded-xl p-1.5 shrink-0 transition-transform active:scale-90"
            >
              <span className="w-7 h-7 rounded-full block" style={{ background: p.color }} />
              <span className="font-body text-[10px] text-[#333] font-semibold leading-none">{p.id}</span>
            </button>
          ))}
          {selectedColor && (
            <span className="font-body text-xs text-[#aaa] ml-2 shrink-0">
              Tap region {selectedColor}
            </span>
          )}
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-t border-[#222] shrink-0 gap-2">
        <button onClick={undo} className={`${toolbarBtn} bg-[#222] text-white hover:bg-[#333]`}>
          Undo
        </button>
        <button onClick={redo} className={`${toolbarBtn} bg-[#222] text-white hover:bg-[#333]`}>
          Redo
        </button>
        <button onClick={reset} className={`${toolbarBtn} bg-[#222] text-[#f87171] hover:bg-[#332020]`}>
          Reset
        </button>
        <button
          onClick={() => {
            if (!user) { setShowAuthOverlay(true); return; }
            saveAsPng();
          }}
          className={`${toolbarBtn} bg-coral-500 text-white hover:bg-coral-600 flex-1`}
        >
          Save PNG
        </button>
      </div>
    </div>
  );
}
