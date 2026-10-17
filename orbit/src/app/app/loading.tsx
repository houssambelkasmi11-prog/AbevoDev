import { OrbitPulse } from "@/components/brand/logo";

export default function Loading() {
  return (
    <div className="fx-delayed mx-auto max-w-6xl px-5 py-10 md:px-10">
      <div className="flex items-center gap-3 text-ink-2">
        <OrbitPulse className="h-5 w-5 text-ink" label="Loading" />
        <span className="label">Loading</span>
      </div>
      <div className="mt-8 space-y-4">
        <div className="skeleton h-10 w-1/3" />
        <div className="skeleton h-4 w-1/2" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="skeleton h-40" />
          <div className="skeleton h-40" />
          <div className="skeleton h-40" />
        </div>
      </div>
    </div>
  );
}
