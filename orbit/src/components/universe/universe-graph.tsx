"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowUpRight, Check, Plus, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { NoProviderNotice } from "@/components/app/no-provider";
import { OrbitGlyph, OrbitPulse } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { EdgeKind, EntityType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createConcept, deleteConcept, saveNodePositions, setEdgeStatus, suggestConnections } from "@/server/actions/graph";
import { linkEntities } from "@/server/actions/notes";
import { KIND_LABEL, type GEdge, type GNode } from "./universe-types";

export type { GEdge, GNode } from "./universe-types";

type NodeData = { node: GNode; dim: boolean; fresh: boolean };
type FlowNode = Node<NodeData>;

const DASH: Record<EdgeKind, string | undefined> = {
  belongs_to: "1 5",
  references: undefined,
  builds_upon: undefined,
  related: "4 4",
  prerequisite: undefined,
};

/* ─────────────────────────── Node renderers ─────────────────────────── */

const SubjectNode = memo(function SubjectNode({ data, selected }: NodeProps<FlowNode>) {
  const { node, dim } = data;
  return (
    <div className={cn("group relative flex h-[132px] w-[132px] items-center justify-center rounded-full transition-opacity", dim && "opacity-25")}>
      <div className={cn("absolute inset-0 rounded-full border border-dashed border-ink/25", selected && "border-solid border-ink")} />
      <div className="absolute inset-4 rounded-full border border-ink/10" />
      <div className="relative flex flex-col items-center text-center">
        <OrbitGlyph variant={node.glyph} className="h-9 w-9 text-ink" />
        <span className="mt-2 max-w-[110px] truncate font-mono text-[9px] uppercase tracking-[0.16em] text-ink">{node.label}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!opacity-0 group-hover:!opacity-100" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 group-hover:!opacity-100" />
    </div>
  );
});

const TYPE_MARK: Record<EntityType, string> = { note: "N", source: "S", conversation: "C", assignment: "A", concept: "◇", subject: "" };

const ItemNode = memo(function ItemNode({ data, selected }: NodeProps<FlowNode>) {
  const { node, dim, fresh } = data;
  const size = 12 + Math.min(10, node.degree * 2);
  return (
    <div className={cn("group relative flex items-center gap-2 transition-opacity", dim && "opacity-20", fresh && "animate-[rise_.9s_var(--ease-orbit)_both]")}>
      <Handle type="target" position={Position.Left} className="!opacity-0 group-hover:!opacity-100" />
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full border font-mono text-[7px] transition-transform",
          node.type === "concept" ? "rotate-45 rounded-[3px] border-ink bg-canvas" : node.type === "source" ? "border-ink bg-ink text-canvas" : "border-ink bg-surface text-ink",
          selected && "scale-125 ring-4 ring-ink/10",
        )}
        style={{ width: size, height: size }}
      >
        {node.type !== "concept" && size > 14 ? TYPE_MARK[node.type] : null}
      </span>
      <span className={cn("max-w-[160px] truncate rounded bg-canvas/80 px-1 text-[11px] text-ink-2 backdrop-blur-sm", selected && "text-ink")}>{node.label}</span>
      <Handle type="source" position={Position.Right} className="!opacity-0 group-hover:!opacity-100" />
    </div>
  );
});

const nodeTypes = { subject: SubjectNode, item: ItemNode };

/* ─────────────────────────────── Graph ─────────────────────────────── */

function toFlowNodes(nodes: GNode[], filter: string, freshIds: Set<string>): FlowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type === "subject" ? "subject" : "item",
    position: { x: n.x, y: n.y },
    data: { node: n, dim: !!filter && n.subjectId !== filter && n.id !== filter, fresh: freshIds.has(n.id) },
  }));
}

function toFlowEdges(edges: GEdge[], showSuggested: boolean): Edge[] {
  return edges
    .filter((e) => showSuggested || e.status === "approved")
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "straight",
      label: e.origin === "implicit" ? undefined : KIND_LABEL[e.kind],
      labelStyle: { fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", fill: "var(--ink-2)" },
      labelBgStyle: { fill: "var(--canvas)" },
      style: {
        stroke: e.status === "suggested" ? "var(--ink-2)" : e.origin === "implicit" ? "var(--line-strong)" : "var(--ink)",
        strokeOpacity: e.origin === "implicit" ? 0.6 : e.status === "suggested" ? 0.7 : 0.55,
        strokeWidth: e.kind === "prerequisite" ? 1.6 : 1,
        strokeDasharray: e.status === "suggested" ? "6 4" : DASH[e.kind],
      },
      markerEnd: e.kind === "prerequisite" || e.kind === "builds_upon" ? { type: "arrowclosed" as const, width: 14, height: 14, color: "var(--ink)" } : undefined,
      data: { kind: e.kind, origin: e.origin, status: e.status, rationale: e.rationale },
      selectable: e.origin !== "implicit",
    })) as Edge[];
}

