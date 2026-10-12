/**
 * Miniature orbital visualisation of the student's real data: each subject
 * is an orbit whose radius grows with its content; each item is a body.
 */
export function KnowledgeOrbit({ clusters, unassigned }: { clusters: { name: string; count: number }[]; unassigned: number }) {
  const size = 320;
  const c = size / 2;
  const rings = clusters.slice(0, 6);
  const total = rings.reduce((n, r) => n + r.count, 0) + unassigned;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full text-ink" role="img" aria-label={`Knowledge orbit: ${total} items across ${clusters.length} subjects`}>
      <circle cx={c} cy={c} r={c - 4} fill="none" stroke="currentColor" strokeOpacity="0.06" />
      <line x1={8} y1={c} x2={size - 8} y2={c} stroke="currentColor" strokeOpacity="0.05" />
      <line x1={c} y1={8} x2={c} y2={size - 8} stroke="currentColor" strokeOpacity="0.05" />
      {rings.map((r, i) => {
        const radius = 34 + i * 20;
        const tilt = i % 2 ? 32 : -32;
        const bodies = Math.min(r.count, 14);
        return (
          <g key={r.name} style={{ transformOrigin: `${c}px ${c}px`, animation: `${i % 2 ? "orbit-spin-rev" : "orbit-spin"} ${70 + i * 25}s linear infinite` }}>
            <ellipse cx={c} cy={c} rx={radius + 30} ry={radius * 0.55} transform={`rotate(${tilt} ${c} ${c})`} fill="none" stroke="currentColor" strokeOpacity={0.22 - i * 0.025} />
            {Array.from({ length: bodies }, (_, j) => {
              const a = (j / bodies) * Math.PI * 2 + i;
              const ex = Math.cos(a) * (radius + 30);
              const ey = Math.sin(a) * radius * 0.55;
              const rad = (tilt * Math.PI) / 180;
              const x = c + ex * Math.cos(rad) - ey * Math.sin(rad);
              const y = c + ex * Math.sin(rad) + ey * Math.cos(rad);
              return <circle key={j} cx={x} cy={y} r={j === 0 ? 3 : 1.8} fill="currentColor" opacity={j === 0 ? 0.9 : 0.55} />;
            })}
          </g>
        );
      })}
      {unassigned > 0 ? (
        <g style={{ transformOrigin: `${c}px ${c}px`, animation: "orbit-spin 200s linear infinite" }}>
          {Array.from({ length: Math.min(unassigned, 24) }, (_, j) => {
            const a = (j / Math.min(unassigned, 24)) * Math.PI * 2;
            return <circle key={j} cx={c + Math.cos(a) * (c - 14)} cy={c + Math.sin(a) * (c - 14)} r={1.4} fill="currentColor" opacity={0.35} />;
          })}
        </g>
      ) : null}
      <circle cx={c} cy={c} r={6} fill="currentColor" />
      <text x={c + 12} y={c - 8} fontFamily="var(--font-mono)" fontSize="7.5" letterSpacing="1.4" fill="currentColor" opacity="0.5">
        {total} ITEMS
      </text>
    </svg>
  );
}
