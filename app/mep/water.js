/* SPDX-License-Identifier: Apache-2.0 */
/**
 * water.js — cold and hot water supply checked as NBR 5626:2020 asks (Sistemas prediais de água fria e água quente). DOM-free,
 * no IFC: mep-model.js gives it the runs, their fittings and the fixtures' water connectors in world mm.
 *
 * What the standard asks, and what is done here:
 *   - The method that gives each pipe's design flow is the project's to choose and to justify in its report (empirical or
 *     probabilistic). Two are offered and the source run says which: 'weights', the empirical method of NBR 5626:1998 Annex A,
 *     Q = 0.3 √ΣP (L/s), never more than the sum of the fixtures' design flows; and 'sum', every fixture at once (Q = ΣQ).
 *   - Head loss by the universal (Darcy–Weisbach) equation, the friction factor by Colebrook (the one in mep/sizing.js), water
 *     at 20 °C (ν = 1.004 × 10⁻⁶ m²/s). Fittings and valves of PVC soldável by their equivalent lengths (a maker's table of
 *     rigid PVC: elbows 90° / 45°, tee straight through / side outlet, gate, globe and check valves); other materials count
 *     the pipe only (localLosses: false).
 *   - Pressures: at least 10 kPa dynamic at every point of use; at least 5 kPa anywhere in the pipes, except the vertical drop
 *     out of an elevated tank to its header (the source run's first legs going down); at most 400 kPa static at a point of use.
 *   - Speed: 3 m/s is checked as a default (the standard lets a pipe go faster where water hammer and noise are shown not to
 *     matter: the help says so).
 *
 * Fixtures (design flow L/s and relative weight, NBR 5626:1998 Table A.1, for the starter fixtures' water connectors): water
 * closet with a cistern 0.15 / 0.3, lavatory 0.15 / 0.3, kitchen sink 0.25 / 0.7, shower 0.20 / 0.4, laundry tub 0.25 / 0.7.
 *
 *   WATER_FIXTURES, LE_PVC, MIN_USE_KPA, MIN_ANY_KPA, MAX_STATIC_KPA, MAX_SPEED
 *   designFlow(method, fixtures) → L/s     headLoss(Q (L/s), D (mm), eps (mm)) → { V (m/s), J (m/m), Re, f }
 *   waterNetwork(runs, fixtures) → { runs: Map(guid → { source, feeder, pieces: [{ a, b, q, v, j, le, loss, eStart, eEnd, pMin }],
 *     q, vMax, pMin, pEnd }), fixtures: Map(id → { run, p (kPa dynamic), static (kPa), ok }), errors: [] }
 *     runs: [{ guid, verts (world mm, first point upstream), d (inner mm), eps (mm), dn (PVC soldável DN or 0), level (world z
 *     mm of the water surface, on a source run) | null, method, fittings: [{ s (mm along), kind }] }]
 *     fixtures: [{ id, p (world mm), kind }]. A run is fed by the run its first point lies on; a fixture by the run through its
 *     connector. Pressures in kPa.
 */
import { colebrook } from './sizing.js';

export const WATER_FIXTURES = {
  wc: { q: 0.15, w: 0.3 }, lav: { q: 0.15, w: 0.3 }, sink: { q: 0.25, w: 0.7 }, shower: { q: 0.20, w: 0.4 }, laundry: { q: 0.25, w: 0.7 },
};
export const MIN_USE_KPA = 10, MIN_ANY_KPA = 5, MAX_STATIC_KPA = 400, MAX_SPEED = 3;
const G = 9.81, NU = 1.004e-6, KPA_PER_M = 9.81;   // a metre of water ≈ 9.81 kPa
/** Equivalent lengths (m) of rigid PVC fittings by outside diameter (DN of PVC soldável). */
export const LE_PVC = {
  //        elbow90 elbow45 teeThrough teeSide gate  globe  check (light)
  20: [1.1, 0.4, 0.7, 2.3, 0.1, 11.1, 2.5],
  25: [1.2, 0.5, 0.8, 2.4, 0.2, 11.4, 2.7],
  32: [1.5, 0.7, 0.9, 3.1, 0.3, 15.0, 3.8],
  40: [2.0, 1.0, 1.5, 4.6, 0.4, 22.0, 4.9],
  50: [3.2, 1.3, 2.2, 7.3, 0.7, 35.8, 6.8],
  60: [3.4, 1.5, 2.3, 7.6, 0.8, 37.9, 7.1],
  75: [3.7, 1.7, 2.4, 7.8, 0.9, 38.0, 8.2],
  85: [3.9, 1.8, 2.5, 8.0, 0.9, 40.0, 9.3],
  110: [4.3, 1.9, 2.6, 8.3, 1.0, 42.3, 10.4],
};
const LE_COL = { elbow90: 0, elbow45: 1, teeThrough: 2, teeSide: 3, gate: 4, ball: 4, globe: 5, check: 6 };
/** A fitting's equivalent length (m), or 0 when the table does not have it. A ball valve counts as a gate valve. */
export const equivalentLength = (dn, kind) => LE_PVC[dn]?.[LE_COL[kind]] ?? 0;

