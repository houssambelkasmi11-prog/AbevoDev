import Link from "next/link";
import { EmptyOrbitMap } from "@/components/ui/empty-state";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-24 text-center">
      <EmptyOrbitMap className="h-28 w-44" />
      <p className="label mt-6 text-ink-3">404 / Out of orbit</p>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">This item isn&apos;t in your universe.</h1>
      <p className="mt-3 text-[14px] text-ink-2">It may have been deleted, or it belongs to another workspace.</p>
      <Link href="/app" className="mt-8 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm text-accent-ink">
        Back to overview
      </Link>
    </div>
  );
}
