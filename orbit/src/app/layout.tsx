import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const body = Geist({ subsets: ["latin"], variable: "--font-body-face", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif-face",
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ORBIT — Your mind. In motion.",
    template: "%s · ORBIT",
  },
  description:
    "ORBIT is a personal learning universe where human curiosity and artificial intelligence work together. Notes, lessons, AI tutors, homework and practice — beautifully connected.",
  openGraph: {
    title: "ORBIT — Your mind. In motion.",
    description: "Human curiosity. Artificial intelligence. Infinite understanding.",
    type: "website",
    siteName: "ORBIT",
  },
  twitter: {
    card: "summary_large_image",
    title: "ORBIT — Your mind. In motion.",
    description: "Human curiosity. Artificial intelligence. Infinite understanding.",
  },
};

export const viewport: Viewport = {
  themeColor: "#070809",
  width: "device-width",
  initialScale: 1,
};

/**
 * Runs before paint: the public site is always dark; the workspace honours the
 * stored preference (or the OS setting) so there is no theme flicker.
 */
const themeScript = `(function(){try{var d=document.documentElement;var p=location.pathname;if(p.indexOf('/app')===0){var t=localStorage.getItem('orbit-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark')}}else{d.classList.add('dark');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('reveal-ready');setTimeout(function(){if(!window.__orbitReveal)d.classList.remove('reveal-ready')},4000)}}}catch(e){}})();`;

const DISPLAY_FONT_CSS = "https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800&display=swap";
const fontScript = `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(DISPLAY_FONT_CSS)};document.head.appendChild(l)})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${body.variable} ${serif.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Cabinet Grotesk — Fontshare (free for commercial use, ITF FFL) */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        {/* Loaded without blocking first paint (a slow/offline CDN no longer stalls every page). */}
        <link rel="preload" as="style" href={DISPLAY_FONT_CSS} />
        <script dangerouslySetInnerHTML={{ __html: fontScript }} />
        <noscript>
          <link rel="stylesheet" href={DISPLAY_FONT_CSS} />
        </noscript>
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
