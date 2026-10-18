"use client";

import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Badge, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { AdminOverview } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";
import { setAdmin } from "@/server/actions/admin";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

export function AdminDashboard({ data, meEmail, backend }: { data: AdminOverview; meEmail: string; backend: "local" | "supabase" }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState(data.users);
  const [pending, start] = useTransition();
  const t = data.totals;

  const shown = useMemo(() => users.filter((u) => u.email.toLowerCase().includes(q.trim().toLowerCase())), [users, q]);

  // last 30 days of signups as a bar strip
  const days = useMemo(() => {
    const map = new Map(data.signups.map((s) => [String(s.day).slice(0, 10), Number(s.n)]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10);
      return { d, n: map.get(d) ?? 0 };
    });
  }, [data.signups]);
  const maxDay = Math.max(1, ...days.map((d) => d.n));

  const stats: [string, number | string][] = [
    ["Users", t.users],
    ["Active · 7 days", t.active7],
    ["Notes", t.notes],
    ["Sources", t.sources],
    ["Assignments", t.assignments],
    ["AI messages", t.messages],
    ["Flashcards", t.flashcards],
    ["Focus minutes", t.focus_minutes],
  ];

  const toggle = (id: string, make: boolean) =>
    start(async () => {
      const r = await setAdmin(id, make);
      if (r.ok) {
        setUsers((us) => us.map((u) => (u.id === id ? { ...u, admin: make } : u)));
        toast.show(make ? "Admin added" : "Admin removed");
      } else toast.error(r.error);
    });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-10 md:py-10">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="label text-ink-3">ORBIT · Admin</p>
          <h1 className="mt-2 font-display text-[clamp(1.9rem,4vw,2.8rem)] font-bold tracking-[-0.035em]">Control room</h1>
        </div>
        <span className="ml-auto flex items-center gap-2 text-[12px] text-ink-2">
          <ShieldCheck className="h-3.5 w-3.5" /> Signed in as {meEmail} · {backend}
        </span>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-5">
            <p className="label text-ink-3">{label}</p>
            <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-tight">{Number(value).toLocaleString("en-GB")}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <p className="label text-ink-3">Sign-ups · last 30 days</p>
          <p className="font-mono text-[11px] text-ink-2">{days.reduce((a, d) => a + d.n, 0)} total</p>
        </div>
        <div className="mt-4 flex h-28 items-end gap-1" role="img" aria-label="Sign-ups per day over the last 30 days">
          {days.map((d) => (
            <div key={d.d} className="group relative flex-1">
              <div className={cn("w-full rounded-t-sm", d.n ? "bg-ink" : "bg-line")} style={{ height: `${d.n ? Math.max(8, (d.n / maxDay) * 112) : 3}px` }} />
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 font-mono text-[10px] text-canvas group-hover:block">
                {d.d.slice(5)} · {d.n}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <p className="label text-ink-3">Users · {users.length}</p>
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email" className="h-9 pl-8 text-[13px]" aria-label="Search users" />
          </div>
        </div>
        <div className="overflow-x-auto" data-no-swipe>
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="label text-ink-3">
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Joined</th>
                <th className="px-4 py-3 font-normal">Last active</th>
                <th className="px-4 py-3 text-right font-normal">Notes</th>
                <th className="px-4 py-3 text-right font-normal">Sources</th>
                <th className="px-4 py-3 text-right font-normal">Homework</th>
                <th className="px-4 py-3 text-right font-normal">AI msgs</th>
                <th className="px-4 py-3 text-right font-normal">Role</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const me = u.email.toLowerCase() === meEmail.toLowerCase();
                return (
                  <tr key={u.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <span className="font-medium">{u.email}</span>
                      {me ? <span className="ml-2 text-[11px] text-ink-3">(you)</span> : null}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{fmt(u.created_at)}</td>
                    <td className="px-4 py-3 text-ink-2">{ago(u.last_sign_in_at)}</td>
                    <td className="px-4 py-3 text-right font-mono">{u.notes}</td>
                    <td className="px-4 py-3 text-right font-mono">{u.sources}</td>
                    <td className="px-4 py-3 text-right font-mono">{u.assignments}</td>
                    <td className="px-4 py-3 text-right font-mono">{u.messages}</td>
                    <td className="px-4 py-3 text-right">
                      {u.admin ? <Badge tone="solid">Admin</Badge> : <Badge>User</Badge>}
                      {backend === "supabase" && !me ? (
                        <button
                          disabled={pending}
                          onClick={() => toggle(u.id, !u.admin)}
                          className="ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-ink-2 hover:bg-soft hover:text-ink disabled:opacity-50"
                          aria-label={u.admin ? `Remove admin from ${u.email}` : `Make ${u.email} admin`}
                        >
                          {u.admin ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                          {u.admin ? "Revoke" : "Make admin"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-2">No users match.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-4 text-[11.5px] text-ink-3">Only counts and account dates are shown here. Users&apos; notes, chats and homework content stay private.</p>
    </div>
  );
}
