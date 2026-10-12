"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { OrbitGlyph, OrbitSymbol } from "@/components/brand/logo";
import { BUILTIN_PERSONAS } from "@/lib/ai/personas";
import { PROVIDER_FACTS } from "@/lib/ai/provider-facts";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/client/gsap";
import { usePrefersReducedMotion } from "@/lib/client/hooks";
import { cn } from "@/lib/utils";
import { HomeworkPreview, LibraryPreview, ModelsPreview, NotesPreview, PersonasPreview, UniversePreview } from "./previews";
import { Magnetic } from "./magnetic";

/* ───────────────────────── Shared bits ───────────────────────── */

export function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
      <span className="text-warm">{index}</span>
      <span className="h-px w-10 bg-white/15" />
      <span>{children}</span>
    </div>
  );
}

function OrbitDiagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <g fill="none" stroke="#c9cdd1">
        <circle cx="200" cy="200" r="180" strokeOpacity="0.1" />
        <circle cx="200" cy="200" r="130" strokeOpacity="0.16" strokeDasharray="2 5" />
        <g style={{ transformOrigin: "200px 200px", animation: "orbit-spin 60s linear infinite" }}>
          <ellipse cx="200" cy="200" rx="170" ry="70" transform="rotate(32 200 200)" strokeOpacity="0.55" />
          <circle cx="344" cy="290" r="4" fill="#f5f3ef" stroke="none" />
        </g>
        <g style={{ transformOrigin: "200px 200px", animation: "orbit-spin-rev 90s linear infinite" }}>
          <ellipse cx="200" cy="200" rx="170" ry="70" transform="rotate(-32 200 200)" strokeOpacity="0.35" />
          <circle cx="56" cy="290" r="3" fill="#c9cdd1" stroke="none" />
        </g>
        <line x1="10" y1="200" x2="390" y2="200" strokeOpacity="0.08" />
        <line x1="200" y1="10" x2="200" y2="390" strokeOpacity="0.08" />
      </g>
      <circle cx="200" cy="200" r="7" fill="#f5f3ef" />
      <g fontFamily="var(--font-mono)" fontSize="8" letterSpacing="1.6" fill="#858a91">
        <text x="214" y="194">00 / YOU</text>
        <text x="300" y="120">NOTES</text>
        <text x="40" y="128">LESSONS</text>
        <text x="60" y="320">QUESTIONS</text>
        <text x="290" y="330">IDEAS</text>
      </g>
    </svg>
  );
}

/* ───────────────────── A — Introduction ───────────────────── */

