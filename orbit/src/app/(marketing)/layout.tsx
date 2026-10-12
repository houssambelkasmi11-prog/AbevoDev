import { CursorHalo } from "@/components/marketing/cursor-halo";
import { MarketingNav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/sections";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <div className="dark min-h-screen bg-void text-warm">
        <MarketingNav />
        <main id="main">{children}</main>
        <Footer />
        <CursorHalo />
      </div>
    </SmoothScroll>
  );
}
