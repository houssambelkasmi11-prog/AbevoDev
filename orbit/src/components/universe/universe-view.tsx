"use client";

import { Map as MapIcon, Orbit } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supportsWebGL } from "@/lib/client/hooks";
import { cn } from "@/lib/utils";
import { Cosmos } from "./cosmos";
import { UniverseGraph } from "./universe-graph";
import type { GEdge, GNode } from "./universe-types";

type View = "cosmos" | "map";
const KEY = "orbit-universe-view";

/**
 * My Universe has two lenses on the same data:
 *  • Universe — an explorable 3D solar system (subjects are worlds, items are moons).
 *  • Map — the flat constellation board for arranging and precise editing.
 */
export function UniverseView(props: { nodes: GNode[]; edges: GEdge[]; subjects: { id: string; name: string }[]; hasProvider: boolean; workspaceName: string }) {
  const params = useSearchParams();
  const [view, setView] = useState<View | null>(null);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const ok = supportsWebGL();
    setWebgl(ok);
    const fromUrl = params.get("view");
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    const v = (fromUrl === "map" || fromUrl === "cosmos" ? fromUrl : stored === "map" ? "map" : "cosmos") as View;
    setView(ok ? v : "map");
  }, [params]);

  const choose = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
    const q = new URLSearchParams(params.toString());
    q.set("view", v);
    window.history.replaceState(null, "", `/app/universe?${q.toString()}`);
  };

  const dark = view !== "map";
  const toggle = (
    <div role="tablist" aria-label="Universe view" className={cn("flex h-10 items-center gap-0.5 rounded-xl border p-1 backdrop-blur-md", dark ? "border-white/10 bg-[#0a0c11]/75" : "border-line bg-surface/90")}>
      {(
        [
          ["cosmos", "Universe", Orbit],
          ["map", "Map", MapIcon],
        ] as const
      ).map(([k, l, Icon]) => (
        <button
          key={k}
          role="tab"
          aria-selected={view === k}
          disabled={k === "cosmos" && !webgl}
          title={k === "cosmos" && !webgl ? "3D view needs WebGL" : undefined}
          onClick={() => choose(k)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] transition-colors disabled:opacity-40",
            view === k ? (dark ? "bg-white text-black" : "bg-ink text-canvas") : dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-ink-2 hover:bg-soft hover:text-ink",
          )}
        >
          <Icon className="h-3.5 w-3.5" /> {l}
        </button>
      ))}
    </div>
  );

  if (view === null) return <div className="h-[calc(100dvh-56px-64px)] bg-[#020306] lg:h-[100dvh]" />;
  if (view === "map") return <UniverseGraph nodes={props.nodes} edges={props.edges} subjects={props.subjects} hasProvider={props.hasProvider} viewSwitch={toggle} />;
  return <Cosmos nodes={props.nodes} edges={props.edges} hasProvider={props.hasProvider} workspaceName={props.workspaceName} viewSwitch={toggle} />;
}
