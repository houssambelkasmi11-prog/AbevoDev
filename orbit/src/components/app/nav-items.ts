import {
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  Layers,
  LayoutGrid,
  Orbit,
  Settings,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}

export const NAV: NavItem[] = [
  { href: "/app", label: "Overview", icon: LayoutGrid, shortcut: "G O" },
  { href: "/app/universe", label: "My Universe", icon: Orbit, shortcut: "G U" },
  { href: "/app/notes", label: "Notes", icon: FileText, shortcut: "G N" },
  { href: "/app/lessons", label: "Lessons & Sources", icon: BookOpen, shortcut: "G L" },
  { href: "/app/ai", label: "AI Studio", icon: Sparkles, shortcut: "G A" },
  { href: "/app/homework", label: "Homework Studio", icon: GraduationCap, shortcut: "G H" },
  { href: "/app/practice", label: "Practice", icon: Layers, shortcut: "G P" },
  { href: "/app/focus", label: "Focus Mode", icon: Timer, shortcut: "G F" },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays, shortcut: "G C" },
  { href: "/app/settings", label: "Settings", icon: Settings, shortcut: "G S" },
];

export const MOBILE_TABS = ["/app", "/app/notes", "/app/ai", "/app/practice"];

export function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");
}
