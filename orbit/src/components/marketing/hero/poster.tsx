import { cn } from "@/lib/utils";

/**
 * Premium static rendering of THE CONNECTION. Shown while the 3D chunk loads,
 * when WebGL is unavailable, and for reduced-motion visitors.
 */
export function ConnectionPoster({ className }: { className?: string }) {
  // Wire lattice vertices for the AI form (projected icosahedron).
  const ai = [
    [0, -86],
    [74, -43],
    [74, 43],
    [0, 86],
    [-74, 43],
    [-74, -43],
    [0, -30],
    [36, 18],
    [-36, 18],
  ] as const;
  const aiEdges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
    [0, 6], [1, 6], [5, 6], [1, 7], [2, 7], [3, 7], [3, 8], [4, 8], [5, 8], [6, 7], [7, 8], [8, 6],
  ];
  return (
    <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className={cn("h-full w-full", className)} aria-hidden>
      <defs>
        <radialGradient id="ceramic" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#e7e4de" />
          <stop offset="72%" stopColor="#8d8f92" />
          <stop offset="100%" stopColor="#202226" />
        </radialGradient>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dbe8f2" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#dbe8f2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="55%" stopColor="#070809" stopOpacity="0" />
          <stop offset="100%" stopColor="#070809" stopOpacity="1" />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      <rect width="1200" height="700" fill="#070809" />
      <ellipse cx="600" cy="360" rx="420" ry="220" fill="url(#halo)" />

      {/* filaments */}
      <g fill="none" stroke="#dbe8f2" strokeWidth="0.8" opacity="0.35">
        {Array.from({ length: 9 }, (_, i) => {
          const lift = (i - 4) * 22;
          return <path key={i} d={`M 410 ${360 + lift * 0.2} C 520 ${340 + lift}, 680 ${380 - lift}, 790 ${360 - lift * 0.2}`} />;
        })}
      </g>

      {/* human form */}
      <g transform="translate(395 360)">
        <ellipse rx="112" ry="140" fill="url(#ceramic)" transform="rotate(-8)" filter="url(#soft)" />
        <path d="M -70 -40 C -20 -10, 20 10, 74 60" stroke="#070809" strokeOpacity="0.18" strokeWidth="6" fill="none" />
        <ellipse rx="160" ry="34" fill="none" stroke="#c9cdd1" strokeWidth="1" opacity="0.6" transform="rotate(12)" />
      </g>

      {/* AI form */}
      <g transform="translate(805 360)" stroke="#c9cdd1" fill="none">
        {aiEdges.map(([a, b], i) => (
          <line key={i} x1={ai[a][0]} y1={ai[a][1]} x2={ai[b][0]} y2={ai[b][1]} strokeWidth="0.9" opacity="0.75" />
        ))}
        <ellipse rx="150" ry="40" strokeWidth="0.7" opacity="0.3" transform="rotate(-14)" />
        <ellipse rx="170" ry="54" strokeWidth="0.7" opacity="0.2" transform="rotate(22)" />
        {ai.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill="#eef5fb" stroke="none" />
        ))}
      </g>

      <rect width="1200" height="700" fill="url(#vignette)" />
    </svg>
  );
}
