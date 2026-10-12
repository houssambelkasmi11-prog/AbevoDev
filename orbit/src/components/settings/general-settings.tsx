"use client";

import { Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { OrbitGlyph } from "@/components/brand/logo";
import { Panel } from "@/components/app/page-header";
import { NewSubjectDialog } from "@/components/app/create-menu";
import { useTheme } from "@/components/app/theme";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { SettingsRow, SubjectRow, ThemePref, WorkspaceRow } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import {
  changePassword,
  deleteAccount,
  deleteSubject,
  deleteWorkspace,
  listMySessions,
  renameWorkspace,
  revokeMySession,
  signOutEverywhereElse,
  updateSettings,
  updateSubject,
} from "@/server/actions/workspace";

export function GeneralSettings({
  settings,
  email,
  workspace,
  workspaceCount,
  subjects,
  backend,
  personas,
}: {
  settings: SettingsRow;
  email: string;
  workspace: WorkspaceRow;
  workspaceCount: number;
  subjects: SubjectRow[];
  backend: "local" | "supabase";
  personas: { id: string; name: string }[];
}) {
  const toast = useToast();
  const router = useRouter();
  const { pref, setPref } = useTheme();
  const [s, setS] = useState(settings);
  const [pending, start] = useTransition();
  const [wsName, setWsName] = useState(workspace.name);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null);
  const [removeSubject, setRemoveSubject] = useState<SubjectRow | null>(null);
  const [removeWs, setRemoveWs] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [sessions, setSessions] = useState<{ id: string; created_at: string; last_seen_at: string; user_agent: string | null; current: boolean }[]>([]);

  useEffect(() => {
    if (backend !== "local") return;
    listMySessions().then((r) => r.ok && setSessions(r.data));
  }, [backend]);

  const save = (patch: Partial<SettingsRow>) => {
    setS((x) => ({ ...x, ...patch }));
    start(async () => {
      const r = await updateSettings(patch);
      if (!r.ok) toast.error(r.error);
    });
  };

  return (
    <div className="grid gap-6">
      <Panel title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input defaultValue={s.display_name ?? ""} onBlur={(e) => e.target.value !== (s.display_name ?? "") && save({ display_name: e.target.value.trim() || null })} />
          </Field>
          <Field label="Email">
            <Input value={email} disabled />
          </Field>
          <Field label="Preferred AI language">
            <Input defaultValue={s.language} onBlur={(e) => e.target.value.trim() && e.target.value !== s.language && save({ language: e.target.value.trim() })} />
          </Field>
          <Field label="Default personality">
            <Select value={s.default_persona_id ?? ""} onChange={(e) => save({ default_persona_id: e.target.value || null })}>
              <option value="">None (ORBIT neutral)</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel title="Appearance">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
          {(
            [
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
              ["system", "System", Monitor],
            ] as [ThemePref, string, typeof Sun][]
          ).map(([k, l, Icon]) => (
            <button
              key={k}
              role="radio"
              aria-checked={pref === k}
              onClick={() => setPref(k)}
              className={cn("flex h-20 flex-col items-center justify-center gap-2 rounded-xl border text-[13px]", pref === k ? "border-ink bg-soft" : "border-line hover:border-ink-2")}
            >
              <Icon className="h-4 w-4" /> {l}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Study preferences">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Daily goal (min)">
            <Input type="number" min={10} max={960} defaultValue={s.daily_goal_minutes} onBlur={(e) => save({ daily_goal_minutes: Number(e.target.value) })} />
          </Field>
          <Field label="Focus (min)">
            <Input type="number" min={5} max={180} defaultValue={s.focus_minutes} onBlur={(e) => save({ focus_minutes: Number(e.target.value) })} />
          </Field>
          <Field label="Short break">
            <Input type="number" min={1} max={60} defaultValue={s.break_minutes} onBlur={(e) => save({ break_minutes: Number(e.target.value) })} />
          </Field>
          <Field label="Long break">
            <Input type="number" min={5} max={90} defaultValue={s.long_break_minutes} onBlur={(e) => save({ long_break_minutes: Number(e.target.value) })} />
          </Field>
        </div>
        <label className="mt-4 flex items-center gap-3 text-[13.5px]">
          <input
            type="checkbox"
            checked={s.notifications}
            onChange={async (e) => {
              const on = e.target.checked;
              if (on && "Notification" in window && Notification.permission !== "granted") {
                const p = await Notification.requestPermission();
                if (p !== "granted") return toast.error("Notifications were blocked by the browser.");
              }
              save({ notifications: on });
            }}
            className="accent-[var(--ink)]"
          />
          Notify me when a focus session or break ends
        </label>
      </Panel>

      <Panel
        title="Workspace & subjects"
        action={
          <Button size="sm" variant="outline" onClick={() => setSubjectOpen(true)}>
            New subject
          </Button>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Workspace name" className="flex-1">
            <Input value={wsName} onChange={(e) => setWsName(e.target.value)} />
          </Field>
          <Button
            variant="secondary"
            disabled={wsName.trim() === workspace.name}
            onClick={() =>
              start(async () => {
                const r = await renameWorkspace(workspace.id, wsName);
                if (r.ok) {
                  toast.show("Workspace renamed");
                  router.refresh();
                } else toast.error(r.error);
              })
            }
          >
            Rename
          </Button>
          {workspaceCount > 1 ? (
            <Button variant="ghost" className="text-danger" onClick={() => setRemoveWs(true)}>
              Delete workspace
            </Button>
          ) : null}
        </div>
        <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
          {subjects.length === 0 ? <li className="px-4 py-4 text-[13px] text-ink-2">No subjects yet. Subjects become clusters in My Universe.</li> : null}
          {subjects.map((sub) => (
            <li key={sub.id} className="flex items-center gap-3 px-4 py-3">
              <OrbitGlyph variant={sub.glyph} className="h-6 w-6" />
              <span className="flex-1 text-[13.5px]">
                {sub.name} {sub.code ? <span className="font-mono text-[11px] text-ink-3">{sub.code}</span> : null}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setEditingSubject(sub)}>
                Edit
              </Button>
              <button onClick={() => setRemoveSubject(sub)} aria-label={`Delete ${sub.name}`} className="rounded p-1.5 text-ink-3 hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Security">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await changePassword(pw.current, pw.next);
              if (r.ok) {
                toast.show("Password changed");
                setPw({ current: "", next: "" });
              } else toast.error(r.error);
            });
          }}
        >
          {backend === "local" ? (
            <Field label="Current password">
              <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required />
            </Field>
          ) : (
            <span />
          )}
          <Field label="New password">
            <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" minLength={8} required />
          </Field>
          <Button type="submit" variant="secondary" loading={pending}>
            Change password
          </Button>
        </form>
        {backend === "local" ? (
          <div className="mt-6">
            <p className="label mb-2 text-ink-3">Active sessions</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {sessions.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate">{x.user_agent ?? "Unknown device"}</span>
                  <span className="text-ink-3">{relativeTime(x.created_at)}</span>
                  {x.current ? (
                    <span className="label text-ink">This device</span>
                  ) : (
                    <button
                      className="label text-danger"
                      onClick={() =>
                        start(async () => {
                          await revokeMySession(x.id);
                          setSessions((ss) => ss.filter((y) => y.id !== x.id));
                        })
                      }
                    >
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() =>
            start(async () => {
              const r = await signOutEverywhereElse();
              if (r.ok) {
                toast.show("Signed out of all other sessions");
                setSessions((ss) => ss.filter((x) => x.current));
              } else toast.error(r.error);
            })
          }
        >
          Sign out everywhere else
        </Button>
      </Panel>

      <Panel title="Data & privacy" className="border-danger/30">
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          Permanently delete your account, every note, source, conversation, flashcard, study session and stored API key. This cannot be undone.
        </p>
        <Button variant="danger" className="mt-4" onClick={() => setDeleteOpen(true)}>
          Delete account and all data
        </Button>
      </Panel>

      <NewSubjectDialog open={subjectOpen} onOpenChange={setSubjectOpen} />

      <Dialog open={!!editingSubject} onOpenChange={(o) => !o && setEditingSubject(null)} title="Edit subject">
        {editingSubject ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const r = await updateSubject(editingSubject.id, {
                  name: String(fd.get("name")),
                  code: String(fd.get("code") || "") || null,
                  glyph: Number(fd.get("glyph")),
                });
                if (r.ok) {
                  setEditingSubject(null);
                  router.refresh();
                } else toast.error(r.error);
              });
            }}
          >
            <Field label="Name">
              <Input name="name" defaultValue={editingSubject.name} required />
            </Field>
            <Field label="Course code">
              <Input name="code" defaultValue={editingSubject.code ?? ""} />
            </Field>
            <Field label="Glyph">
              <Select name="glyph" defaultValue={String(editingSubject.glyph)}>
                {[0, 1, 2, 3, 4, 5].map((g) => (
                  <option key={g} value={g}>
                    Orbit {g + 1}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" loading={pending} className="self-end">
              Save
            </Button>
          </form>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={!!removeSubject}
        onOpenChange={(o) => !o && setRemoveSubject(null)}
        title={`Delete “${removeSubject?.name}”?`}
        body="Notes, sources and other items in this subject are kept — they're simply no longer assigned to it."
        destructive
        confirmLabel="Delete subject"
        onConfirm={() =>
          start(async () => {
            if (!removeSubject) return;
            const r = await deleteSubject(removeSubject.id);
            setRemoveSubject(null);
            if (r.ok) router.refresh();
            else toast.error(r.error);
          })
        }
      />

      <ConfirmDialog
        open={removeWs}
        onOpenChange={setRemoveWs}
        title={`Delete workspace “${workspace.name}”?`}
        body="Everything inside this workspace — notes, sources, chats, assignments, practice and plans — is permanently deleted."
        destructive
        confirmLabel="Delete workspace"
        onConfirm={() =>
          start(async () => {
            const r = await deleteWorkspace(workspace.id);
            setRemoveWs(false);
            if (r.ok) router.refresh();
            else toast.error(r.error);
          })
        }
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete your account">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await deleteAccount(confirmEmail);
              if (r && !r.ok) toast.error(r.error);
            });
          }}
        >
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            Type <strong className="text-ink">{email}</strong> to confirm permanent deletion.
          </p>
          <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} aria-label="Confirm email" autoComplete="off" />
          <Button type="submit" variant="danger" loading={pending} disabled={confirmEmail.trim().toLowerCase() !== email.toLowerCase()}>
            Permanently delete everything
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
