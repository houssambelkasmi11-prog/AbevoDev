import Link from "next/link";
import { OrbitSymbol } from "@/components/brand/logo";
import { AmbientShader } from "@/components/fx/ambient-shader";

export default function NotFound() {
  return (
    <main id="main" className="dark relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-void px-5 text-center text-warm">
      <AmbientShader forceDark />
      <div className="relative z-[1] flex flex-col items-center">
      <OrbitSymbol className="h-10 w-10" strokeWidth={1.2} />
      <p className="label mt-8 text-muted">404 / Lost in space</p>
      <h1 className="display mt-4 text-[clamp(2.5rem,7vw,5rem)]">
        Nothing orbits
        <span className="serif-accent block font-normal text-silver">at these coordinates.</span>
      </h1>
      <Link href="/" className="mt-10 inline-flex h-12 items-center rounded-full bg-warm px-7 font-mono text-[11px] uppercase tracking-[0.2em] text-void">
        Return home
      </Link>
      </div>
    </main>
  );
}
