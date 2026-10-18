"use client";

import * as DM from "@radix-ui/react-dropdown-menu";
import * as RD from "@radix-ui/react-dialog";
import { ChevronsUpDown, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, ShieldCheck, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import { Suspense, useEffect, useState, useTransition } from "react";
import { OrbitSymbol } from "@/components/brand/logo";
import { AmbientShader } from "@/components/fx/ambient-shader";
import { RouteProgress } from "@/components/fx/route-progress";
import { Spotlight } from "@/components/fx/spotlight";
import { Kbd } from "@/components/ui/field";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { ThemePref, WorkspaceRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/actions/auth";
import { createWorkspace, switchWorkspace } from "@/server/actions/workspace";
import { CommandPalette } from "./command-palette";
import { AIStatusButton, ConnectAIProvider, type AIState } from "./connect-ai";
import { WarpArrival, playWarp } from "@/components/fx/warp";
import { useFxLevel } from "@/components/fx/fx-prefs";
import { useSwipe } from "@/components/fx/motion-kit";
import { NavIcon } from "./nav-motion";
import { useI18n } from "@/lib/i18n/client";
import { CreateMenu } from "./create-menu";
import { isActive, MOBILE_TABS, NAV } from "./nav-items";
import { ThemeProvider, useTheme } from "./theme";

export interface ShellProps {
  user: { email: string; name: string | null };
  theme: ThemePref;
  workspace: WorkspaceRow;
  workspaces: WorkspaceRow[];
  backend: "local" | "supabase";
  ai: AIState;
  admin?: boolean;
  children: React.ReactNode;
}

export function AppShell(props: ShellProps) {
  const fx = useFxLevel();
  return (
    <MotionConfig reducedMotion={fx === "off" ? "always" : "user"}>
    <ThemeProvider initial={props.theme}>
      <ToastProvider>
        <ConnectAIProvider initial={props.ai}>
          <ShellInner {...props} />
        </ConnectAIProvider>
      </ToastProvider>
    </ThemeProvider>
    </MotionConfig>
  );
}

function ShellInner({ user, workspace, workspaces, admin, children }: ShellProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const focusMode = pathname.startsWith("/app/focus");
  const router = useRouter();
  // On phones, swipe sideways on a main tab to move to its neighbour in the tab bar.
  const mobileIdx = MOBILE_TABS.indexOf(pathname);
  const goTab = (d: number) => {
    if (typeof window === "undefined" || window.innerWidth >= 1024 || mobileIdx < 0) return;
    const next = MOBILE_TABS[mobileIdx + d];
    if (next) router.push(next);
  };
  const tabSwipe = useSwipe({ onLeft: mobileIdx >= 0 && mobileIdx < MOBILE_TABS.length - 1 ? () => goTab(1) : undefined, onRight: mobileIdx > 0 ? () => goTab(-1) : undefined, threshold: 90 });

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("orbit-sidebar") === "collapsed");
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => setDrawer(false), [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("orbit-sidebar", c ? "open" : "collapsed");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <div className="relative isolate flex min-h-[100dvh] bg-canvas text-ink">
      {/* Living shader backdrop + global motion helpers */}
      {focusMode || pathname.startsWith("/app/universe") ? null : <AmbientShader />}
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <Spotlight />
      <WarpArrival />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-[1] hidden h-[100dvh] shrink-0 flex-col border-r border-line bg-canvas/70 transition-[width] duration-300 ease-[var(--ease-orbit)] lg:flex",
          collapsed ? "w-[68px]" : "w-[248px]",
        )}
        aria-label="Workspace navigation"
      >
        <SidebarContent pillId="nav-pill-desktop" collapsed={collapsed} workspace={workspace} workspaces={workspaces} user={user} admin={admin} onSearch={() => setPaletteOpen(true)} />
        <button
          onClick={toggleCollapsed}
          className="mx-3 mb-3 flex h-9 items-center gap-3 rounded-lg px-2.5 text-[12.5px] text-ink-2 hover:bg-soft hover:text-ink"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {collapsed ? null : <span>{t.app.collapse}</span>}
        </button>
      </aside>

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-3 backdrop-blur-xl lg:hidden">
          <button onClick={() => setDrawer(true)} aria-label="Open navigation" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-soft">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/app" className="flex items-center gap-2" aria-label="Overview">
            <OrbitSymbol className="h-5 w-5" />
            <span className="font-display text-[13px] font-bold tracking-[0.3em]">ORBIT</span>
          </Link>
          <button onClick={() => setPaletteOpen(true)} aria-label="Search" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-soft">
            <Search className="h-5 w-5" />
          </button>
        </header>

        <main id="main" {...tabSwipe} className={cn("min-w-0 flex-1", !focusMode && "pb-24 lg:pb-0")}>
          {children}
        </main>

        {/* Mobile tab bar */}
        {!focusMode ? (
          <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
            <ul className="grid grid-cols-5">
              {NAV.filter((n) => MOBILE_TABS.includes(n.href)).map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={isActive(pathname, n.href) ? "page" : undefined}
                    className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[10px] transition-colors", isActive(pathname, n.href) ? "text-ink" : "text-ink-3")}
                  >
                    {isActive(pathname, n.href) ? (
                      <motion.span layoutId="mobile-tab-orbit" className="absolute top-0 h-[2px] w-8 rounded-full bg-ink" transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.8 }} />
                    ) : null}
                    <NavIcon href={n.href} active={isActive(pathname, n.href)}>
                      <n.icon className="h-5 w-5" />
                    </NavIcon>
                    <span className="max-w-[68px] truncate">{(t.app.nav[n.href] ?? n.label).split(" ")[0]}</span>
                  </Link>
                </li>
              ))}
              <li className="flex items-center justify-center">
                <CreateMenu compact className="h-11 w-11 rounded-2xl" />
              </li>
            </ul>
          </nav>
        ) : null}
      </div>

      {/* Mobile drawer */}
      <RD.Root open={drawer} onOpenChange={setDrawer}>
        <RD.Portal>
          <RD.Overlay className="fx-overlay fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px] lg:hidden" />
          <RD.Content className="fx-drawer fixed inset-y-0 left-0 z-[71] flex w-[min(300px,86vw)] flex-col border-r border-line bg-canvas text-ink focus:outline-none lg:hidden">
            <RD.Title className="sr-only">Navigation</RD.Title>
            <RD.Description className="sr-only">Workspace navigation</RD.Description>
            <RD.Close asChild>
              <button aria-label="Close navigation" className="absolute right-3 top-3 z-10 rounded-lg p-2 hover:bg-soft">
                <X className="h-4 w-4" />
              </button>
            </RD.Close>
            <SidebarContent pillId="nav-pill-drawer" collapsed={false} workspace={workspace} workspaces={workspaces} user={user} admin={admin} onSearch={() => { setDrawer(false); setPaletteOpen(true); }} />
          </RD.Content>
        </RD.Portal>
      </RD.Root>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function SidebarContent({
  pillId,
  collapsed,
  workspace,
  workspaces,
  user,
  admin,
  onSearch,
}: {
  pillId: string;
  collapsed: boolean;
  workspace: WorkspaceRow;
  workspaces: WorkspaceRow[];
  user: { email: string; name: string | null };
  admin?: boolean;
  onSearch: () => void;
}) {
  const pathname = usePathname();
  const { resolved, toggle } = useTheme();
  const { t } = useI18n();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("flex h-16 items-center px-4", collapsed && "justify-center px-0")}>
        <Link href="/app" className="flex items-center gap-2.5" aria-label="ORBIT overview">
          <OrbitSymbol className="h-6 w-6" />
          {collapsed ? null : <span className="font-display text-[14px] font-bold tracking-[0.32em]">ORBIT</span>}
        </Link>
      </div>

      <div className={cn("px-3", collapsed && "px-2")}>
        <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} collapsed={collapsed} />
        <div className={cn("mt-3 flex gap-2", collapsed && "flex-col items-center")}>
          <CreateMenu compact={collapsed} />
          <button
            onClick={onSearch}
            aria-label="Search (Ctrl K)"
            className={cn("flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-line text-ink-2 hover:bg-soft hover:text-ink", collapsed ? "w-9" : "w-auto px-2.5")}
          >
            <Search className="h-4 w-4" />
            {collapsed ? null : <Kbd>⌘K</Kbd>}
          </button>
        </div>
      </div>

      <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-3" aria-label="Sections">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? t.app.nav[n.href] ?? n.label : undefined}
                  className={cn(
                    "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors",
                    active ? "text-ink" : "text-ink-2 hover:bg-soft/70 hover:text-ink",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId={pillId}
                      className="absolute inset-0 rounded-lg bg-surface shadow-soft"
                      transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.8 }}
                    >
                      <span className="absolute -left-3 top-2 h-5 w-[2px] rounded-full bg-ink" />
                    </motion.span>
                  ) : null}
                  <NavIcon href={n.href} active={active} className="relative shrink-0">
                    <n.icon className="h-[17px] w-[17px] transition-transform duration-300 ease-[var(--ease-orbit)] group-hover:scale-110" strokeWidth={1.7} />
                  </NavIcon>
                  {collapsed ? null : <span className="relative truncate transition-transform duration-300 ease-[var(--ease-orbit)] group-hover:translate-x-0.5">{t.app.nav[n.href] ?? n.label}</span>}
                </Link>
              </li>
            );
          })}
          {admin ? (
            <li className="mt-2 border-t border-line pt-2">
              <Link
                href="/app/admin"
                aria-current={isActive(pathname, "/app/admin") ? "page" : undefined}
                title={collapsed ? "Admin" : undefined}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors",
                  isActive(pathname, "/app/admin") ? "bg-surface text-ink shadow-soft" : "text-ink-2 hover:bg-soft/70 hover:text-ink",
                  collapsed && "justify-center px-0",
                )}
              >
                <ShieldCheck className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
                {collapsed ? null : <span className="truncate">Admin</span>}
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      <div className={cn("px-3 pb-2", collapsed && "px-2")}>
        <AIStatusButton collapsed={collapsed} />
      </div>
      <div className={cn("border-t border-line p-3", collapsed && "flex flex-col items-center gap-2 px-2")}>
        <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
          <DM.Root>
            <DM.Trigger asChild>
              <button className={cn("flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-soft", collapsed && "flex-none")} aria-label="Account menu">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[11px] uppercase text-canvas">
                  {(user.name ?? user.email).slice(0, 1)}
                </span>
                {collapsed ? null : (
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium">{user.name ?? "Student"}</span>
                    <span className="block truncate text-[11px] text-ink-2">{user.email}</span>
                  </span>
                )}
              </button>
            </DM.Trigger>
            <DM.Portal>
              <DM.Content side="top" align="start" sideOffset={8} className="z-[90] min-w-[200px] rounded-xl border border-line bg-surface p-1.5 text-ink shadow-lift">
                <DM.Item asChild>
                  <Link href="/app/settings" className="flex items-center rounded-lg px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-soft">
                    {t.app.settings}
                  </Link>
                </DM.Item>
                <DM.Item asChild>
                  <Link href="/" className="flex items-center rounded-lg px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-soft">
                    {t.app.publicSite}
                  </Link>
                </DM.Item>
                <DM.Separator className="my-1 h-px bg-line" />
                <DM.Item
                  onSelect={() => {
                    void signOutAction();
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-soft"
                >
                  <LogOut className="h-3.5 w-3.5" /> {t.app.signOut}
                </DM.Item>
              </DM.Content>
            </DM.Portal>
          </DM.Root>
          <button onClick={toggle} aria-label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="rounded-lg p-2 text-ink-2 hover:bg-soft hover:text-ink">
            {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkspaceSwitcher({ workspace, workspaces, collapsed }: { workspace: WorkspaceRow; workspaces: WorkspaceRow[]; collapsed: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  return (
    <>
      <DM.Root>
        <DM.Trigger asChild>
          <button
            className={cn("flex h-10 w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 text-left shadow-soft", collapsed && "justify-center px-0", pending && "opacity-60")}
            aria-label={`Workspace: ${workspace.name}. Switch workspace`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-soft font-mono text-[10px] uppercase">{workspace.name.slice(0, 2)}</span>
            {collapsed ? null : (
              <>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{workspace.name}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-ink-3" />
              </>
            )}
          </button>
        </DM.Trigger>
        <DM.Portal>
          <DM.Content align="start" sideOffset={6} className="z-[90] min-w-[230px] rounded-xl border border-line bg-surface p-1.5 text-ink shadow-lift">
            <DM.Label className="label px-2.5 py-1.5 text-ink-3">Workspaces</DM.Label>
            {workspaces.map((w) => (
              <DM.Item
                key={w.id}
                onSelect={() =>
                  start(async () => {
                    if (w.id === workspace.id) return;
                    playWarp({ label: w.name, mode: "switch" });
                    const r = await switchWorkspace(w.id);
                    if (!r.ok) toast.error(r.error);
                    router.refresh();
                  })
                }
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-soft"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-soft font-mono text-[9px] uppercase">{w.name.slice(0, 2)}</span>
                <span className="flex-1 truncate">{w.name}</span>
                {w.id === workspace.id ? <span className="h-1.5 w-1.5 rounded-full bg-ink" /> : null}
              </DM.Item>
            ))}
            <DM.Separator className="my-1 h-px bg-line" />
            <DM.Item onSelect={() => setCreating(true)} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-soft">
              <Plus className="h-3.5 w-3.5" /> New workspace
            </DM.Item>
          </DM.Content>
        </DM.Portal>
      </DM.Root>
      <Dialog open={creating} onOpenChange={setCreating} title="New workspace" description="Keep separate universes — e.g. one per semester or school.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createWorkspace({ name });
              if (r.ok) {
                setCreating(false);
                setName("");
                router.refresh();
              } else toast.error(r.error);
            });
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring semester" aria-label="Workspace name" autoFocus required />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
