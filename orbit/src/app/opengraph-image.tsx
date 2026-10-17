import { ImageResponse } from "next/og";

export const alt = "ORBIT — Your mind. In motion.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card: the orbit mark, the line, nothing else. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "radial-gradient(ellipse at 70% 40%, #1a1c1f 0%, #070809 70%)",
          color: "#f5f3ef",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <g fill="none" stroke="#f5f3ef" strokeWidth="1.6">
              <ellipse cx="16" cy="16" rx="13" ry="5.4" transform="rotate(32 16 16)" />
              <ellipse cx="16" cy="16" rx="13" ry="5.4" transform="rotate(-32 16 16)" />
            </g>
            <circle cx="16" cy="16" r="2.5" fill="#f5f3ef" />
          </svg>
          <span style={{ fontSize: 26, letterSpacing: 10, fontWeight: 700 }}>ORBIT</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 112, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>Your mind.</span>
          <span style={{ fontSize: 112, fontStyle: "italic", color: "#c9cdd1", letterSpacing: -3, lineHeight: 1.1 }}>In motion.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, letterSpacing: 4, color: "#858a91", textTransform: "uppercase" }}>
          <span>Human curiosity · Artificial intelligence</span>
          <span>Infinite understanding</span>
        </div>
      </div>
    ),
    size,
  );
}
