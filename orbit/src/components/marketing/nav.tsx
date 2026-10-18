"use client";

import * as RD from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { Magnetic } from "./magnetic";
import { scrollToHash } from "./smooth-scroll";
import { playWarp } from "@/components/fx/warp";
import { LanguageSwitcher } from "@/components/legal/language-switcher";
import { useI18n } from "@/lib/i18n/client";

const LINKS = [
  { href: "/#platform", key: "platform" },
  { href: "/features", key: "features" },
  { href: "/how-it-works", key: "how" },
  { href: "/models", key: "models" },
  { href: "/about", key: "about" },
] as const;

export function MarketingNav() {
  const [signedIn, setSignedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { signedIn?: boolean } | null) => {
        if (!cancelled && d?.signedIn) setSignedIn(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (href: string) => (e: React.MouseEvent) => {
    const [path, hash] = href.split("#");
    if (hash && (path === "" || path === "/") && pathname === "/") {
      e.preventDefault();
      setOpen(false);
      scrollToHash(`#${hash}`);
    } else if (open) {
      setOpen(false);
    }
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 md:px-5 md:pt-4">
      <nav
        aria-label="Primary"
        className={cn(
          "pointer-events-auto flex w-full max-w-[1400px] items-center justify-between rounded-2xl border px-4 transition-all duration-500 ease-[var(--ease-orbit)] md:px-5",
          scrolled ? "h-14 border-white/10 bg-[rgba(10,11,13,0.62)] backdrop-blur-xl" : "h-16 border-transparent bg-transparent",
        )}
      >
        <Link href="/" aria-label="ORBIT home" className="text-warm">
          <Wordmark />
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => {
            const active = l.href === pathname;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={go(l.href)}
                  aria-current={active ? "page" : undefined}
                  className="group relative py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-silver transition-colors hover:text-warm"
                >
                  {t.nav[l.key]}
                  {active ? (
                    <motion.span layoutId="site-nav-active" transition={{ type: "spring", stiffness: 420, damping: 38 }} className="absolute inset-x-0 -bottom-0.5 h-px bg-warm" />
                  ) : (
                    <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-warm/60 transition-transform duration-500 ease-[var(--ease-orbit)] group-hover:scale-x-100" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-5 lg:flex">
          {signedIn ? null : (
            <Link href="/sign-in" className="font-mono text-[11px] uppercase tracking-[0.16em] text-silver transition-colors hover:text-warm">
              {t.nav.signIn}
            </Link>
          )}
          <Magnetic>
            <Link
              href={signedIn ? "/app" : "/sign-up"}
              className="inline-flex h-10 items-center rounded-full bg-warm px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-void transition-transform duration-300 hover:scale-[1.04]"
            >
              {signedIn ? t.nav.open : t.nav.enter}
            </Link>
          </Magnetic>
        </div>

        <RD.Root open={open} onOpenChange={setOpen}>
          <RD.Trigger asChild>
            <button aria-label={open ? "Close menu" : "Open menu"} className="relative z-[70] -mr-1 flex h-10 w-10 items-center justify-center text-warm lg:hidden">
              <span className="relative block h-3 w-6">
                <span className={cn("absolute left-0 top-0 h-px w-6 bg-current transition-transform duration-500 ease-[var(--ease-orbit)]", open && "translate-y-1.5 rotate-45")} />
                <span className={cn("absolute bottom-0 left-0 h-px w-6 bg-current transition-transform duration-500 ease-[var(--ease-orbit)]", open && "-translate-y-1.5 -rotate-45")} />
              </span>
            </button>
          </RD.Trigger>
          <RD.Portal>
            <RD.Content
              className="fixed inset-0 z-[60] flex flex-col bg-void px-6 pb-10 pt-24 text-warm focus:outline-none"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <RD.Title className="sr-only">Menu</RD.Title>
              <RD.Description className="sr-only">Site navigation</RD.Description>
              <div className="absolute left-6 top-6">
                <Wordmark />
              </div>
              <RD.Close asChild>
                <button aria-label="Close menu" className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center">
                  <span className="relative block h-3 w-6">
                    <span className="absolute left-0 top-1.5 h-px w-6 rotate-45 bg-current" />
                    <span className="absolute left-0 top-1.5 h-px w-6 -rotate-45 bg-current" />
                  </span>
                </button>
              </RD.Close>
              <ul className="flex flex-col gap-1">
                {LINKS.map((l, i) => (
                  <motion.li key={l.href} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i + 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                    <Link href={l.href} onClick={go(l.href)} className="flex items-baseline gap-4 py-2">
                      <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                      <span className="display text-[2.6rem]">{t.nav[l.key]}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-3">
                {signedIn ? null : (
                  <button onClick={() => { setOpen(false); playWarp({ label: "Approaching ORBIT", mode: "approach" }); router.push("/sign-in"); }} className="h-12 rounded-full border border-white/15 font-mono text-[11px] uppercase tracking-[0.2em]">
                    {t.nav.signIn}
                  </button>
                )}
                <button onClick={() => { setOpen(false); playWarp(signedIn ? { label: "Entering your universe", mode: "enter" } : { label: "Preparing your universe", mode: "approach" }); router.push(signedIn ? "/app" : "/sign-up"); }} className="h-12 rounded-full bg-warm font-mono text-[11px] uppercase tracking-[0.2em] text-void">
                  {signedIn ? t.nav.open : t.nav.enter}
                </button>
                <LanguageSwitcher className="mt-2 self-center" />
              </div>
            </RD.Content>
          </RD.Portal>
        </RD.Root>
      </nav>
    </header>
  );
}
