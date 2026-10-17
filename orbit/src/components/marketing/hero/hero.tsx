"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/client/gsap";
import { supportsWebGL, useMediaQuery, usePrefersReducedMotion } from "@/lib/client/hooks";
import { CLUSTERS, heroState, SCENES, SYNAPSE_LABELS } from "./hero-state";
import { getLenis, scrollToHash } from "../smooth-scroll";
import { ConnectionPoster } from "./poster";
import type { Quality } from "./connection-scene";

const ConnectionScene = dynamic(() => import("./connection-scene"), {
  ssr: false,
  loading: () => <ConnectionPoster className="absolute inset-0" />,
});

function SplitWords({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span data-word className="inline-block will-change-transform">
            {w}
            {" "}
          </span>
        </span>
      ))}
    </span>
  );
}

function Headline({ a, b, size = "xl", as: Tag = "h2" }: { a: string; b: string; size?: "xl" | "lg"; as?: "h1" | "h2" }) {
  return (
    <Tag
      className={
        size === "xl"
          ? "display text-[clamp(3.2rem,11vw,10.5rem)] text-warm"
          : "display text-[clamp(2.6rem,7.5vw,7rem)] text-warm"
      }
    >
      <SplitWords text={a} className="block" />
      <SplitWords text={b} className="serif-accent block font-normal text-silver [letter-spacing:-0.03em]" />
    </Tag>
  );
}

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const small = useMediaQuery("(max-width: 820px)");
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [active, setActive] = useState(true);
  const root = useRef<HTMLElement>(null);
  const hudIndex = useRef<HTMLSpanElement>(null);
  const hudName = useRef<HTMLSpanElement>(null);
  const hudBar = useRef<HTMLSpanElement>(null);
  const hudCoord = useRef<HTMLSpanElement>(null);

  useEffect(() => setWebgl(supportsWebGL()), []);

  // Pause rendering whenever the hero is off-screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let visible = true;
    const sync = () => setActive(visible && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { rootMargin: "120px" });
    io.observe(el);
    // Also stop the GPU entirely while the tab is in the background.
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const quality: Quality =
    small || (typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4) ? "low" : "high";

  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(root);

      // Entrance choreography for scene 01.
      gsap.from(q("[data-p1] [data-word]"), {
        yPercent: 115,
        opacity: 0,
        duration: 1.4,
        ease: "power4.out",
        stagger: 0.07,
        delay: 0.25,
      });
      gsap.from(q("[data-p1-sub], [data-hud]"), { opacity: 0, y: 14, duration: 1.2, ease: "power3.out", stagger: 0.08, delay: 0.9 });

      // The story timeline is driven by a *paced* progress value rather than
      // raw scroll: however hard you fling the wheel, each scene gets its
      // moment. The page is held inside the pinned hero until the story has
      // caught up (in-page jumps bypass this via heroState.bypassUntil).
      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: small ? "+=380%" : "+=520%",
        pin: true,
        anticipatePin: 1,
      });

      const MAX_RATE = small ? 0.16 : 0.12; // story progress per second at most (≈ 6–8 s end to end)
      const FOLLOW = 4.2; // exponential catch-up rate (1/s)
      const LEAD = 0.03; // how far scroll may run ahead of the story before it's held
      let shown = st.progress;
      let lastIdx = -1;
      let last = performance.now();

      const render = (p: number) => {
        tl.progress(p);
        heroState.progress = p;
        const idx = Math.max(0, SCENES.findIndex((s) => p >= s.from && p <= s.to));
        if (idx !== lastIdx) {
          lastIdx = idx;
          const scene = SCENES[idx];
          if (hudIndex.current) hudIndex.current.textContent = scene.id;
          if (hudName.current) hudName.current.textContent = scene.name;
        }
        if (hudBar.current) hudBar.current.style.transform = `scaleY(${p.toFixed(4)})`;
        if (hudCoord.current) hudCoord.current.textContent = `Φ ${(p * 360).toFixed(1).padStart(5, "0")}° · Δ ${(1 - p).toFixed(3)}`;
      };

      const hold = (p: number) => {
        const y = st.start + p * (st.end - st.start);
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      };

      const tick = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const target = st.progress;
        const y = st.scroll();
        const vh = window.innerHeight;
        // Intentional jumps, or already well outside the hero: no pacing.
        if (now < heroState.bypassUntil || y > st.end + vh * 0.5 || y < st.start - vh * 0.5) {
          shown = target;
        } else {
          const diff = target - shown;
          if (Math.abs(diff) > 0.00005) {
            const cap = MAX_RATE * dt * (diff < 0 ? 1.6 : 1); // rewinding may be a little quicker
            shown += Math.max(-cap, Math.min(cap, diff * (1 - Math.exp(-FOLLOW * dt))));
            // Hold the page while the story catches up.
            const lead = target - shown;
            if (lead > LEAD) hold(shown + LEAD);
            else if (lead < -LEAD) hold(shown - LEAD);
          } else shown = target;
        }
        render(shown);
      };
      tl.to({}, { duration: 1 }, 0); // normalise timeline length to 1
      tl.to(q("[data-p1]"), { autoAlpha: 0, y: -60, duration: 0.06 }, 0.13);
      tl.to(q("[data-scroll-cue]"), { autoAlpha: 0, duration: 0.04 }, 0.04);
      tl.fromTo(q("[data-p2]"), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.21);
      tl.to(q("[data-p2]"), { autoAlpha: 0, y: -60, duration: 0.05 }, 0.355);
      tl.fromTo(q("[data-p3]"), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.45);
      tl.to(q("[data-p3]"), { autoAlpha: 0, duration: 0.04 }, 0.575);
      tl.fromTo(q("[data-p4]"), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.64);
      tl.to(q("[data-p4]"), { autoAlpha: 0, y: -60, duration: 0.05 }, 0.81);
      tl.fromTo(q("[data-p5]"), { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.06 }, 0.9);
      tl.fromTo(q("[data-iris]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 0.95);

      // Don't fight scroll restoration / layout settling on load.
      heroState.bypassUntil = performance.now() + 900;
      render(shown);
      gsap.ticker.add(tick);
      return () => {
        gsap.ticker.remove(tick);
        st.kill();
      };
    },
    { scope: root, dependencies: [reduced, small], revertOnUpdate: true },
  );

  useEffect(() => {
    heroState.progress = 0;
    return () => {
      heroState.labels.clear();
    };
  }, []);

  useEffect(() => {
    // Recalculate pin spacing once fonts settle.
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);
    }
  }, []);

  const registerLabel = (key: string) => (el: HTMLElement | null) => {
    if (el) heroState.labels.set(key, el);
    else heroState.labels.delete(key);
  };

  if (reduced) return <ReducedHero />;

  return (
    <section
      ref={root}
      aria-label="The Connection — an introduction to ORBIT"
      className="relative h-[100svh] w-full overflow-hidden bg-void text-warm"
    >
      {/* 3D stage */}
      <div className="absolute inset-0">
        {webgl === false ? (
          <ConnectionPoster className="absolute inset-0" />
        ) : webgl ? (
          <ConnectionScene quality={quality} active={active} />
        ) : (
          <ConnectionPoster className="absolute inset-0" />
        )}
      </div>

      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(7,8,9,0.85)_100%)]" />
      <div className="micro-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

      {/* Projected 3D labels */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <ProjectedLabel register={registerLabel("human")} text="01 / HUMAN INTELLIGENCE" />
        <ProjectedLabel register={registerLabel("ai")} text="02 / ARTIFICIAL INTELLIGENCE" />
        {SYNAPSE_LABELS.map((l, i) => (
          <ProjectedLabel key={l} register={registerLabel(`syn-${i}`)} text={l} dot />
        ))}
        {CLUSTERS.map((l, i) => (
          <ProjectedLabel key={l} register={registerLabel(`cl-${i}`)} text={l} index={i} />
        ))}
      </div>

      {/* HUD */}
      <div data-hud className="pointer-events-none absolute left-5 top-24 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted md:left-10 md:block">
        <div>ORBIT / THE CONNECTION</div>
        <div className="mt-1 text-silver/70">
          <span ref={hudCoord}>Φ 000.0° · Δ 1.000</span>
        </div>
      </div>
      <div data-hud className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 items-center gap-4 md:right-10 md:flex">
        <div className="text-right font-mono text-[10px] uppercase tracking-[0.18em]">
          <div className="text-warm">
            <span ref={hudIndex}>01</span> <span className="text-muted">/ 05</span>
          </div>
          <div className="mt-1 text-muted">
            <span ref={hudName}>DISCOVERY</span>
          </div>
        </div>
        <span className="relative h-40 w-px bg-white/10">
          <span ref={hudBar} className="absolute inset-0 origin-top bg-warm" style={{ transform: "scaleY(0)" }} />
        </span>
      </div>

      {/* Scene 01 — Discovery */}
      <div data-p1 className="absolute inset-x-0 bottom-[14vh] px-5 md:bottom-[12vh] md:px-10">
        <Headline as="h1" a="Your mind." b="In motion." />
        <div data-p1-sub className="mt-6 flex max-w-xl flex-col gap-1 md:mt-8">
          <p className="text-[15px] leading-relaxed text-silver md:text-[17px]">Meet the intelligence that learns alongside you.</p>
        </div>
      </div>
      <div data-scroll-cue className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
        <span className="label text-muted">Scroll to connect</span>
        <span className="relative block h-10 w-px overflow-hidden bg-white/10">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[scroll-cue_1.8s_var(--ease-orbit)_infinite] bg-warm" />
        </span>
      </div>

      {/* Scene 02 — Approach */}
      <div data-p2 className="invisible absolute inset-x-0 top-[16vh] px-5 text-center opacity-0 md:px-10">
        <Headline a="Two intelligences." b="One infinite possibility." size="lg" />
      </div>

      {/* Scene 03 — Synapse */}
      <div data-p3 className="invisible absolute inset-x-0 bottom-[10vh] px-5 text-center opacity-0">
        <p className="label text-muted">03 / SYNAPSE</p>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-silver">
          Every point is a piece of knowledge. Every line, an understanding you haven&apos;t had yet.
        </p>
      </div>

      {/* Scene 04 — Universe */}
      <div data-p4 className="invisible absolute inset-x-0 bottom-[12vh] px-5 opacity-0 md:px-10">
        <Headline a="Everything you learn." b="Beautifully connected." size="lg" />
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-silver">
          Every note, lesson, source and conversation becomes part of a larger understanding.
        </p>
      </div>

      {/* Scene 05 — Enter ORBIT */}
      <div data-iris className="pointer-events-none invisible absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(7,8,9,0.2)_0%,rgba(7,8,9,0.92)_60%)] opacity-0" />
      <div data-p5 className="invisible absolute inset-0 flex flex-col items-center justify-center px-5 text-center opacity-0">
        <p className="label text-muted">05 / ENTER ORBIT</p>
        <h2 className="display mt-6 text-[clamp(2.6rem,8vw,7.5rem)] text-warm">
          Enter your
          <span className="serif-accent block font-normal text-silver">learning universe.</span>
        </h2>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-warm px-7 font-mono text-[11px] uppercase tracking-[0.2em] text-void transition-transform duration-300 hover:scale-[1.03]"
          >
            Enter ORBIT <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#system"
            onClick={(e) => {
              if (scrollToHash("#system")) e.preventDefault();
            }}
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-7 font-mono text-[11px] uppercase tracking-[0.2em] text-warm transition-colors hover:border-white/40"
          >
            Explore the system
          </a>
        </div>
      </div>

      <style>{`@keyframes scroll-cue{0%{transform:translateY(-100%)}100%{transform:translateY(200%)}}`}</style>
    </section>
  );
}

