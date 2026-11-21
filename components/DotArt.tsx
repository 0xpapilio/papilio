"use client";

import { useEffect, useRef } from "react";
import { BF } from "@/lib/butterfly";

// Each piece of art is a function sampled on an n×n grid of square pixels.
// It returns the pixel colour, or 0 for empty.
type Art = (x: number, y: number, t: number) => string | 0;

const BLUES = ["#0044cc", "#0058e6", "#0066FF", "#0080FF", "#0099FF", "#00AAFF", "#33CCFF"];
const C = { hi: "#33CCFF", mid: "#00AAFF", deep: "#0066FF", fade: "#003a99", ink: "#161b22", edge: "#3a4654" };

// The butterfly is traced from a photo into lib/butterfly.ts: half a wing pair,
// column 0 = body centre, so |x| mirrors it. 0 empty, 1-2 black wing, 3-9 blue.
const at = (u: number, v: number) =>
  u < 0 || v < 0 || u >= BF.w || v >= BF.h ? 0 : +BF.d[v * BF.w + u];

const ART: Record<"fly" | "cat" | "chr", Art> = {
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
};

const CELL = 6;

export default function DotArt({
  art,
  n,
  flap = false,
  className,
}: {
  art: keyof typeof ART;
  n: number;
  flap?: boolean;
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
    // Slow and stepped on purpose: pixels shift, they don't glide.
    const id = setInterval(() => draw(Date.now() / 700), 150);
    return () => clearInterval(id);
  }, [art, n, flap]);

  return <canvas ref={ref} width={n * CELL} height={n * CELL} aria-hidden className={className} />;
}
