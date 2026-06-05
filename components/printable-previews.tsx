export function PrintableSheetPreview({
  variant = "classroom",
  className = "",
}: {
  variant?: "classroom" | "bible" | "kids" | "adult";
  className?: string;
}) {
  const details = {
    classroom: {
      title: "Water Cycle",
      subject: "clouds, rain, hills and labels",
      accent: "#5dade2",
    },
    bible: {
      title: "Noah's Ark",
      subject: "ark, rainbow, animals and waves",
      accent: "#7d3c98",
    },
    kids: {
      title: "Happy Dinosaur",
      subject: "large shapes, stars and balloons",
      accent: "#4a8c3f",
    },
    adult: {
      title: "Floral Mandala",
      subject: "flowers, butterflies and fine patterns",
      accent: "#d4ac0d",
    },
  }[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-[8px] border border-ink-200 bg-white shadow-sm ${className}`}
      aria-label={`${details.title} printable preview`}
    >
      <div className="absolute left-0 right-0 top-0 h-2" style={{ backgroundColor: details.accent }} />
      <div className="aspect-[3/4] p-5">
        <div className="h-full rounded-[6px] border-2 border-ink-900/80 bg-white px-5 py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="h-2 w-20 rounded-full bg-ink-200" />
              <div className="mt-2 h-2 w-12 rounded-full bg-ink-100" />
            </div>
            <div className="h-12 w-12 rounded-full border-[3px] border-ink-900" />
          </div>

          {variant === "adult" ? <AdultLineArt /> : <ClassicLineArt variant={variant} />}

          <div className="mt-5 border-t border-ink-200 pt-3">
            <p className="font-display text-sm font-semibold text-foreground">{details.title}</p>
            <p className="mt-1 font-body text-[10px] leading-relaxed text-ink-600">{details.subject}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaintByNumbersSheetPreview({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[8px] border border-ink-200 bg-white shadow-sm ${className}`}
      aria-label="Paint by numbers printable preview"
    >
      <div className="aspect-[3/4] p-5">
        <div className="h-full rounded-[6px] border-2 border-ink-900/80 bg-white px-5 py-6">
          <svg viewBox="0 0 240 250" className="h-[70%] w-full" role="img" aria-label="Numbered regions">
            <path d="M12 18h216v76H12z" fill="#eef5fb" stroke="#1C1917" strokeWidth="3" />
            <text x="120" y="64" textAnchor="middle" className="fill-ink-600 text-[22px] font-bold">1</text>
            <path d="M12 94c50-28 91-22 124 5 29-26 60-27 92-7v140H12z" fill="#eef8ed" stroke="#1C1917" strokeWidth="3" />
            <text x="69" y="160" textAnchor="middle" className="fill-ink-600 text-[22px] font-bold">2</text>
            <text x="178" y="172" textAnchor="middle" className="fill-ink-600 text-[22px] font-bold">3</text>
            <circle cx="185" cy="50" r="26" fill="#fff3b0" stroke="#1C1917" strokeWidth="3" />
            <text x="185" y="58" textAnchor="middle" className="fill-ink-600 text-[16px] font-bold">4</text>
            <path d="M72 232v-74l49-39 49 39v74z" fill="#f6e7e3" stroke="#1C1917" strokeWidth="3" />
            <text x="121" y="200" textAnchor="middle" className="fill-ink-600 text-[18px] font-bold">10</text>
            <path d="M58 164l63-51 63 51" fill="none" stroke="#1C1917" strokeWidth="3" />
          </svg>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink-200 pt-4">
            {[
              ["1", "#eef5fb"],
              ["2", "#eef8ed"],
              ["3", "#dff1d8"],
              ["10", "#f6e7e3"],
            ].map(([number, color]) => (
              <div key={number} className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded border border-ink-300 font-body text-[10px] font-bold text-foreground"
                  style={{ backgroundColor: color }}
                >
                  {number}
                </span>
                <span className="font-body text-[10px] text-ink-600">Color {number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassicLineArt({ variant }: { variant: "classroom" | "bible" | "kids" }) {
  if (variant === "bible") {
    return (
      <svg viewBox="0 0 240 210" className="h-[68%] w-full" aria-hidden>
        <path d="M42 142c18 29 138 29 156 0H42z" fill="none" stroke="#1C1917" strokeWidth="5" strokeLinejoin="round" />
        <path d="M62 142V82l58-34 58 34v60" fill="none" stroke="#1C1917" strokeWidth="5" strokeLinejoin="round" />
        <path d="M74 82h92" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
        <path d="M26 57c20-32 58-42 94-14 36-28 74-18 94 14" fill="none" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
        <circle cx="78" cy="170" r="16" fill="none" stroke="#1C1917" strokeWidth="4" />
        <circle cx="162" cy="170" r="16" fill="none" stroke="#1C1917" strokeWidth="4" />
        <path d="M34 186c44 16 128 16 172 0" fill="none" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === "kids") {
    return (
      <svg viewBox="0 0 240 210" className="h-[68%] w-full" aria-hidden>
        <path d="M64 142c-24-24-12-72 31-82 50-12 88 18 81 68-5 38-39 58-80 52" fill="none" stroke="#1C1917" strokeWidth="5" strokeLinecap="round" />
        <circle cx="128" cy="96" r="6" fill="none" stroke="#1C1917" strokeWidth="4" />
        <path d="M84 80l-32-18M96 62 78 28M168 84l34-20M171 116l42 9" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
        <path d="M87 151c-12 11-22 20-38 20M109 169c-1 14-8 24-20 31M151 156c14 8 25 15 44 12" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
        <path d="M31 48l9 18 20 3-15 14 4 20-18-10-18 10 4-20L2 69l20-3z" fill="none" stroke="#1C1917" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 240 210" className="h-[68%] w-full" aria-hidden>
      <circle cx="190" cy="42" r="22" fill="none" stroke="#1C1917" strokeWidth="5" />
      <path d="M28 80c0-18 16-30 34-25 9-22 42-23 53 0 19-2 33 10 33 28" fill="none" stroke="#1C1917" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 178h160M54 178V111l57-36 57 36v67M91 178v-45h40v45M66 122h30M134 122h30" fill="none" stroke="#1C1917" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 178c20-36 41-48 63-34M149 151c20-23 39-25 63-4" fill="none" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function AdultLineArt() {
  return (
    <svg viewBox="0 0 240 210" className="h-[68%] w-full" aria-hidden>
      <circle cx="120" cy="104" r="56" fill="none" stroke="#1C1917" strokeWidth="4" />
      <circle cx="120" cy="104" r="26" fill="none" stroke="#1C1917" strokeWidth="3" />
      {Array.from({ length: 12 }).map((_, index) => {
        const angle = (index * Math.PI) / 6;
        const x1 = 120 + Math.cos(angle) * 34;
        const y1 = 104 + Math.sin(angle) * 34;
        const x2 = 120 + Math.cos(angle) * 82;
        const y2 = 104 + Math.sin(angle) * 82;
        return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" />;
      })}
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index * Math.PI) / 4;
        const cx = 120 + Math.cos(angle) * 80;
        const cy = 104 + Math.sin(angle) * 80;
        return <ellipse key={index} cx={cx} cy={cy} rx="12" ry="20" fill="none" stroke="#1C1917" strokeWidth="2.5" transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`} />;
      })}
      <path d="M46 36c28 8 40 21 41 43M194 36c-28 8-40 21-41 43M46 172c28-8 40-21 41-43M194 172c-28-8-40-21-41-43" fill="none" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
