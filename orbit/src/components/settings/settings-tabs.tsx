"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TabUnderline } from "@/components/fx/motion-kit";

const TABS = [
  { href: "/app/settings", label: "General" },
  { href: "/app/settings/providers", label: "AI Providers" },
  { href: "/app/settings/personalities", label: "Personalities" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="mt-8 flex gap-1 border-b border-line">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn("relative px-3 pb-3 pt-1 text-[13.5px] transition-colors duration-300", active ? "text-ink" : "text-ink-2 hover:text-ink")}
          >
            {t.label}
            {active ? <TabUnderline id="settings-tabs" className="inset-x-3" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
