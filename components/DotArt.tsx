"use client";

import { useEffect, useRef } from "react";
import { BF } from "@/lib/butterfly";

// Each piece of art is a function sampled on an n×n grid of square pixels.
// It returns the pixel colour, or 0 for empty.
type Art = (x: number, y: number, t: number) => string | 0;

const BLUES = ["#0044cc", "#0058e6", "#0066FF", "#0080FF", "#0099FF", "#00AAFF", "#33CCFF"];
const C = { pale: "#bfeaff", hi: "#33CCFF", mid: "#00AAFF", deep: "#0066FF", fade: "#003a99", ink: "#161b22", edge: "#3a4654" };

// The butterfly is traced from a photo into lib/butterfly.ts: half a wing pair,
// column 0 = body centre, so |x| mirrors it. 0 empty, 1-2 black wing, 3-9 blue.
const at = (u: number, v: number) =>
  u < 0 || v < 0 || u >= BF.w || v >= BF.h ? 0 : +BF.d[v * BF.w + u];

// --- Two more species for the team cards, drawn from wing outlines instead of a photo trace. ---
type Poly = number[][];
const pip = (x: number, y: number, P: Poly) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i];
    const [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
// Chaikin corner-cutting turns a rough outline into a smooth wing curve.
const smooth = (P: Poly, n = 2): Poly =>
  n
    ? smooth(
        P.flatMap((p, i) => {
          const q = P[(i + 1) % P.length];
          return [
            [0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]],
            [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]],
          ];
        }),
        n - 1,
      )
    : P;

// fore/hind are right-hand wing outlines (mirrored). `paint` colours a point inside a wing from
// its angle around the wing root and `inside(m)`: is the point still in the wing when pushed m× outward.
type Paint = (th: number, inside: (m: number) => boolean, ax: number, y: number) => string;
function wings(fore: Poly, hind: Poly, paint: Paint): Art {
  const parts: [Poly, number][] = [[smooth(fore), 0.04], [smooth(hind), 0]];
  return (x, y, t) => {
    const ax = (Math.abs(x) * 0.95) / (0.93 + 0.07 * Math.cos(t)); // flap
    if (ax < 0.04 && y > -0.2 && y < 0.3) return C.edge; // body
    if (y < -0.18 && y > -0.5 && Math.abs(ax - (0.02 + (-y - 0.18) * 0.4)) < 0.022) return C.edge; // antennae
    for (const [P, oy] of parts) {
      if (!pip(ax, y, P)) continue;
      const dx = ax - 0.02;
      const dy = y - oy;
      const inside = (m: number) => pip(0.02 + dx * m, oy + dy * m, P);
      return inside(1.08) ? paint(Math.atan2(dy, dx), inside, ax, y) : C.edge;
    }
    return 0;
  };
}