function ProjectedLabel({ register, text, dot, index }: { register: (el: HTMLElement | null) => void; text: string; dot?: boolean; index?: number }) {
  return (
    <span
      ref={register}
      className="absolute left-0 top-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-silver opacity-0 will-change-transform"
    >
      <span className="block -translate-x-1/2 -translate-y-1/2">
        {dot ? <span className="mr-2 inline-block h-1 w-1 rounded-full bg-ice align-middle" /> : null}
        {index !== undefined ? <span className="mr-2 text-muted">{String(index + 1).padStart(2, "0")}</span> : null}
        {text}
      </span>
    </span>
  );
}

/** Reduced-motion version: no pinning, no camera choreography — same story. */
function ReducedHero() {
  return (
    <section aria-label="The Connection — an introduction to ORBIT" className="relative bg-void text-warm">
      <div className="relative h-[100svh] min-h-[560px] overflow-hidden">
        <ConnectionPoster className="absolute inset-0" />
        <div className="absolute inset-x-0 bottom-[12vh] px-5 md:px-10">
          <p className="label mb-6 text-muted">01 / HUMAN INTELLIGENCE · 02 / ARTIFICIAL INTELLIGENCE</p>
          <h1 className="display text-[clamp(3.2rem,11vw,10.5rem)]">
            Your mind.
            <span className="serif-accent block font-normal text-silver">In motion.</span>
          </h1>
          <p className="mt-6 text-[17px] text-silver">Meet the intelligence that learns alongside you.</p>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-16 px-5 py-24 md:px-10">
        {[
          ["Two intelligences.", "One infinite possibility."],
          ["Everything you learn.", "Beautifully connected."],
        ].map(([a, b]) => (
          <h2 key={a} className="display text-[clamp(2.4rem,6vw,5.5rem)]">
            {a}
            <span className="serif-accent block font-normal text-silver">{b}</span>
          </h2>
        ))}
        <div>
          <Link href="/sign-up" className="inline-flex h-12 items-center gap-3 rounded-full bg-warm px-7 font-mono text-[11px] uppercase tracking-[0.2em] text-void">
            Enter ORBIT <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