function Graph({ nodes: gNodes, edges: gEdges, subjects, hasProvider, viewSwitch }: { nodes: GNode[]; edges: GEdge[]; subjects: { id: string; name: string }[]; hasProvider: boolean; viewSwitch?: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const flow = useReactFlow();
  const [filter, setFilter] = useState(params.get("focus") ?? "");
  const [query, setQuery] = useState("");
  const [showSuggested, setShowSuggested] = useState(true);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [pendingLink, setPendingLink] = useState<Connection | null>(null);
  const [linkKind, setLinkKind] = useState<EdgeKind>("related");
  const [conceptOpen, setConceptOpen] = useState(false);
  const [conceptLabel, setConceptLabel] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [, start] = useTransition();

  // Knowledge Constellation: items created in the last 24h arrive with a soft entrance.
  const freshIds = useMemo(() => new Set(gNodes.filter((n) => Date.now() - new Date(n.createdAt).getTime() < 86400000).map((n) => n.id)), [gNodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(toFlowNodes(gNodes, filter, freshIds));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(gEdges, showSuggested));

  useEffect(() => setNodes(toFlowNodes(gNodes, filter, freshIds)), [gNodes, filter, freshIds, setNodes]);
  useEffect(() => setEdges(toFlowEdges(gEdges, showSuggested)), [gEdges, showSuggested, setEdges]);

  useEffect(() => {
    if (filter) {
      const t = setTimeout(() => flow.fitView({ nodes: gNodes.filter((n) => n.subjectId === filter || n.id === filter).map((n) => ({ id: n.id })), duration: 600, padding: 0.3 }), 60);
      return () => clearTimeout(t);
    }
  }, [filter, flow, gNodes]);

  const byId = useMemo(() => new Map(gNodes.map((n) => [n.id, n])), [gNodes]);
  const suggested = gEdges.filter((e) => e.status === "suggested");
  const connections = selected ? gEdges.filter((e) => e.status === "approved" && (e.source === selected.id || e.target === selected.id)) : [];

  const onConnect = useCallback((c: Connection) => {
    if (c.source && c.target && c.source !== c.target) setPendingLink(c);
  }, []);

  const search = (q: string) => {
    const hit = gNodes.find((n) => n.label.toLowerCase().includes(q.toLowerCase()));
    if (!hit) return toast.show("No matching node");
    setSelected(hit);
    flow.setCenter(hit.x, hit.y, { zoom: 1.4, duration: 700 });
  };

  return (
    <div className="relative h-[calc(100dvh-56px-64px)] lg:h-[100dvh]">
      <ReactFlow
        className="orbit-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => setSelected(byId.get(n.id) ?? null)}
        onPaneClick={() => setSelected(null)}
        onNodeDragStop={(_, n, dragged) => {
          const moved = (dragged?.length ? dragged : [n]).map((x) => {
            const g = byId.get(x.id);
            return { entity_type: g?.type ?? "note", entity_id: x.id, x: x.position.x, y: x.position.y };
          });
          start(async () => void (await saveNodePositions(moved)));
        }}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: false }}
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="var(--line-strong)" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap pannable zoomable position="bottom-right" nodeColor={() => "var(--ink)"} maskColor="color-mix(in oklab, var(--canvas) 70%, transparent)" className="!hidden md:!block" />
      </ReactFlow>

      {/* Toolbar */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start gap-2 md:inset-x-5 md:top-5">
        <div className="pointer-events-auto rounded-2xl border border-line bg-surface/90 p-3 shadow-soft backdrop-blur">
          <p className="label text-ink-3">01 / My universe</p>
          <p className="mt-0.5 font-display text-[18px] font-bold tracking-tight">
            {gNodes.filter((n) => n.type !== "subject").length} stars · {subjects.length} clusters
          </p>
        </div>
        {viewSwitch ? <div className="pointer-events-auto">{viewSwitch}</div> : null}
        <form
          className="pointer-events-auto relative"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) search(query.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a node…" aria-label="Search nodes" className="h-10 w-48 bg-surface/90 pl-9 backdrop-blur" />
        </form>
        <Select aria-label="Filter by subject" value={filter} onChange={(e) => setFilter(e.target.value)} className="pointer-events-auto w-48 [&_select]:bg-surface/90">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="pointer-events-auto ml-auto flex gap-2">
          <Button variant="outline" className="bg-surface/90 backdrop-blur" onClick={() => setConceptOpen(true)}>
            <Plus className="h-4 w-4" /> Concept
          </Button>
          <Button
            loading={suggesting}
            onClick={async () => {
              setAiError(null);
              setSuggesting(true);
              const r = await suggestConnections();
              setSuggesting(false);
              if (r.ok) {
                toast.show(r.data.length ? `${r.data.length} connections suggested — review them` : "No new connections found");
                setShowSuggested(true);
                router.refresh();
              } else setAiError(r.error);
            }}
            disabled={!hasProvider}
          >
            <Sparkles className="h-4 w-4" /> Suggest connections
          </Button>
        </div>
      </div>

      {/* Side panel: selection or AI suggestions */}
      {(selected || suggested.length || aiError || !hasProvider) && (selected || showSuggested) ? (
        <aside className="absolute bottom-20 right-3 top-24 z-10 flex w-[min(360px,calc(100%-24px))] flex-col overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-lift backdrop-blur md:right-5 md:top-24">
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-line p-4">
                <div className="min-w-0">
                  <Badge>{selected.type}</Badge>
                  <h3 className="mt-2 font-display text-[18px] font-bold leading-tight">{selected.label}</h3>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close" className="rounded p-1 hover:bg-soft">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4" data-lenis-prevent>
                {selected.snippet ? <p className="text-[13px] leading-relaxed text-ink-2">{selected.snippet}</p> : null}
                {selected.href ? (
                  <Link href={selected.href} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-[13px] text-accent-ink">
                    Open <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
                {selected.type === "subject" ? (
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => setFilter(selected.id)}>
                    Focus this cluster
                  </Button>
                ) : null}
                {selected.type === "concept" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-4 text-danger"
                    onClick={() =>
                      start(async () => {
                        await deleteConcept(selected.id);
                        setSelected(null);
                        router.refresh();
                      })
                    }
                  >
                    Delete concept
                  </Button>
                ) : null}
                <p className="label mt-6 text-ink-3">Connections · {connections.length}</p>
                <ul className="mt-2 space-y-1">
                  {connections.map((e) => {
                    const other = byId.get(e.source === selected.id ? e.target : e.source);
                    if (!other) return null;
                    return (
                      <li key={e.id}>
                        <button onClick={() => { setSelected(other); flow.setCenter(other.x, other.y, { zoom: 1.2, duration: 500 }); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-soft">
                          <span className="label w-24 shrink-0 text-ink-3">{KIND_LABEL[e.kind]}</span>
                          <span className="truncate text-[12.5px]">{other.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-[11.5px] text-ink-3">Tip: drag from a node&apos;s edge handle to another node to create a relationship.</p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-line p-4">
                <span className="label text-ink">AI-suggested connections · {suggested.length}</span>
                <button onClick={() => setShowSuggested(false)} aria-label="Hide suggestions" className="rounded p-1 hover:bg-soft">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3" data-lenis-prevent>
                {!hasProvider ? <NoProviderNotice compact message="Connection suggestions use your own AI provider." /> : null}
                {aiError ? <p className="mb-3 text-[12.5px] text-danger">{aiError}</p> : null}
                {suggesting ? <OrbitPulse className="m-2 h-5 w-5 text-ink" /> : null}
                {suggested.length === 0 && hasProvider && !aiError ? <p className="p-2 text-[12.5px] text-ink-2">Ask ORBIT to propose links between your notes and sources. Nothing is saved until you approve it.</p> : null}
                <ul className="space-y-2">
                  {suggested.map((e) => (
                    <li key={e.id} className="rounded-xl border border-dashed border-line-strong p-3">
                      <p className="text-[12.5px]">
                        <span className="font-medium">{byId.get(e.source)?.label}</span> <span className="label text-ink-3">{KIND_LABEL[e.kind]}</span> <span className="font-medium">{byId.get(e.target)?.label}</span>
                      </p>
                      {e.rationale ? <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{e.rationale}</p> : null}
                      <div className="mt-2 flex gap-1">
                        <Button size="sm" onClick={() => start(async () => { const r = await setEdgeStatus(e.id, "approved"); if (r.ok) router.refresh(); })}>
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => start(async () => { const r = await setEdgeStatus(e.id, "rejected"); if (r.ok) router.refresh(); })}>
                          Dismiss
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>
      ) : null}

      <Dialog open={!!pendingLink} onOpenChange={(o) => !o && setPendingLink(null)} title="Create relationship">
        {pendingLink ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const a = byId.get(pendingLink.source ?? "");
              const b = byId.get(pendingLink.target ?? "");
              if (!a || !b) return;
              start(async () => {
                const r = await linkEntities({ from_type: a.type, from_id: a.id, to_type: b.type, to_id: b.id, kind: linkKind });
                if (r.ok) {
                  setPendingLink(null);
                  router.refresh();
                } else toast.error(r.error);
              });
            }}
          >
            <p className="text-[13.5px]">
              <strong>{byId.get(pendingLink.source ?? "")?.label}</strong> → <strong>{byId.get(pendingLink.target ?? "")?.label}</strong>
            </p>
            <Select value={linkKind} onChange={(e) => setLinkKind(e.target.value as EdgeKind)} aria-label="Relationship type">
              {(Object.keys(KIND_LABEL) as EdgeKind[]).map((k) => (
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

      <Dialog open={conceptOpen} onOpenChange={setConceptOpen} title="Add a concept" description="Concepts are free-floating ideas you can connect to anything.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const center = flow.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            start(async () => {
              const r = await createConcept(conceptLabel, center.x, center.y);
              if (r.ok) {
                setConceptOpen(false);
                setConceptLabel("");
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

export function UniverseGraph(props: { nodes: GNode[]; edges: GEdge[]; subjects: { id: string; name: string }[]; hasProvider: boolean; viewSwitch?: React.ReactNode }) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}
