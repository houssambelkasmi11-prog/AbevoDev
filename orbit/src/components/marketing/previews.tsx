import { OrbitGlyph, OrbitPulse, OrbitSymbol } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Faithful, scaled representations of real ORBIT workspace screens, used on
 * the public site. They are illustrations of the UI — not live data.
 */

function Frame({ children, title, className }: { children: React.ReactNode; title: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/10 bg-[#f6f5f2] text-[#111214] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]", className)}>
      <div className="flex h-9 items-center gap-2 border-b border-[#dddcd7] bg-white px-3">
        <OrbitSymbol className="h-3.5 w-3.5" strokeWidth={2} />
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#777b80]">{title}</span>
        <span className="ml-auto flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#dddcd7]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#dddcd7]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#dddcd7]" />
        </span>
      </div>
      {children}
    </div>
  );
}

const tiny = "font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#777b80]";

export function NotesPreview() {
  return (
    <Frame title="Notes / Thermodynamics">
      <div className="grid grid-cols-[1fr_150px] text-[11px]">
        <div className="p-5">
          <p className={tiny}>Physics · Edited just now</p>
          <h4 className="mt-2 font-display text-[22px] font-bold leading-none tracking-tight">Entropy &amp; the arrow of time</h4>
          <p className="mt-3 leading-relaxed text-[#3a3c40]">
            The second law states that the total entropy of an isolated system never decreases:
          </p>
          <p className="my-2 text-center font-serif text-[15px] italic">ΔS ≥ 0</p>
          <p className="leading-relaxed text-[#3a3c40]">
            <span className="rounded bg-[#dbe8f2] px-0.5">Boltzmann connected entropy to the number of microstates</span>, S = k ln W
            <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 animate-pulse bg-[#111214]" />
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#dddcd7] bg-white px-2 py-1 shadow-sm">
            {["Explain", "Simplify", "Flashcards", "Ask ATLAS"].map((a) => (
              <span key={a} className="rounded px-1.5 py-0.5 text-[9.5px] text-[#3a3c40] first:bg-[#111214] first:text-white">
                {a}
              </span>
            ))}
          </div>
        </div>
        <div className="border-l border-[#dddcd7] bg-white p-3">
          <p className={tiny}>ATLAS · explain</p>
          <div className="mt-2 space-y-1.5">
            <div className="h-1.5 w-full rounded bg-[#ebeae6]" />
            <div className="h-1.5 w-11/12 rounded bg-[#ebeae6]" />
            <div className="h-1.5 w-10/12 rounded bg-[#ebeae6]" />
            <div className="h-1.5 w-8/12 rounded bg-[#ebeae6]" />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[#777b80]">
            <OrbitPulse className="h-3.5 w-3.5 text-[#111214]" />
            <span className="text-[9px]">Streaming…</span>
          </div>
          <p className={cn(tiny, "mt-4")}>Backlinks</p>
          <p className="mt-1 text-[10px]">Statistical mechanics</p>
          <p className="text-[10px]">Lecture 7 — Heat engines</p>
        </div>
      </div>
    </Frame>
  );
}

export function LibraryPreview() {
  const rows = [
    { t: "Lecture 07 — Heat Engines.pdf", k: "PDF · 42 pages", s: "Indexed" },
    { t: "Organic Chemistry Ch. 4.docx", k: "DOCX · 18 sections", s: "Indexed" },
    { t: "The French Revolution — lecture", k: "YouTube · transcript", s: "Indexed" },
    { t: "Problem set 3 (scan).jpg", k: "Image · text extraction", s: "Processing" },
  ];
  return (
    <Frame title="Lessons & Sources">
      <div className="p-4 text-[11px]">
        <div className="flex items-center justify-center rounded-xl border border-dashed border-[#c9c8c2] py-4 text-[#777b80]">Drop PDFs, DOCX, images, links</div>
        <div className="mt-3 divide-y divide-[#dddcd7] rounded-xl border border-[#dddcd7] bg-white">
          {rows.map((r) => (
            <div key={r.t} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#dddcd7] font-mono text-[8px]">{r.k.split(" ")[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.t}</span>
                <span className="text-[9.5px] text-[#777b80]">{r.k}</span>
              </span>
              {r.s === "Processing" ? (
                <span className="flex items-center gap-1.5 text-[9.5px] text-[#777b80]">
                  <OrbitPulse className="h-3.5 w-3.5 text-[#111214]" /> 64%
                </span>
              ) : (
                <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#2f6b4a]">{r.s}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-[#dddcd7] bg-white p-3">
          <p className={tiny}>Grounded answer</p>
          <p className="mt-1.5 leading-relaxed">
            A Carnot engine is the most efficient cycle between two reservoirs <span className="rounded border border-[#111214] px-1 font-mono text-[8px]">S1 · p.12</span>
          </p>
        </div>
      </div>
    </Frame>
  );
}

export function PersonasPreview() {
  const ps = [
    ["ATLAS", "The Mentor"],
    ["NOVA", "The Creative Thinker"],
    ["AXIOM", "The Analyst"],
    ["SOCRATES", "The Challenger"],
    ["ECHO", "The Memory Coach"],
    ["PULSE", "The Productivity Coach"],
  ];
  return (
    <Frame title="AI Studio / Personalities">
      <div className="grid grid-cols-3 gap-2 p-4">
        {ps.map(([n, r], i) => (
          <div key={n} className={cn("rounded-xl border p-3", i === 2 ? "border-[#111214] bg-[#111214] text-white" : "border-[#dddcd7] bg-white")}>
            <OrbitGlyph variant={i} className="h-7 w-7" />
            <p className="mt-3 font-display text-[13px] font-bold tracking-[0.12em]">{n}</p>
            <p className={cn("text-[9.5px]", i === 2 ? "text-white/60" : "text-[#777b80]")}>{r}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function HomeworkPreview() {
  const stages = ["Input", "Analysis", "Sources", "Generation", "Review", "Export"];
  return (
    <Frame title="Homework Studio / Essay — causes of WWI">
      <div className="p-4 text-[11px]">
        <div className="flex items-center gap-1">
          {stages.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-1">
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[8px]", i < 3 ? "border-[#111214] bg-[#111214] text-white" : i === 3 ? "border-[#111214]" : "border-[#c9c8c2] text-[#a3a6aa]")}>
                {i < 3 ? "✓" : i + 1}
              </span>
              {i < stages.length - 1 ? <span className={cn("h-px flex-1", i < 3 ? "bg-[#111214]" : "bg-[#dddcd7]")} /> : null}
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between">
          {stages.map((s) => (
            <span key={s} className="font-mono text-[7px] uppercase tracking-[0.1em] text-[#777b80]">
              {s}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[#111214] bg-white p-3">
            <span className="rounded-full border border-[#111214] px-1.5 font-mono text-[7.5px] uppercase tracking-[0.12em]">Your work</span>
            <p className="mt-2 leading-relaxed text-[#3a3c40]">The assassination in Sarajevo was the spark, but the alliance system…</p>
          </div>
          <div className="rounded-xl border border-dashed border-[#c9c8c2] bg-[#ebeae6]/50 p-3">
            <span className="rounded-full border border-dashed border-[#a3a6aa] px-1.5 font-mono text-[7.5px] uppercase tracking-[0.12em] text-[#777b80]">AI suggestion</span>
            <p className="mt-2 leading-relaxed text-[#777b80]">Consider naming the 1914 July Crisis explicitly and citing your lecture notes.</p>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          {["Outline 3 arguments", "Find 2 primary sources", "Draft introduction"].map((t, i) => (
            <div key={t} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5">
              <span className={cn("h-3 w-3 rounded border", i === 0 ? "border-[#111214] bg-[#111214]" : "border-[#c9c8c2]")} />
              <span className={i === 0 ? "text-[#a3a6aa] line-through" : ""}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function UniversePreview() {
  const clusters = [
    { x: 90, y: 80, n: "Physics" },
    { x: 250, y: 60, n: "Mathematics" },
    { x: 330, y: 170, n: "Computer Science" },
    { x: 120, y: 200, n: "Literature" },
  ];
  return (
    <Frame title="My Universe">
      <svg viewBox="0 0 420 270" className="block w-full bg-[#f6f5f2]">
        <defs>
          <pattern id="mg" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#111214" strokeOpacity="0.05" />
          </pattern>
        </defs>
        <rect width="420" height="270" fill="url(#mg)" />
        <g stroke="#111214" strokeOpacity="0.25" strokeWidth="0.8">
          <line x1="90" y1="80" x2="250" y2="60" />
          <line x1="250" y1="60" x2="330" y2="170" strokeDasharray="3 3" />
          <line x1="90" y1="80" x2="120" y2="200" />
          <line x1="120" y1="200" x2="330" y2="170" strokeDasharray="3 3" />
        </g>
        {clusters.map((c, ci) => (
          <g key={c.n}>
            <circle cx={c.x} cy={c.y} r="34" fill="none" stroke="#111214" strokeOpacity="0.2" />
            <circle cx={c.x} cy={c.y} r="5" fill="#111214" />
            {Array.from({ length: 6 }, (_, i) => {
              const a = (i / 6) * Math.PI * 2 + ci;
              const x = c.x + Math.cos(a) * 34;
              const y = c.y + Math.sin(a) * 34;
              return (
                <g key={i}>
                  <line x1={c.x} y1={c.y} x2={x} y2={y} stroke="#111214" strokeOpacity="0.12" />
                  <circle cx={x} cy={y} r="2.6" fill="#fff" stroke="#111214" strokeWidth="0.8" />
                </g>
              );
            })}
            <text x={c.x} y={c.y + 50} textAnchor="middle" fontFamily="monospace" fontSize="7" letterSpacing="1.2" fill="#777b80">
              {c.n.toUpperCase()}
            </text>
          </g>
        ))}
        <g transform="translate(270 228)">
          <rect width="138" height="32" rx="8" fill="#fff" stroke="#111214" strokeOpacity="0.15" />
          <text x="10" y="13" fontFamily="monospace" fontSize="6.5" letterSpacing="1" fill="#777b80">
            AI SUGGESTED · PREREQUISITE
          </text>
          <text x="10" y="24" fontSize="8" fill="#111214">
            Linear algebra → Machine learning
          </text>
        </g>
      </svg>
    </Frame>
  );
}

export function ModelsPreview() {
  const providers = [
    { n: "OpenAI", s: "Connected", k: "sk-…9F2x" },
    { n: "Anthropic", s: "Connected", k: "sk-…41Qa" },
    { n: "Google Gemini", s: "Not connected", k: null },
    { n: "OpenRouter", s: "Not connected", k: null },
  ];
  return (
    <Frame title="Settings / Your intelligence. Your choice.">
      <div className="grid grid-cols-2 gap-2 p-4 text-[11px]">
        {providers.map((p) => (
          <div key={p.n} className="rounded-xl border border-[#dddcd7] bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-[13px] font-bold">{p.n}</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", p.k ? "bg-[#2f6b4a]" : "bg-[#c9c8c2]")} />
            </div>
            <p className={cn(tiny, "mt-2")}>{p.s}</p>
            <p className="mt-1 font-mono text-[10px] text-[#3a3c40]">{p.k ?? "Add API key"}</p>
          </div>
        ))}
        <div className="col-span-2 rounded-xl border border-[#dddcd7] bg-white p-3">
          <p className={tiny}>Persona routing</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
            <span>ATLAS → OpenAI</span>
            <span>AXIOM → Anthropic</span>
            <span className="text-[#a3a6aa]">NOVA → choose…</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}
