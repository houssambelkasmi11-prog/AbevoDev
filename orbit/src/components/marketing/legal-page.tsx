import Link from "next/link";
import { getLegalDocs } from "@/lib/legal";
import { fillLegal, LEGAL } from "@/lib/legal/config";
import type { LegalKind } from "@/lib/legal/types";
import { getDict } from "@/lib/i18n/dict";
import type { Locale } from "@/lib/i18n/locales";

const ROUTES: Record<LegalKind, string> = { terms: "/terms", privacy: "/privacy", cookies: "/cookies", imprint: "/legal" };

function formatDate(iso: string, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Shared layout for Terms, Privacy, Cookies and Legal notice. Server-rendered, fully localised. */
export function LegalPage({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const doc = getLegalDocs(locale)[kind];
  const t = getDict(locale);
  const labels: Record<LegalKind, string> = { terms: t.common.legal.terms, privacy: t.common.legal.privacy, cookies: t.common.legal.cookies, imprint: t.common.legal.imprint };

  return (
    <section className="bg-void px-5 pb-32 pt-36 text-warm md:px-10 md:pt-44">
      <div className="mx-auto grid max-w-[1200px] gap-14 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label={t.footer.legal} className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {(Object.keys(ROUTES) as LegalKind[]).map((k) => (
              <Link
                key={k}
                href={ROUTES[k]}
                aria-current={k === kind ? "page" : undefined}
                className={
                  k === kind
                    ? "rounded-full border border-warm/60 px-3 py-1.5 text-[13px] text-warm lg:rounded-lg lg:border-0 lg:bg-white/[0.06]"
                    : "rounded-full border border-white/10 px-3 py-1.5 text-[13px] text-silver transition-colors hover:text-warm lg:rounded-lg lg:border-0"
                }
              >
                {labels[k]}
              </Link>
            ))}
          </nav>
          {doc.sections.length > 3 ? (
            <div className="mt-10 hidden lg:block">
              <p className="label text-muted">{t.common.legal.contents}</p>
              <ol className="mt-4 space-y-2 text-[12.5px] text-muted">
                {doc.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="transition-colors hover:text-warm">
                      {s.h}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </aside>

        <article className="min-w-0 max-w-3xl">
          <p className="label text-muted">
            {t.common.legal.updated}: {formatDate(LEGAL.updated, locale)} · v{LEGAL.version}
          </p>
          <h1 data-reveal className="display mt-6 text-[clamp(2.6rem,6vw,4.75rem)]">
            {doc.title}
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-silver">{doc.summary}</p>
          {t.common.legal.prevail ? <p className="mt-4 rounded-xl border border-white/10 px-4 py-3 text-[12.5px] leading-relaxed text-muted">{t.common.legal.prevail}</p> : null}

          <div className="mt-12 space-y-12">
            {doc.sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28 border-t border-white/10 pt-8">
                <h2 className="font-display text-[22px] font-bold tracking-tight">{s.h}</h2>
                <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-silver">
                  {s.body.map((p, i) =>
                    p.startsWith("• ") ? (
                      <p key={i} className="flex gap-3 ps-1">
                        <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-white/40" />
                        <span>{fillLegal(p.slice(2))}</span>
                      </p>
                    ) : (
                      <p key={i}>{fillLegal(p)}</p>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>

          <Link href="/" className="mt-16 inline-flex font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-warm">
            ← {t.common.legal.back}
          </Link>
        </article>
      </div>
    </section>
  );
}
