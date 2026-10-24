/* SPDX-License-Identifier: Apache-2.0 */
/**
 * storm.js — storm drains sized as NBR 10844 (Instalações prediais de águas pluviais, 1989) asks. DOM-free, no IFC: mep-model.js
 * gives it the runs in world mm and writes the sizes back.
 *
 *   - Design flow Q = I · A / 60 (L/min): I the rainfall intensity (mm/h; the standard's table by place and return period, or
 *     150 mm/h for up to 100 m² of roof in plan), A the area that drains into the run (m², as the standard counts it). Flows add
 *     up downstream: a run flows into the run its last point lies on.
 *   - Downpipes ("condutores verticais"): the inner diameter D from the abacuses of the standard's Figure 3 — (a) a gutter with a
 *     sharp-edged outlet, (b) with a funnel outlet — by Q, the water depth in the gutter H (mm) and the downpipe's length L (m):
 *     the higher of the D the H curves and the L curves give at Q, interpolating between curves; at least 70 mm inside; then the
 *     DN whose inner diameter is at least that.
 *   - Horizontal drains ("condutores horizontais"): Manning–Strickler with the water at 2/3 of the inner diameter,
 *     Q = 60 000 · A R^(2/3) i^(1/2) / n (L/min), n = 0.011 for PVC (the standard's Table 4 is this formula); at least 0.5 % slope.
 *
 * The abacuses are read curve by curve from the figure as reproduced in a public course text (its own grid calibrates the
 * reading): each H curve is a straight line D = m Q + b (mm, L/min), each L curve ln Q = c0 + c1 ln D + c2 (ln D)², within
 * 0.2–0.6 mm of the drawn lines (rms). Below the L = ∞ curve the H lines decide nothing (the higher intersection is taken), and
 * past each L curve's drawn end the H = 100 line is above it. Off the chart (H under 50 or over 100 mm, L under 0.3 m, D over
 * 150 mm) nothing is read: the caller says so.
 *
 *   ABACUS.edge | .funnel   MIN_DOWNPIPE_MM = 70   MIN_SLOPE = 0.005   N_PVC = 0.011
 *   downpipeDiameter(outlet, Q, H, L) → { D (mm, at least 70), Dh, Dl } | { off: 'H' | 'L' | 'D' }
 *   manningFlow(Dint (mm), slope, n) → L/min at 2/3 full      designFlow(I, A) → L/min
 *   stormNetwork(runs) → Map(guid → { q (L/min), down, up }) — runs: [{ guid, verts (world mm, upstream first), od, area, i }]
 */
export const MIN_DOWNPIPE_MM = 70, MIN_SLOPE = 0.005, N_PVC = 0.011;
// [H (mm), m, b]: D = m Q + b      [L (m) | Infinity, c0, c1, c2]: ln Q = c0 + c1 ln D + c2 (ln D)²
export const ABACUS = {
  edge: {
    H: [[50, 0.225112, -35.9298], [60, 0.180246, -46.8196], [70, 0.141298, -52.2541], [80, 0.117392, -61.4213], [90, 0.0970961, -66.4115], [100, 0.0831159, -74.0949]],
    L: [[0.3, -5.335566, 2.955357, -0.0699641], [0.6, -2.474349, 1.861605, 0.03953277], [1, -3.238297, 2.271285, -0.006142782], [1.5, -3.909381, 2.662537, -0.0534521],
      [2, -1.863548, 1.785209, 0.04467243], [3, -2.737448, 2.226814, -0.004120258], [6, -1.68533, 1.777841, 0.05398324], [25, -2.783537, 2.265283, 0.01298375], [Infinity, -3.356874, 2.528462, -0.01051506]],
  },
  funnel: {
    H: [[50, 0.185536, -31.2141], [60, 0.148011, -43.985], [70, 0.115612, -45.8972], [80, 0.0924092, -50.0707], [90, 0.0777569, -56.8891], [100, 0.0672002, -64.1189]],
    L: [[0.3, -4.579124, 2.661122, -0.0352465], [0.6, -0.4543047, 1.02079, 0.1325171], [1, -2.228662, 1.905355, 0.03019043], [1.5, 2.299307, -0.005009665, 0.2364149],
      [2, -5.589389, 3.483486, -0.1450473], [3, 0.03895126, 0.9977121, 0.1351049], [6, -1.222848, 1.558281, 0.08180418], [25, 4.10884, -0.9274304, 0.3834927], [Infinity, -5.859644, 3.620164, -0.1288296]],
  },
};

