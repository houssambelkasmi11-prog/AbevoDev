"use client";

import { ArrowUpRight, Check, Crosshair, Eye, EyeOff, Home, Link2, Pause, Play, Plus, Search, Sparkles, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { NoProviderNotice } from "@/components/app/no-provider";
import { OrbitPulse } from "@/components/brand/logo";
import { useFxLevel } from "@/components/fx/fx-prefs";
import { signalNavigation } from "@/components/fx/route-progress";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { usePrefersReducedMotion } from "@/lib/client/hooks";
import type { EdgeKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createConcept, deleteConcept, setEdgeStatus, suggestConnections } from "@/server/actions/graph";
import { linkEntities } from "@/server/actions/notes";
import { buildSystem, connectionsFor, EDGE_COLOR, tone, type Body } from "./cosmos-layout";
import { KIND_LABEL, type GEdge, type GNode } from "./universe-types";

function Forming() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#020306]">
      <OrbitPulse className="h-8 w-8 text-white" label="Loading universe" />
      <span className="fx-shimmer-text font-mono text-[11px] uppercase tracking-[0.22em]">Forming your universe</span>
    </div>
  );
}

const CosmosScene = dynamic(() => import("./cosmos-scene"), { ssr: false, loading: () => <Forming /> });

const TYPE_NAME: Record<string, string> = {
  note: "Note",
  source: "Lesson / source",
  assignment: "Homework",
  conversation: "AI conversation",
  concept: "Concept",
  subject: "Subject",
};

const glass = "rounded-2xl border border-white/10 bg-[#0a0c11]/75 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md";

function describe(b: Body): string {
  if (b.kind === "core") return "Galactic core";
  if (b.kind === "star") return `Star · ${b.count} planet${b.count === 1 ? "" : "s"}`;
  if (b.kind === "rogue") return `${TYPE_NAME[b.node?.type ?? "note"]} · rogue planet`;
  if (b.kind === "concept") return "Concept star";
  return `${TYPE_NAME[b.node?.type ?? "note"] ?? "Item"} · planet`;
}