const ART = {
  // Emperor: falcate forewings with eyespots, a soft root-to-edge gradient, fine veins,
  // a pearled margin and short tails.
  emperor: wings(
    [[0, -0.14], [0.18, -0.6], [0.5, -0.86], [0.9, -0.92], [0.98, -0.62], [0.9, -0.3], [0.74, -0.06], [0.3, 0.02], [0, 0.04]],
    [[0, -0.06], [0.66, -0.07], [0.8, 0.16], [0.76, 0.44], [0.6, 0.62], [0.58, 0.8], [0.5, 0.94], [0.43, 0.78], [0.42, 0.66], [0.2, 0.62], [0.05, 0.34], [0, 0.2]],
    (th, inside, ax, y) => {
      for (const [ex, ey, r] of [[0.62, -0.5, 0.15], [0.48, 0.3, 0.11]]) {
        const d = Math.hypot(ax - ex, y - ey) / r; // eyespot: pale pupil, dark ring, bright halo
        if (d < 1) return d < 0.3 ? C.pale : d < 0.62 ? C.ink : C.hi;
      }
      if (!inside(1.2)) return Math.sin(th * 30) > 0.3 ? C.pale : C.ink; // pearled margin
      if (!inside(1.38)) return C.fade;
      if (Math.abs(Math.sin(th * 10)) < 0.09) return C.deep; // fine veins
      return inside(3.2) ? C.pale : inside(2.1) ? C.hi : inside(1.6) ? C.mid : C.deep;
    },
  ),
  // Monarch: pointed forewings, dark veins dividing blue cells, pale spots along the margin.
  monarch: wings(
    [[0, -0.12], [0.25, -0.52], [0.6, -0.8], [0.98, -0.86], [0.94, -0.5], [0.72, -0.14], [0.35, -0.01], [0, 0.03]],
    [[0, -0.05], [0.56, -0.09], [0.74, 0.16], [0.68, 0.44], [0.43, 0.63], [0.18, 0.57], [0.04, 0.3], [0, 0.15]],
    (th, inside) => {
      if (!inside(1.3)) return Math.sin(th * 22) > 0.55 ? C.hi : C.ink; // spotted margin
      if (Math.abs(Math.sin(th * 8)) < 0.2) return C.ink; // veins
      return inside(2.2) ? C.mid : C.deep;
    },
  ),
  fly(x, y, t) {
    const u = Math.floor((Math.abs(x) * (BF.w + 5)) / (0.93 + 0.07 * Math.cos(t))); // flap = squeeze toward the body
    const v = Math.floor(((y * 1.04 + 1) / 2) * BF.h);
    const c = at(u, v);
    if (!c) return 0;
    if (c > 2) return BLUES[c - 3];
    const rim = !at(u + 2, v) || !at(u, v + 2) || !at(u, v - 2);
    return rim ? C.edge : c === 2 ? "#1e252e" : "#12161c";
  },
  cat(x, y) {
    for (let k = 5; k >= 0; k--) {
      const cx = -0.7 + k * 0.27;
      const cy = 0.1 + (k % 2 ? -0.06 : 0.04);
      const d = Math.hypot(x - cx, y - cy) / 0.18;
      if (d < 1) {
        if (d > 0.85) return C.edge;
        if (k === 5) return d < 0.5 ? C.hi : C.mid; // head
        return d < 0.4 ? C.mid : d < 0.7 ? C.deep : C.fade;
      }
      if (k < 5 && Math.abs(x - cx) < 0.03 && y > cy + 0.17 && y < cy + 0.32) return C.edge; // legs
    }
    const antenna = y < -0.1 && y > -0.4 && Math.abs(Math.abs(x - 0.65) - (-y - 0.1) * 0.4) < 0.02;
    return antenna ? C.edge : 0;
  },
  chr(x, y) {
    if (Math.abs(y + 0.85) < 0.03 && Math.abs(x) < 0.7) return C.edge; // twig
    if (Math.abs(x) < 0.02 && y > -0.85 && y < -0.6) return C.edge; // thread
    const v = (y - 0.1) / 0.7;
    if (Math.abs(v) > 1) return 0;
    const w = 0.36 * Math.sqrt(1 - v * v) * (1 - 0.35 * v);
    const a = Math.abs(x);
    if (a > w) return 0;
    if (a > w - 0.04) return C.edge;
    return Math.floor((y + 1) * 9) % 2 ? (a < w * 0.35 ? C.mid : C.deep) : a < w * 0.5 ? C.fade : C.ink;
  },
} satisfies Record<string, Art>;

const CELL = 6;

export default function DotArt({
  art,
  n,
  flap = false,
  speed = 1,
  className,
}: {
  art: keyof typeof ART;
  n: number;
  flap?: boolean;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const fn = ART[art];
    const draw = (t: number) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const c = fn(((i + 0.5) / n) * 2 - 1, ((j + 0.5) / n) * 2 - 1, t);
          if (!c) continue;
          ctx.fillStyle = c;
          ctx.fillRect((i + 0.14) * CELL, (j + 0.14) * CELL, CELL * 0.72, CELL * 0.72);
        }
    };
    draw(0);
    if (!flap || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // At rest it redraws every 150ms on purpose: pixels step, they don't glide.
    // A "papilio:joined" event (fired by the waitlist) makes it flap fast for a few seconds.
    let phase = 0;
    let boost = 0;
    let last = performance.now();
    let drawn = 0;
    const onJoin = () => (boost = 5);
    window.addEventListener("papilio:joined", onJoin);
    const id = setInterval(() => {
      const now = performance.now();
      phase += ((now - last) / 700) * (speed + boost);
      last = now;
      boost = boost > 0.05 ? boost * 0.97 : 0;
      if (boost || speed > 1 || now - drawn >= 150) {
        draw(phase);
        drawn = now;
      }
    }, 50);
    return () => {
      clearInterval(id);
      window.removeEventListener("papilio:joined", onJoin);
    };
  }, [art, n, flap, speed]);

  return <canvas ref={ref} width={n * CELL} height={n * CELL} aria-hidden className={className} />;
}
