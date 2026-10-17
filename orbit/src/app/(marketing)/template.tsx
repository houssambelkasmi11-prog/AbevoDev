/**
 * Soft cross-fade between public pages. Opacity only — a transform or filter
 * here would break the pinned hero (fixed/sticky children).
 */
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return <div className="fx-page-fade">{children}</div>;
}
