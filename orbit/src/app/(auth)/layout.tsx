import Link from "next/link";
import { OrbitSymbol, Wordmark } from "@/components/brand/logo";
import { AmbientShader } from "@/components/fx/ambient-shader";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark grid min-h-[100svh] bg-void text-warm lg:grid-cols-[1.05fr_1fr]">
      <aside className="noise relative hidden overflow-hidden border-r border-white/10 bg-obsidian lg:block">
        <AmbientShader forceDark className="fx-ambient-local" />
        <div className="micro-grid absolute inset-0 opacity-60" />
        <svg viewBox="0 0 600 600" className="absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2" aria-hidden>
          <g fill="none" stroke="#c9cdd1">
            <circle cx="300" cy="300" r="250" strokeOpacity="0.06" />
            <circle cx="300" cy="300" r="180" strokeOpacity="0.1" strokeDasharray="2 6" />
            <g style={{ transformOrigin: "300px 300px", animation: "orbit-spin 80s linear infinite" }}>
              <ellipse cx="300" cy="300" rx="240" ry="96" transform="rotate(32 300 300)" strokeOpacity="0.4" />
              <circle cx="502" cy="428" r="3.5" fill="#f5f3ef" stroke="none" />
            </g>
            <g style={{ transformOrigin: "300px 300px", animation: "orbit-spin-rev 110s linear infinite" }}>
              <ellipse cx="300" cy="300" rx="240" ry="96" transform="rotate(-32 300 300)" strokeOpacity="0.25" />
            </g>
          </g>
          <circle cx="300" cy="300" r="6" fill="#f5f3ef" />
        </svg>
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" aria-label="ORBIT home">
            <Wordmark />
          </Link>
          <div>
            <p className="display text-[clamp(2.5rem,4.5vw,4.5rem)]">
              Human curiosity.
              <span className="serif-accent block font-normal text-silver">Artificial intelligence.</span>
              <span className="block">Infinite understanding.</span>
            </p>
            <p className="label mt-8 text-muted">ORBIT · Your mind. In motion.</p>
          </div>
        </div>
      </aside>
      <main id="main" className="flex min-h-[100svh] flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="ORBIT home">
            <OrbitSymbol className="h-7 w-7" />
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
