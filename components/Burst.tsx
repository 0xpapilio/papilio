import DotArt from "@/components/DotArt";

// Celebration: pixel sparks burst out and three butterflies flap away. Styles (.spark, .fly-away) live in
// globals.css. Place inside a `relative` parent; give it a new `key` to replay.

// Where the butterflies fly to (px from the start point), their tilt and start delay.
const FLIGHTS = [
  { dx: -170, dy: -230, r: -18, delay: 0 },
  { dx: 40, dy: -300, r: 8, delay: 0.12 },
  { dx: 210, dy: -200, r: 22, delay: 0.24 },
];
// Sparks evenly spread around a flattened circle.
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  const d = 70 + (i % 3) * 30;
  return { dx: Math.round(Math.cos(a) * d * 1.6), dy: Math.round(Math.sin(a) * d) };
});

const vars = (v: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(v).map(([k, x]) => [`--${k}`, typeof x === "number" ? `${x}px` : x])) as React.CSSProperties;

export default function Burst({ className = "top-1/2 left-1/2" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute z-10 ${className}`}>
      {SPARKS.map((s, i) => (
        <span key={i} className="spark" style={vars({ dx: s.dx, dy: s.dy, delay: `${(i % 4) * 0.04}s` })} />
      ))}
      {FLIGHTS.map((f, i) => (
        <span key={i} className="fly-away" style={vars({ dx: f.dx, dy: f.dy, r: `${f.r}deg`, delay: `${f.delay}s` })}>
          <DotArt art="fly" n={40} flap speed={6} className="w-10" />
        </span>
      ))}
    </div>
  );
}