const lnQ = (c, D) => c[1] + c[2] * Math.log(D) + c[3] * Math.log(D) ** 2;
/** D (mm) on an L curve at Q: 50 when the curve is above Q at the chart's foot, 150+ when beyond its top. */
function dOnL(c, Q) {
  const t = Math.log(Q);
  if (lnQ(c, 50) >= t) return 50;
  if (lnQ(c, 150) < t) return Infinity;
  let lo = 50, hi = 150;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (lnQ(c, m) < t) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const lerp = (a, b, t) => a + (b - a) * t;

/** The inner diameter a downpipe needs (mm), as the standard's Figure 3 gives it. */
export function downpipeDiameter(outlet, Q, H, L) {
  const A = ABACUS[outlet === 'funnel' ? 'funnel' : 'edge'];
  if (!(H >= 50 - 1e-9 && H <= 100 + 1e-9)) return { off: 'H' };
  if (!(L >= 0.3 - 1e-9)) return { off: 'L' };
  if (!(Q > 0)) return { D: MIN_DOWNPIPE_MM, Dh: 0, Dl: 0 };
  // the H curves: straight lines, linear between them
  const hi = A.H.findIndex((h) => h[0] >= H - 1e-9), h1 = A.H[hi], h0 = A.H[Math.max(0, hi - 1)];
  const dH = (h) => h[1] * Q + h[2];
  const Dh = h1[0] === H || hi === 0 ? dH(h1) : lerp(dH(h0), dH(h1), (H - h0[0]) / (h1[0] - h0[0]));
  // the L curves, each never above the one of the shorter downpipe; linear in L between them (in 1/L between 25 m and ∞)
  const ds = [];
  for (const c of A.L) ds.push(Math.min(dOnL(c, Q), ds.length ? ds[ds.length - 1] : Infinity));
  const j = A.L.findIndex((c) => c[0] >= L - 1e-9), c1 = A.L[j], c0 = A.L[Math.max(0, j - 1)];
  let Dl;
  if (c1[0] === L || j === 0) Dl = ds[j];
  else if (c1[0] === Infinity) Dl = lerp(ds[j - 1], ds[j], (1 / c0[0] - 1 / L) / (1 / c0[0]));
  else Dl = lerp(ds[j - 1], ds[j], (L - c0[0]) / (c1[0] - c0[0]));
  const D = Math.max(Dh, Dl);
  if (!Number.isFinite(D) || D > 150 + 1e-9) return { off: 'D' };
  return { D: Math.max(MIN_DOWNPIPE_MM, D), Dh, Dl };
}

/** Manning–Strickler at 2/3 full: L/min for an inner diameter (mm), a slope (m/m) and a roughness n. */
export function manningFlow(Dint, slope, n = N_PVC) {
  if (!(slope > 0) || !(Dint > 0)) return 0;
  const d = Dint / 1000, th = 2 * Math.acos(1 - 2 * (2 / 3));
  const A = d * d / 8 * (th - Math.sin(th)), P = d * th / 2;
  return 60000 / n * A * (A / P) ** (2 / 3) * Math.sqrt(slope);
}
export const designFlow = (I, A) => (I > 0 && A > 0 ? I * A / 60 : 0);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function offLine(verts, p) {
  let best = Infinity;
  for (let i = 0; i + 1 < verts.length; i++) {
    const a = verts[i], d = sub(verts[i + 1], a), L2 = dot(d, d);
    const t = L2 ? Math.max(0, Math.min(1, dot(sub(p, a), d) / L2)) : 0;
    best = Math.min(best, Math.hypot(p[0] - a[0] - d[0] * t, p[1] - a[1] - d[1] * t, p[2] - a[2] - d[2] * t));
  }
  return best;
}
export function stormNetwork(runs) {
  const tol = (r) => Math.max(5, (r.od || 0) / 2);
  const out = new Map(runs.map((r) => [r.guid, { own: designFlow(r.i, r.area), q: 0, up: [], down: null }]));
  for (const r of runs) {
    const end = r.verts[r.verts.length - 1];
    let best = null;
    for (const o of runs) { if (o === r) continue; const d = offLine(o.verts, end); if (d <= Math.max(tol(r), tol(o)) && (!best || d < best.d)) best = { o, d }; }
    if (best) { out.get(r.guid).down = best.o.guid; out.get(best.o.guid).up.push(r.guid); }
  }
  const done = new Set(), busy = new Set();
  const total = (g) => {
    const n = out.get(g);
    if (done.has(g)) return n.q;
    if (busy.has(g)) return 0;
    busy.add(g);
    n.q = n.own + n.up.reduce((s, u) => s + total(u), 0);
    busy.delete(g); done.add(g);
    return n.q;
  };
  for (const r of runs) total(r.guid);
  return out;
}
