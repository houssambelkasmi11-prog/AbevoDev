"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyOrbitMap } from "@/components/ui/empty-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center px-5 py-24 text-center">
      <EmptyOrbitMap className="h-28 w-44" />
      <p className="label mt-6 text-ink-3">Orbit interrupted</p>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">Something went off course.</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{error.message || "An unexpected error occurred."}</p>
      <div className="mt-8 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/app")}>
          Back to overview
        </Button>
      </div>
    </div>
  );
}