export function designFlow(method, fixtures) {
  const sumQ = fixtures.reduce((s, f) => s + (WATER_FIXTURES[f.kind]?.q || 0), 0);
  if (method === 'sum') return sumQ;
  const sumW = fixtures.reduce((s, f) => s + (WATER_FIXTURES[f.kind]?.w || 0), 0);
  return Math.min(0.3 * Math.sqrt(sumW), sumQ);
}

/** Darcy–Weisbach: velocity and head loss per metre for Q L/s in a pipe of inner diameter D mm and roughness eps mm. */
export function headLoss(Q, D, eps) {
  const d = D / 1000, A = Math.PI * d * d / 4, V = Q / 1000 / A;
  if (!(V > 0)) return { V: 0, J: 0, Re: 0, f: 0 };
  const Re = V * d / NU, f = colebrook(Re, eps / D);
  return { V, J: f / d * V * V / (2 * G), Re, f };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function along(verts, p) {
  let best = null, s0 = 0;
  for (let i = 0; i + 1 < verts.length; i++) {
    const a = verts[i], d = sub(verts[i + 1], a), L2 = dot(d, d), L = Math.sqrt(L2);
    const t = L2 ? Math.max(0, Math.min(1, dot(sub(p, a), d) / L2)) : 0;
    const off = Math.hypot(p[0] - a[0] - d[0] * t, p[1] - a[1] - d[1] * t, p[2] - a[2] - d[2] * t);
    if (!best || off < best.d) best = { s: s0 + L * t, d: off };
    s0 += L;
  }
  return best || { s: 0, d: Infinity };
}
const lengthOf = (verts) => verts.slice(1).reduce((s, q, i) => s + dist(verts[i], q), 0);
/** The point s mm along a polyline. */
function pointAt(verts, s) {
  for (let i = 0; i + 1 < verts.length; i++) {
    const L = dist(verts[i], verts[i + 1]);
    if (s <= L || i === verts.length - 2) { const u = L ? Math.max(0, Math.min(1, s / L)) : 0; return verts[i].map((x, k) => x + (verts[i + 1][k] - x) * u); }
    s -= L;
  }
  return verts[0];
}
/** How far the source run's first legs go straight down (the tank's outlet drop to the header): mm along it. */
function dropFromTank(verts) {
  let s = 0;
  for (let i = 0; i + 1 < verts.length; i++) {
    const d = sub(verts[i + 1], verts[i]), L = Math.hypot(...d);
    if (L > 0 && d[2] / L < -0.99) s += L; else break;
  }
  return s;
}

export function waterNetwork(runs, fixtures) {
  const tol = (r) => Math.max(5, r.d / 2 + 2);
  const by = new Map(runs.map((r) => [r.guid, r]));
  const info = new Map(runs.map((r) => [r.guid, { r, L: lengthOf(r.verts), feeder: null, at: 0, kids: [], fix: [] }]));
  const errors = [];
  // what feeds what: a run's first point on another run's line (the nearest)
  for (const r of runs) {
    if (r.level != null) continue;
    let best = null;
    for (const o of runs) { if (o === r) continue; const a = along(o.verts, r.verts[0]); if (a.d <= Math.max(tol(r), tol(o)) && (!best || a.d < best.a.d)) best = { o, a }; }
    if (best) { const n = info.get(r.guid); n.feeder = best.o.guid; n.at = best.a.s; info.get(best.o.guid).kids.push({ guid: r.guid, s: best.a.s }); }
  }
  // each fixture on the run through its connector
  for (const f of fixtures) {
    if (!WATER_FIXTURES[f.kind]) continue;
    let best = null;
    for (const r of runs) { const a = along(r.verts, f.p); if (a.d <= tol(r) && (!best || a.d < best.a.d)) best = { r, a }; }
    if (best) info.get(best.r.guid).fix.push({ ...f, s: best.a.s });
  }
  // every fixture fed from a run beyond s along it (a loop is followed once)
  const beyond = (g, s, seen = new Set()) => {
    if (seen.has(g)) return [];
    seen.add(g);
    const n = info.get(g);
    return [...n.fix.filter((f) => f.s + 1e-6 >= s), ...n.kids.filter((k) => k.s + 1e-6 >= s).flatMap((k) => beyond(k.guid, 0, seen))];
  };
  const out = new Map(), fx = new Map();
  // from each source down the network: the energy line falls by the losses; pressure = energy − height
  const walk = (g, eStart, method, srcDrop, seen) => {
    if (seen.has(g)) return;
    seen.add(g);
    const n = info.get(g), r = n.r;
    // pieces end at each corner (the pressure is lowest at a piece's ends: a corner can be a high point), branch, fixture and fitting
    const corners = r.verts.map((_, i) => lengthOf(r.verts.slice(0, i + 1)));
    const cuts = [...new Set([0, n.L, ...corners, ...n.kids.map((k) => k.s), ...n.fix.map((f) => f.s), ...r.fittings.map((f) => f.s)].map((s) => Math.round(Math.max(0, Math.min(n.L, s)) * 1e6) / 1e6))].sort((a, b) => a - b);
    const pieces = [];
    let e = eStart;
    // the side outlet of the tee it leaves its feeder by
    const teeSide = n.feeder ? equivalentLength(r.dn, 'teeSide') : 0;
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i], b = cuts[i + 1];
      if (b - a < 1e-6) continue;
      const set = beyond(g, b - 1e-6);
      const q = designFlow(method, set), h = headLoss(q, r.d, r.eps);
      // a fitting counts in the piece that ends at it (one at the very start, in the first piece)
      let le = r.fittings.filter((f) => (pieces.length ? f.s > a + 1e-6 : f.s >= a - 1e-6) && f.s <= b + 1e-6).reduce((s, f) => s + equivalentLength(r.dn, f.kind), 0);
      if (i === 0) le += teeSide;
      const loss = h.J * ((b - a) / 1000 + le);   // m
      const pa = pointAt(r.verts, a), pb = pointAt(r.verts, b);
      const eEnd = e - loss;
      // the lowest pressure of the piece is at its higher end (the energy line falls along it)
      const pMin = b <= srcDrop + 1e-6 ? null : Math.min((e - pa[2] / 1000), (eEnd - pb[2] / 1000)) * KPA_PER_M;
      pieces.push({ a, b, q, v: h.V, j: h.J, le, loss, eStart: e, eEnd, pMin });
      e = eEnd;
    }
    const eAt = (s) => { const p = pieces.find((x) => s >= x.a - 1e-6 && s <= x.b + 1e-6); if (!p) return eStart; return p.eStart - (p.eStart - p.eEnd) * ((s - p.a) / Math.max(1e-6, p.b - p.a)); };
    const ps = pieces.map((x) => x.pMin).filter((x) => x !== null);
    out.set(g, { source: r.level != null, feeder: n.feeder, method, pieces, q: pieces[0]?.q || 0, vMax: Math.max(0, ...pieces.map((x) => x.v)), pMin: ps.length ? Math.min(...ps) : null, pEnd: (e - r.verts[r.verts.length - 1][2] / 1000) * KPA_PER_M });
    for (const f of n.fix) {
      const p = (eAt(f.s) - f.p[2] / 1000) * KPA_PER_M, st = (levelOf(g) - f.p[2] / 1000) * KPA_PER_M;
      fx.set(f.id, { run: g, kind: f.kind, p, static: st, ok: p + 1e-9 >= MIN_USE_KPA && st <= MAX_STATIC_KPA + 1e-9 });
    }
    for (const k of n.kids) walk(k.guid, eAt(k.s), method, 0, seen);
  };
  const source = new Map();
  const levelOf = (g) => { let n = info.get(g); const seen = new Set(); while (n && n.r.level == null && n.feeder && !seen.has(n.r.guid)) { seen.add(n.r.guid); n = info.get(n.feeder); } return n?.r.level != null ? n.r.level / 1000 : NaN; };
  for (const r of runs) {
    if (r.level == null) continue;
    source.set(r.guid, true);
    walk(r.guid, r.level / 1000, r.method === 'sum' ? 'sum' : 'weights', dropFromTank(r.verts), new Set());
  }
  for (const r of runs) if (!out.has(r.guid)) errors.push({ guid: r.guid, key: 'nosource' });
  return { runs: out, fixtures: fx, errors };
}
