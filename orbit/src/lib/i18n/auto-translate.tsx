"use client";

import { useEffect } from "react";
import { useI18n } from "./client";
import type { Locale } from "./locales";

/**
 * Whole-app translation layer. Server- and component-level strings that use
 * the typed dictionary are already localised; this translates every other
 * piece of interface text (inside the workspace, dialogs, toasts, errors…)
 * from English using the phrase tables in ./ui/*.json — loaded only for the
 * visitor's language.
 *
 * User content is never touched: anything inside [translate="no"],
 * [data-no-translate], editors (contenteditable / ProseMirror), code, KaTeX,
 * inputs and textareas is skipped.
 */
const LOADERS: Partial<Record<Locale, () => Promise<{ default: Record<string, string> }>>> = {
  nl: () => import("./ui/nl.json"),
  fr: () => import("./ui/fr.json"),
  de: () => import("./ui/de.json"),
  es: () => import("./ui/es.json"),
  ar: () => import("./ui/ar.json"),
};

const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
const SKIP =
  '[translate="no"],[data-no-translate],[contenteditable="true"],.ProseMirror,code,pre,kbd,script,style,textarea,input,.katex,.orbit-md';

export function AutoTranslate() {
  const { locale } = useI18n();

  useEffect(() => {
    const html = document.documentElement;
    const loader = LOADERS[locale];
    if (!loader) {
      html.classList.remove("i18n-pending");
      return;
    }
    let dict: Record<string, string> = {};
    let cancelled = false;
    const observers: MutationObserver[] = [];
    const produced = new Set<string>();

    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    const lookup = (n: string): string | undefined => {
      const hit = dict[n];
      if (hit !== undefined) return hit;
      // "12 cards saved", "3 questions ·", "Due: 4 May" style fragments
      const pre = n.match(/^([\d.,:%+\-–/ ]+\s)(.+)$/);
      if (pre && dict[pre[2]] !== undefined) return pre[1] + dict[pre[2]];
      const post = n.match(/^(.+?)(\s[\d.,:%+\-–/ ]+)$/);
      if (post && dict[post[1]] !== undefined) return dict[post[1]] + post[2];
      return undefined;
    };
    const translate = (raw: string): string | null => {
      const n = norm(raw);
      if (!n || produced.has(raw)) return null;
      const t = lookup(n);
      if (t === undefined || t === n) return null;
      const lead = raw.match(/^\s*/)?.[0] ?? "";
      const trail = raw.match(/\s*$/)?.[0] ?? "";
      const out = lead + t + trail;
      produced.add(out);
      return out;
    };
    const skipped = (el: Element | null) => !el || !!el.closest(SKIP);

    const doText = (node: Text) => {
      const v = node.nodeValue;
      if (!v || !v.trim() || skipped(node.parentElement)) return;
      const t = translate(v);
      if (t !== null) node.nodeValue = t;
    };
    const doEl = (el: Element) => {
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v) continue;
        const t = translate(v);
        if (t !== null) el.setAttribute(a, t);
      }
    };
    const walk = (start: Node) => {
      if (start.nodeType === Node.TEXT_NODE) return doText(start as Text);
      if (start.nodeType !== Node.ELEMENT_NODE) return;
      const el = start as Element;
      if (skipped(el)) {
        // inputs/textareas still get translated placeholders
        if (el.matches("input,textarea")) doEl(el);
        return;
      }
      doEl(el);
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          if (n.nodeType === Node.ELEMENT_NODE) {
            const e = n as Element;
            if (e.matches("input,textarea")) {
              doEl(e);
              return NodeFilter.FILTER_REJECT;
            }
            if (e.matches(SKIP)) return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let n: Node | null;
      while ((n = tw.nextNode())) {
        if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
        else doEl(n as Element);
      }
    };
    const fixTitle = () => {
      const out = document.title
        .split(" · ")
        .map((p) => dict[p] ?? p)
        .join(" · ");
      if (out !== document.title) document.title = out;
    };

    loader()
      .then((m) => {
        if (cancelled) return;
        dict = m.default;
        walk(document.body);
        fixTitle();
        html.classList.remove("i18n-pending");

        const mo = new MutationObserver((muts) => {
          for (const m of muts) {
            if (m.type === "characterData") doText(m.target as Text);
            else if (m.type === "attributes") doEl(m.target as Element);
            else m.addedNodes.forEach(walk);
          }
        });
        mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
        observers.push(mo);
        const to = new MutationObserver(fixTitle);
        to.observe(document.head, { subtree: true, childList: true, characterData: true });
        observers.push(to);
      })
      .catch(() => html.classList.remove("i18n-pending"));

    return () => {
      cancelled = true;
      observers.forEach((o) => o.disconnect());
    };
  }, [locale]);

  return null;
}