export function Cosmos({
  nodes,
  edges,
  hasProvider,
  workspaceName,
  viewSwitch,
}: {
  nodes: GNode[];
  edges: GEdge[];
  hasProvider: boolean;
  workspaceName: string;
  viewSwitch: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const fx = useFxLevel();
  const reduced = usePrefersReducedMotion();
  const [, start] = useTransition();

  const system = useMemo(() => buildSystem(nodes, workspaceName), [nodes, workspaceName]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState("__core");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [labels, setLabels] = useState(true);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<{ from: string; to: string } | null>(null);
  const [linkKind, setLinkKind] = useState<EdgeKind>("related");
  const [highlightEdge, setHighlightEdge] = useState<string | null>(null);
  const [showSuggested, setShowSuggested] = useState(true);
  const [conceptOpen, setConceptOpen] = useState(false);
  const [conceptLabel, setConceptLabel] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const linkRef = useRef<string | null>(null);
  useEffect(() => {
    linkRef.current = linkFrom;
  }, [linkFrom]);
  useEffect(() => setPaused(reduced), [reduced]);

  // Deep link: /app/universe?focus=<subject or item id>
  useEffect(() => {
    const f = params.get("focus");
    if (f && system.byId.has(f)) {
      setSelectedId(f);
      const b = system.byId.get(f)!;
      setFocusId(b.kind === "planet" && b.parent ? b.parent : f);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop a selection whose body disappeared after a refresh.
  useEffect(() => {
    if (selectedId && !system.byId.has(selectedId)) setSelectedId(null);
    if (!system.byId.has(focusId)) setFocusId("__core");
  }, [system, selectedId, focusId]);

  const select = useCallback(
    (id: string | null) => {
      const from = linkRef.current;
      if (from && id && id !== from && id !== "__core") {
        setPendingLink({ from, to: id });
        setLinkFrom(null);
        return;
      }
      setSelectedId(id);
      if (!id) return;
      const b = system.byId.get(id);
      if (!b) return;
      // Planets keep the camera on their star's system; everything else gets a flight.
      if (b.kind === "planet" && b.parent) setFocusId(b.parent);
      else setFocusId(id);
    },
    [system],
  );

  const flyTo = useCallback(
    (id: string) => {
      setSelectedId(id);
      setFocusId(id);
    },
    [system],
  );

  const onHover = useCallback((id: string, on: boolean) => setHoveredId((h) => (on ? id : h === id ? null : h)), []);

  const onOpen = useCallback(
    (id: string) => {
      const href = system.byId.get(id)?.node?.href;
      if (href) {
        signalNavigation();
        router.push(href);
      } else flyTo(id);
    },
    [system, router, flyTo],
  );

  const home = useCallback(() => {
    setSelectedId(null);
    setFocusId("__core");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape") {
        if (linkRef.current) setLinkFrom(null);
        else if (selectedId) setSelectedId(null);
        else home();
      } else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key.toLowerCase() === "h") home();
      else if (e.key.toLowerCase() === "l") setLabels((l) => !l);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, home]);

  const selected = selectedId ? system.byId.get(selectedId) ?? null : null;
  const suggested = edges.filter((e) => e.status === "suggested" && system.byId.has(e.source) && system.byId.has(e.target));
  const sceneEdges = useMemo(() => edges.filter((e) => e.origin !== "implicit" && (e.status === "approved" || showSuggested)), [edges, showSuggested]);
  const connections = selected ? connectionsFor(edges, selected.id) : [];
  const planets = selected?.kind === "star" ? system.planetsOf.get(selected.id) ?? [] : [];
  const counts = useMemo(
    () => ({
      stars: system.stars.length,
      planets: system.bodies.filter((b) => b.kind === "planet" || b.kind === "rogue").length,
      rogues: system.bodies.filter((b) => b.kind === "rogue"),
      concepts: system.bodies.filter((b) => b.kind === "concept"),
      links: edges.filter((e) => e.origin !== "implicit" && e.status === "approved").length,
    }),
    [system, edges],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return system.bodies.filter((b) => b.kind !== "core" && (b.node?.label ?? "").toLowerCase().includes(q)).slice(0, 8);
  }, [query, system]);

  const label = (id: string) => system.byId.get(id)?.node?.label ?? "—";
  const colorOf = (b: Body | undefined) => tone(b);

  return (
    <div className="dark relative h-[calc(100dvh-56px-64px)] overflow-hidden bg-[#020306] text-ink lg:h-[100dvh]">
      {fx === null ? (
        <Forming />
      ) : (
        <CosmosScene
          system={system}
          edges={sceneEdges}
          selectedId={selectedId}
          focusId={focusId}
          hoveredId={hoveredId}
          linkFromId={linkFrom}
          highlightEdgeId={highlightEdge}
          paused={paused}
          labels={labels}
          quality={fx === "full" ? "full" : "lite"}
          reduced={reduced}
          onSelect={select}
          onHover={onHover}
          onOpen={onOpen}
        />
      )}

      {/* Soft vignette so the HUD always reads cleanly */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />

      {/* ── Top bar ── */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start gap-2 md:inset-x-5 md:top-5">
        <div className={cn(glass, "pointer-events-auto px-4 py-3")}>
          <p className="label text-white/45">01 / My universe</p>
          <p className="mt-0.5 font-display text-[17px] font-bold tracking-tight text-white">
            {counts.stars} star{counts.stars === 1 ? "" : "s"} · {counts.planets} planet{counts.planets === 1 ? "" : "s"}
            <span className="text-white/45"> · {counts.links} link{counts.links === 1 ? "" : "s"}</span>
          </p>
        </div>
        <div className="pointer-events-auto">{viewSwitch}</div>
        <div className="pointer-events-auto relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                select(results[0].id);
                setQuery("");
                setSearchOpen(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Travel to…"
            aria-label="Search your universe"
            className="h-10 w-48 border-white/10 bg-[#0a0c11]/75 pl-9 text-white backdrop-blur-md placeholder:text-white/35 md:w-56"
          />
          {searchOpen && results.length ? (
            <ul className={cn(glass, "absolute left-0 top-12 w-72 overflow-hidden p-1.5")}>
              {results.map((b) => (
                <li key={b.id}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      select(b.id);
                      setQuery("");
                      setSearchOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-white/85 hover:bg-white/10"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(b), boxShadow: `0 0 10px ${colorOf(b)}` }} />
                    <span className="min-w-0 flex-1 truncate">{b.node?.label}</span>
                    <span className="label shrink-0 text-white/35">{b.kind === "star" ? "star" : b.node?.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="pointer-events-auto ml-auto flex gap-2">
          <Button variant="outline" className="border-white/15 bg-[#0a0c11]/75 text-white backdrop-blur-md hover:bg-white/10" onClick={() => setConceptOpen(true)}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Concept</span>
          </Button>
          <Button
            loading={suggesting}
            className="bg-white text-black"
            onClick={async () => {
              setAiError(null);
              setSuggesting(true);
              const r = await suggestConnections();
              setSuggesting(false);
              if (r.ok) {
                toast.show(r.data.length ? `${r.data.length} connections suggested — review them` : "No new connections found");
                setShowSuggested(true);
                setSelectedId(null);
                router.refresh();
              } else setAiError(r.error);
            }}
            disabled={!hasProvider}
          >
            <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Suggest connections</span>
          </Button>
        </div>
      </div>

      {/* ── Link mode banner ── */}
      {linkFrom ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4">
          <div className={cn(glass, "pointer-events-auto flex items-center gap-3 border-[#ffbf7a]/40 px-4 py-2.5 text-[13px] text-white animate-rise")}>
            <Link2 className="h-4 w-4 text-[#ffbf7a]" />
            <span>
              Choose a body to connect with <strong>{label(linkFrom)}</strong>
            </span>
            <button onClick={() => setLinkFrom(null)} className="label rounded-md px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white">
              Esc
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Systems navigator (desktop) ── */}
      <nav aria-label="Stars" className={cn(glass, "absolute bottom-24 left-5 top-28 z-10 hidden w-60 flex-col overflow-hidden md:flex")}>
        <p className="label border-b border-white/10 px-4 py-3 text-white/45">Star systems</p>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5" data-lenis-prevent>
          <li>
            <NavRow color="#ffd9a0" title={workspaceName} meta="Core" active={focusId === "__core"} onClick={home} />
          </li>
          {system.stars.map((p) => (
            <li key={p.id}>
              <NavRow color={tone(p)} title={p.node?.label ?? ""} meta={String(p.count)} active={focusId === p.id || system.byId.get(focusId)?.parent === p.id} onClick={() => flyTo(p.id)} />
            </li>
          ))}
          {counts.concepts.length ? (
            <li>
              <NavRow color="#9cc7ff" title="Concept stars" meta={String(counts.concepts.length)} active={false} onClick={() => flyTo(counts.concepts[0].id)} />
            </li>
          ) : null}
          {counts.rogues.length ? (
            <li>
              <NavRow color="#9aa0a6" title="Rogue planets (unfiled)" meta={String(counts.rogues.length)} active={false} onClick={() => flyTo(counts.rogues[0].id)} />
            </li>
          ) : null}
        </ul>
        {system.stars.length === 0 ? (
          <p className="border-t border-white/10 p-4 text-[12px] leading-relaxed text-white/50">Create a subject to ignite your first star — its notes and lessons become planets around it.</p>
        ) : null}
      </nav>

      {/* ── Systems chips (mobile) ── */}
      <div className="absolute inset-x-0 bottom-[72px] z-10 flex gap-2 overflow-x-auto px-3 scrollbar-none md:hidden">
        {system.stars.map((p) => (
          <button
            key={p.id}
            onClick={() => flyTo(p.id)}
            className={cn("flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[12px] backdrop-blur-md", focusId === p.id ? "border-white/40 bg-white/15 text-white" : "border-white/10 bg-black/50 text-white/75")}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: tone(p), boxShadow: `0 0 8px ${tone(p)}` }} />
            {p.node?.label}
          </button>
        ))}
      </div>

      {/* ── Dock ── */}
      <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center px-3">
        <div className={cn(glass, "flex items-center gap-1 p-1.5")}>
          <DockButton label="Overview (H)" onClick={home}>
            <Home className="h-4 w-4" />
          </DockButton>
          <DockButton label={paused ? "Resume orbits (Space)" : "Pause orbits (Space)"} onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </DockButton>
          <DockButton label={labels ? "Hide labels (L)" : "Show labels (L)"} onClick={() => setLabels((l) => !l)}>
            {labels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </DockButton>
          <span className="mx-2 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 lg:inline">Drag to orbit · scroll to zoom · double-click to open</span>
        </div>
      </div>

      {/* ── Detail panel: selection, or AI suggestions ── */}
      {selected && selected.kind !== "core" ? (
        <aside key={selected.id} className={cn(glass, "absolute inset-x-3 bottom-[124px] z-20 flex max-h-[46dvh] flex-col overflow-hidden animate-rise md:inset-x-auto md:bottom-24 md:right-5 md:top-28 md:max-h-none md:w-[340px]")}>
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div className="min-w-0">
              <p className="label flex items-center gap-2 text-white/50">
                <span className="h-2 w-2 rounded-full" style={{ background: colorOf(selected), boxShadow: `0 0 10px ${colorOf(selected)}` }} />
                {describe(selected)}
              </p>
              <h3 className="mt-2 font-display text-[20px] font-bold leading-tight text-white">{selected.node?.label}</h3>
              {selected.kind === "planet" && selected.parent ? (
                <button onClick={() => flyTo(selected.parent!)} className="mt-1 text-[12px] text-white/50 hover:text-white">
                  orbits ★ {label(selected.parent)}
                </button>
              ) : null}
            </div>
            <button onClick={() => setSelectedId(null)} aria-label="Close" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4" data-lenis-prevent>
            {selected.node?.snippet ? <p className="text-[13px] leading-relaxed text-white/65">{selected.node.snippet}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {selected.node?.href ? (
                <Link href={selected.node.href} onClick={() => signalNavigation()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-medium text-black transition-transform hover:-translate-y-px">
                  Open <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              {selected.kind !== "star" && focusId !== selected.id ? (
                <Button size="sm" variant="outline" className="h-9 border-white/15 text-white hover:bg-white/10" onClick={() => flyTo(selected.id)}>
                  <Crosshair className="h-3.5 w-3.5" /> Fly closer
                </Button>
              ) : null}
              <Button size="sm" variant="outline" className="h-9 border-white/15 text-white hover:bg-white/10" onClick={() => setLinkFrom(selected.id)}>
                <Link2 className="h-3.5 w-3.5" /> Connect to…
              </Button>
              {selected.kind === "concept" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 text-[#ff9c8f] hover:bg-white/10"
                  onClick={() =>
                    start(async () => {
                      await deleteConcept(selected.id);
                      setSelectedId(null);
                      router.refresh();
                    })
                  }
                >
                  Delete
                </Button>
              ) : null}
            </div>

            {selected.kind === "star" ? (
              <>
                <p className="label mt-6 text-white/40">Planets · {planets.length}</p>
                {planets.length === 0 ? <p className="mt-2 text-[12.5px] text-white/50">Add notes, lessons or homework to this subject and they&apos;ll start orbiting this star.</p> : null}
                <ul className="mt-2 space-y-0.5">
                  {planets.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => select(m.id)}
                        onDoubleClick={() => onOpen(m.id)}
                        onMouseEnter={() => setHoveredId(m.id)}
                        onMouseLeave={() => setHoveredId((h) => (h === m.id ? null : h))}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/10"
                      >
                        <span className="label w-[74px] shrink-0 text-white/35">{TYPE_NAME[m.node?.type ?? "note"]?.split(" ")[0]}</span>
                        <span className="truncate text-[12.5px] text-white/85">{m.node?.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <p className="label mt-6 text-white/40">Connections · {connections.length}</p>
            {connections.length === 0 ? <p className="mt-2 text-[12.5px] text-white/50">No links yet. Use “Connect to…” or ask ORBIT to suggest some.</p> : null}
            <ul className="mt-2 space-y-0.5">
              {connections.map((e) => {
                const otherId = e.source === selected.id ? e.target : e.source;
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => select(otherId)}
                      onMouseEnter={() => setHighlightEdge(e.id)}
                      onMouseLeave={() => setHighlightEdge(null)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/10"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: EDGE_COLOR[e.kind] }} />
                      <span className="label w-[86px] shrink-0 text-white/40">{KIND_LABEL[e.kind]}</span>
                      <span className="truncate text-[12.5px] text-white/85">{label(otherId)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      ) : (suggested.length || aiError || !hasProvider) && showSuggested && !selected ? (
        <aside className={cn(glass, "absolute inset-x-3 bottom-[124px] z-20 flex max-h-[46dvh] flex-col overflow-hidden md:inset-x-auto md:bottom-24 md:right-5 md:top-28 md:max-h-none md:w-[340px]")}>
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <span className="label text-white/80">Suggested connections · {suggested.length}</span>
            <button onClick={() => setShowSuggested(false)} aria-label="Hide suggestions" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3" data-lenis-prevent>
            {!hasProvider ? <NoProviderNotice compact message="Connection suggestions use your own AI provider." /> : null}
            {aiError ? <p className="mb-3 text-[12.5px] text-[#ff9c8f]">{aiError}</p> : null}
            <ul className="space-y-2">
              {suggested.map((e) => (
                <li
                  key={e.id}
                  onMouseEnter={() => setHighlightEdge(e.id)}
                  onMouseLeave={() => setHighlightEdge(null)}
                  className="rounded-xl border border-dashed border-white/15 p-3 transition-colors hover:border-white/35"
                >
                  <p className="text-[12.5px] text-white/85">
                    <span className="font-medium text-white">{label(e.source)}</span> <span className="label" style={{ color: EDGE_COLOR[e.kind] }}>{KIND_LABEL[e.kind]}</span>{" "}
                    <span className="font-medium text-white">{label(e.target)}</span>
                  </p>
                  {e.rationale ? <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">{e.rationale}</p> : null}
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" className="bg-white text-black" onClick={() => start(async () => { const r = await setEdgeStatus(e.id, "approved"); if (r.ok) router.refresh(); else toast.error(r.error); })}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => start(async () => { const r = await setEdgeStatus(e.id, "rejected"); if (r.ok) router.refresh(); })}>
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      ) : null}

      {/* ── Dialogs ── */}
      <Dialog open={!!pendingLink} onOpenChange={(o) => !o && setPendingLink(null)} title="Create a connection" description="A glowing link will travel between the two bodies.">
        {pendingLink ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const a = system.byId.get(pendingLink.from)?.node;
              const b = system.byId.get(pendingLink.to)?.node;
              if (!a || !b) return;
              start(async () => {
                const r = await linkEntities({ from_type: a.type, from_id: a.id, to_type: b.type, to_id: b.id, kind: linkKind });
                if (r.ok) {
                  setPendingLink(null);
                  setSelectedId(a.id);
                  toast.show("Connected");
                  router.refresh();
                } else toast.error(r.error);
              });
            }}
          >
            <p className="text-[13.5px]">
              <strong>{label(pendingLink.from)}</strong> → <strong>{label(pendingLink.to)}</strong>
            </p>
            <Select value={linkKind} onChange={(e) => setLinkKind(e.target.value as EdgeKind)} aria-label="Relationship type">
              {(Object.keys(KIND_LABEL) as EdgeKind[])
                .filter((k) => k !== "belongs_to")
                .map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
            </Select>
            <Button type="submit" className="self-end">
              Connect
            </Button>
          </form>
        ) : null}
      </Dialog>

      <Dialog open={conceptOpen} onOpenChange={setConceptOpen} title="Add a concept star" description="Concepts are free-floating ideas that shine in the outer halo. Connect them to anything.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createConcept(conceptLabel, Math.round(Math.random() * 400 - 200), Math.round(Math.random() * 400 - 200));
              if (r.ok) {
                setConceptOpen(false);
                setConceptLabel("");
                toast.show("A new star appeared in the halo");
                router.refresh();
              } else toast.error(r.error);
            });
          }}
        >
          <Input value={conceptLabel} onChange={(e) => setConceptLabel(e.target.value)} placeholder="e.g. Entropy" autoFocus required aria-label="Concept label" />
          <Button type="submit" className="self-end">
            Add concept
          </Button>
        </form>
      </Dialog>
    </div>
  );
}

function NavRow({ color, title, meta, active, onClick }: { color: string; title: string; meta: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
        active ? "bg-white/[0.09] text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full opacity-40 blur-[6px] transition-opacity group-hover:opacity-80" style={{ background: color }} />
        <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px]">{title}</span>
      <span className="font-mono text-[10px] text-white/35">{meta}</span>
    </button>
  );
}

function DockButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}