export function IntroSection() {
  const root = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const copy =
    "Your notes, your lessons, your questions, your ideas. Connected by intelligence that helps you understand more, remember longer, and create better.";

  useGSAP(
    () => {
      if (reduced) return;
      const words = gsap.utils.toArray<HTMLElement>("[data-reveal-word]", root.current);
      gsap.fromTo(
        words,
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.04,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top 70%", end: "bottom 65%", scrub: true },
        },
      );
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <section ref={root} id="platform" aria-labelledby="intro-h" className="relative bg-void px-5 py-28 text-warm md:px-10 md:py-40">
      <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <SectionLabel index="A">The introduction</SectionLabel>
          <h2 id="intro-h" className="display mt-10 text-[clamp(3rem,8vw,7.5rem)]">
            A second mind.
            <span className="serif-accent block font-normal text-silver">Built for yours.</span>
          </h2>
          <p className="mt-12 max-w-2xl text-[clamp(1.25rem,2.2vw,1.85rem)] leading-[1.35] tracking-tight">
            {copy.split(" ").map((w, i) => (
              <span key={i} data-reveal-word className="inline-block">
                {w}&nbsp;
              </span>
            ))}
          </p>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[520px]">
          <OrbitDiagram className="h-full w-full" />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── B — Everything in one universe ───────────────────── */

const FEATURES = [
  {
    key: "notes",
    title: "Intelligent Notes",
    headline: "Write. Then understand.",
    copy: "A focused editor with math, tables, code and checklists — and contextual AI that explains, simplifies or quizzes you without ever overwriting your words.",
    cta: "Start a note",
    Preview: NotesPreview,
  },
  {
    key: "library",
    title: "Lesson Library",
    headline: "Every source, indexed.",
    copy: "PDFs, DOCX, slides-turned-text, web pages and lecture transcripts — extracted, structured with page references and searchable by meaning.",
    cta: "Upload a lesson",
    Preview: LibraryPreview,
  },
  {
    key: "personas",
    title: "AI Personalities",
    headline: "Six ways to be taught.",
    copy: "ATLAS explains. SOCRATES questions. AXIOM proves. Each personality is a real behaviour configuration — and you can design your own.",
    cta: "Meet the network",
    Preview: PersonasPreview,
  },
  {
    key: "homework",
    title: "Homework Studio",
    headline: "From prompt to plan.",
    copy: "Turn an assignment into requirements, sources, steps and a schedule. Your work and AI suggestions stay visibly separate — you stay in control.",
    cta: "Open the studio",
    Preview: HomeworkPreview,
  },
  {
    key: "universe",
    title: "Knowledge Orbit",
    headline: "See what you know.",
    copy: "Subjects become orbital clusters; notes, lessons and conversations become stars. AI proposes connections — you approve what becomes real.",
    cta: "Explore your universe",
    Preview: UniversePreview,
  },
  {
    key: "models",
    title: "AI Model Freedom",
    headline: "Bring your own intelligence.",
    copy: "Connect OpenAI, Anthropic, Google Gemini, OpenRouter or an OpenAI-compatible endpoint. Keys are encrypted server-side. Route each persona to the model you trust.",
    cta: "Compare models",
    Preview: ModelsPreview,
  },
] as const;

export function FeatureStage() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>("[data-feature]", root.current);
      items.forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        });
      });
    },
    { scope: root },
  );

  const ActivePreview = FEATURES[active].Preview;

  return (
    <section ref={root} id="system" aria-labelledby="system-h" className="relative bg-void px-5 pb-24 text-warm md:px-10 md:pb-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="border-t border-white/10 pt-16">
          <SectionLabel index="B">Everything in one universe</SectionLabel>
          <h2 id="system-h" className="display mt-8 max-w-4xl text-[clamp(2.6rem,6vw,5.5rem)]">
            Six instruments.
            <span className="serif-accent block font-normal text-silver">One system of thought.</span>
          </h2>
        </div>

        <div className="mt-20 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <ol className="flex flex-col">
            {FEATURES.map((f, i) => {
              const P = f.Preview;
              return (
                <li key={f.key} data-feature className="flex min-h-[46vh] flex-col justify-center border-t border-white/10 py-12 lg:min-h-[70vh]">
                  <div className="flex items-baseline gap-5">
                    <span className={cn("font-mono text-[11px] transition-colors duration-500", active === i ? "text-warm" : "text-muted")}>
                      {String(i + 1).padStart(2, "0")} / 06
                    </span>
                    <span className="label text-muted">{f.title}</span>
                  </div>
                  <h3 className={cn("display mt-6 text-[clamp(2rem,4.2vw,3.75rem)] transition-opacity duration-700", active === i || reduced ? "opacity-100" : "opacity-35")}>
                    {f.headline}
                  </h3>
                  <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-silver">{f.copy}</p>
                  <Link href="/sign-up" className="group mt-7 inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-warm">
                    {f.cta}
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <div className="mt-10 lg:hidden">
                    <P />
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="hidden lg:block">
            <div className="sticky top-[14vh] flex h-[72vh] items-center">
              <div className="relative w-full">
                <div className="absolute -inset-10 rounded-[40px] bg-[radial-gradient(ellipse_at_center,rgba(219,232,242,0.08),transparent_70%)]" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 24, scale: 0.98, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -16, scale: 0.985, filter: "blur(4px)" }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative"
                  >
                    <ActivePreview />
                  </motion.div>
                </AnimatePresence>
                <div className="mt-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  <span>{FEATURES[active].title}</span>
                  <span className="flex gap-1.5">
                    {FEATURES.map((f, i) => (
                      <span key={f.key} className={cn("h-px w-6 transition-colors duration-500", i === active ? "bg-warm" : "bg-white/15")} />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── C — How ORBIT works ───────────────────── */

const STAGES = [
  { n: "01", t: "Capture", d: "Upload or create your knowledge — notes, PDFs, documents, links, lecture transcripts.", detail: ["Rich notes", "Drag-and-drop uploads", "Page-aware extraction"] },
  { n: "02", t: "Connect", d: "ORBIT understands and organises related information — chunked, indexed and linked into your universe.", detail: ["Semantic + keyword retrieval", "Backlinks & relationships", "AI-suggested connections"] },
  { n: "03", t: "Expand", d: "Use specialised AI assistants to learn, practise and produce work — grounded in your own sources.", detail: ["Cited answers", "Quizzes & flashcards", "Homework workflows"] },
];

export function HowItWorks({ standalone = false }: { standalone?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [focus, setFocus] = useState(0);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      gsap.fromTo(
        "[data-flow-line]",
        { strokeDashoffset: 1000 },
        { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: root.current, start: "top 75%", end: "center 45%", scrub: true } },
      );
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <section ref={root} id="how" aria-labelledby="how-h" className={cn("relative bg-void px-5 text-warm md:px-10", standalone ? "pb-32 pt-40" : "py-28 md:py-40")}>
      <div className="mx-auto max-w-[1400px]">
        <div className={cn(!standalone && "border-t border-white/10 pt-16")}>
          <SectionLabel index="C">How ORBIT works</SectionLabel>
          <h2 id="how-h" className="display mt-8 text-[clamp(2.6rem,6vw,5.5rem)]">
            Capture. Connect.
            <span className="serif-accent block font-normal text-silver">Expand.</span>
          </h2>
        </div>

        <div className="relative mt-20">
          <svg className="pointer-events-none absolute left-0 right-0 top-[38px] hidden h-4 w-full md:block" preserveAspectRatio="none" viewBox="0 0 1000 16" aria-hidden>
            <path d="M 40 8 L 960 8" stroke="#3a3d42" strokeWidth="1" fill="none" />
            <path data-flow-line d="M 40 8 L 960 8" stroke="#f5f3ef" strokeWidth="1" fill="none" strokeDasharray="1000" strokeDashoffset={reduced ? 0 : 1000} />
          </svg>
          <ol className="grid gap-6 md:grid-cols-3">
            {STAGES.map((s, i) => (
              <li key={s.n}>
                <button
                  onMouseEnter={() => setFocus(i)}
                  onFocus={() => setFocus(i)}
                  onClick={() => setFocus(i)}
                  aria-pressed={focus === i}
                  className={cn(
                    "group relative w-full rounded-2xl border p-7 text-left transition-colors duration-500",
                    focus === i ? "border-white/25 bg-white/[0.03]" : "border-white/10 hover:border-white/20",
                  )}
                >
                  <span className={cn("relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border bg-void transition-colors", focus === i ? "border-warm" : "border-white/25")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full transition-colors", focus === i ? "bg-warm" : "bg-white/25")} />
                  </span>
                  <span className="mt-8 block font-mono text-[11px] text-muted">{s.n}</span>
                  <span className="display mt-3 block text-[clamp(2rem,3.5vw,3rem)]">{s.t}</span>
                  <span className="mt-4 block text-[15px] leading-relaxed text-silver">{s.d}</span>
                  <span className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5">
                    {s.detail.map((d) => (
                      <span key={d} className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                        <span className="h-px w-3 bg-white/30" />
                        {d}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── D — Choose your intelligence ───────────────────── */



export function ChooseIntelligence({ standalone = false }: { standalone?: boolean }) {
  const [persona, setPersona] = useState(0);
  const [provider, setProvider] = useState(1);
  const p = BUILTIN_PERSONAS[persona];
  const pr = PROVIDER_FACTS[provider];

  return (
    <section id="models" aria-labelledby="models-h" className={cn("relative bg-void px-5 text-warm md:px-10", standalone ? "pb-32 pt-40" : "py-28 md:py-40")}>
      <div className="mx-auto max-w-[1400px]">
        <div className={cn(!standalone && "border-t border-white/10 pt-16")}>
          <SectionLabel index="D">Choose your intelligence</SectionLabel>
          <h2 id="models-h" className="display mt-8 max-w-5xl text-[clamp(2.6rem,6vw,5.5rem)]">
            Two dials.
            <span className="serif-accent block font-normal text-silver">Set independently.</span>
          </h2>
          <p className="mt-8 max-w-2xl text-[16px] leading-relaxed text-silver">
            The <em className="serif-accent text-warm">personality</em> decides how you are taught. The <em className="serif-accent text-warm">model</em> decides which
            intelligence does the thinking. Mix them freely — ATLAS on one provider, AXIOM on another.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
          <fieldset className="rounded-2xl border border-white/10 p-5">
            <legend className="label px-2 text-muted">Dial 01 — Personality</legend>
            <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Personality">
              {BUILTIN_PERSONAS.map((x, i) => (
                <button
                  key={x.slug}
                  role="radio"
                  aria-checked={persona === i}
                  onClick={() => setPersona(i)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300",
                    persona === i ? "border-warm bg-warm text-void" : "border-white/10 hover:border-white/25",
                  )}
                >
                  <OrbitGlyph variant={x.glyph} className="h-7 w-7" />
                  <span>
                    <span className="block font-display text-[13px] font-bold tracking-[0.14em]">{x.name}</span>
                    <span className={cn("block text-[11px]", persona === i ? "text-void/60" : "text-muted")}>{x.role}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-white/10 p-5">
            <legend className="label px-2 text-muted">Dial 02 — Model provider</legend>
            <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="Model provider">
              {PROVIDER_FACTS.map((x, i) => (
                <button
                  key={x.id}
                  role="radio"
                  aria-checked={provider === i}
                  onClick={() => setProvider(i)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-300",
                    provider === i ? "border-warm bg-warm text-void" : "border-white/10 hover:border-white/25",
                  )}
                >
                  <span className="font-display text-[15px] font-bold">{x.name}</span>
                  <span className={cn("font-mono text-[9.5px] uppercase tracking-[0.16em]", provider === i ? "text-void/60" : "text-muted")}>Your key</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6">
            <AnimatePresence mode="wait">
              <motion.div key={`${persona}-${provider}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35 }}>
                <p className="label text-muted">Resulting assistant</p>
                <p className="display mt-4 text-[2.4rem]">
                  {p.name} <span className="serif-accent font-normal text-silver">×</span> {pr.name}
                </p>
                <p className="mt-4 text-[14px] leading-relaxed text-silver">
                  <span className="text-warm">Teaching style:</span> {p.teaching_style}
                </p>
                <dl className="mt-6 grid gap-3 border-t border-white/10 pt-5 text-[13px]">
                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="label pt-0.5 text-muted">Streaming</dt>
                    <dd>Supported</dd>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="label pt-0.5 text-muted">Vision</dt>
                    <dd>{pr.vision}</dd>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="label pt-0.5 text-muted">Embeddings</dt>
                    <dd>{pr.embeddings}</dd>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="label pt-0.5 text-muted">Note</dt>
                    <dd className="text-silver">{pr.notes}</dd>
                  </div>
                </dl>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
          Providers differ in features, limits and pricing. ORBIT never assumes identical capabilities.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────── E — Final CTA ───────────────────── */

export function FinalCTA() {
  const root = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      gsap.fromTo(
        "[data-iris-reveal]",
        { clipPath: "circle(8% at 50% 50%)" },
        { clipPath: "circle(75% at 50% 50%)", ease: "none", scrollTrigger: { trigger: root.current, start: "top 85%", end: "top 15%", scrub: true } },
      );
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <section ref={root} aria-labelledby="cta-h" className="relative bg-void text-warm">
      <div data-iris-reveal className="noise relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-obsidian px-5">
        <svg viewBox="0 0 800 800" className="pointer-events-none absolute left-1/2 top-1/2 h-[140vmin] w-[140vmin] -translate-x-1/2 -translate-y-1/2" aria-hidden>
          <g fill="none" stroke="#c9cdd1">
            {[380, 300, 220, 140].map((r, i) => (
              <circle key={r} cx="400" cy="400" r={r} strokeOpacity={0.05 + i * 0.03} strokeDasharray={i % 2 ? "2 6" : undefined} />
            ))}
            <g style={{ transformOrigin: "400px 400px", animation: "orbit-spin 120s linear infinite" }}>
              <ellipse cx="400" cy="400" rx="360" ry="140" transform="rotate(32 400 400)" strokeOpacity="0.25" />
              <circle cx="705" cy="590" r="3" fill="#f5f3ef" stroke="none" />
            </g>
            <g style={{ transformOrigin: "400px 400px", animation: "orbit-spin-rev 160s linear infinite" }}>
              <ellipse cx="400" cy="400" rx="360" ry="140" transform="rotate(-32 400 400)" strokeOpacity="0.18" />
            </g>
          </g>
        </svg>
        <div className="relative z-10 text-center">
          <OrbitSymbol className="mx-auto h-10 w-10 text-warm" strokeWidth={1.2} />
          <h2 id="cta-h" className="display mx-auto mt-10 max-w-5xl text-[clamp(2.8rem,8vw,8rem)]">
            The universe is
            <span className="serif-accent block font-normal text-silver">yours to understand.</span>
          </h2>
          <div className="mt-12 flex justify-center">
            <Magnetic>
              <Link
                href="/sign-up"
                className="group inline-flex h-14 items-center gap-3 rounded-full bg-warm px-9 font-mono text-[12px] uppercase tracking-[0.22em] text-void transition-transform duration-300 hover:scale-[1.04]"
              >
                Start your orbit <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Footer ───────────────────── */

export function Footer() {
  const cols: { h: string; l: [string, string][] }[] = [
    { h: "Platform", l: [["Notes", "/features"], ["Lessons & Sources", "/features"], ["AI Studio", "/features"], ["Homework Studio", "/features"]] },
    { h: "System", l: [["How it works", "/how-it-works"], ["AI models", "/models"], ["Knowledge Orbit", "/features"], ["Practice Lab", "/features"]] },
    { h: "Account", l: [["Sign in", "/sign-in"], ["Create account", "/sign-up"], ["Workspace", "/app"]] },
    { h: "ORBIT", l: [["About", "/about"], ["Privacy", "/about#privacy"], ["Security", "/about#security"]] },
  ];
  return (
    <footer className="border-t border-white/10 bg-void px-5 pb-10 pt-20 text-warm md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <OrbitSymbol className="h-6 w-6" />
              <span className="font-display text-[15px] font-bold tracking-[0.32em]">ORBIT</span>
            </div>
            <p className="mt-5 max-w-xs text-[13.5px] leading-relaxed text-muted">Human curiosity. Artificial intelligence. Infinite understanding.</p>
          </div>
          {cols.map((c) => (
            <nav key={c.h} aria-label={c.h}>
              <p className="label text-muted">{c.h}</p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {c.l.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-[13.5px] text-silver transition-colors hover:text-warm">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-20 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted md:flex-row">
          <span>© {new Date().getFullYear()} ORBIT</span>
          <span>Your mind. In motion.</span>
          <span>52.37° N · 4.89° E</span>
        </div>
      </div>
    </footer>
  );
}

export function PageIntro({ index, label, title, accent, body }: { index: string; label: string; title: string; accent: string; body: string }) {
  return (
    <section className="bg-void px-5 pb-10 pt-40 text-warm md:px-10 md:pt-48">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel index={index}>{label}</SectionLabel>
        <h1 className="display mt-10 max-w-5xl text-[clamp(3rem,9vw,8.5rem)]">
          {title}
          <span className="serif-accent block font-normal text-silver">{accent}</span>
        </h1>
        <p className="mt-10 max-w-2xl text-[17px] leading-relaxed text-silver">{body}</p>
      </div>
    </section>
  );
}
