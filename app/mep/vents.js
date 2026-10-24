/* SPDX-License-Identifier: Apache-2.0 */
/**
 * vents.js — sanitary vents sized by the fixture units of the drains they serve, NBR 8160 (Sistemas prediais de esgoto
 * sanitário, 1999). DOM-free, no IFC: mep-model.js gives it the vent runs, the sanitary runs and their drain network
 * (mep/drainage.js) in world mm, and writes the sizes back.
 *
 * Tables (the dimensions as the standard gives them; checked against the standard's own tables reproduced in public design
 * reports):
 *   Branch vents ("ramais de ventilação", Tabela 8): a group of fixtures without a water closet up to 12 UHC DN 40, 13 to 18
 *     DN 50, 19 to 36 DN 75; with a water closet up to 17 UHC DN 50, 18 to 60 DN 75.
 *   Vent stacks and vent headers ("colunas e barriletes de ventilação", Tabela 2): by the DN of the stack (or drain) served and
 *     its UHC, the longest length each vent DN may have (m). A vent stack's length runs from its foot to the open end, through
 *     the stack vent above the point where it joins it; a header's from the foot of the farthest vent stack to the open end.
 *   Trap to vent ("distância máxima de um desconector ao tubo ventilador", Tabela 1): DN 40 1.00 m, 50 1.20, 75 1.80, 100 2.40,
 *     along the fixture's drain.
 *
 *   ventNetwork(vents, drains, net) → Map(guid → { served: [drain guids], roots, uhc, wc, stackDn, length (mm), down, joins })
 *     vents: [{ guid, verts (world mm, drawn from the foot up: the first point on the drain it vents), od }];
 *     drains: [{ guid, verts, od, nominal, role }]; net: drainNetwork(...) of those drains.
 *     A vent vents the drain its first point lies on, and goes on into the vent its last point lies on (or into a stack's vent:
 *     the stack its last point lies on). Its UHC are those of the drains it and the vents into it serve, each counted once: a
 *     drain that flows into another one served is left out (a branch into the stack a vent stack serves).
 *   branchVentSize(uhc, wc) → DN | 0 (more than the table)   ventStackSize(stackDn, uhc, lengthM, sizes) → DN | 0
 *   trapDistance(drains, vents, net, fixture) → { guid (its drain), mm, dn, limit (mm) | null, vented } | null — along the drains from a fixture's drain
 *     connector to the first vent foot, or to a stack (vented above by the stack vent)
 */

const BRANCH_NO_WC = [[12, 40], [18, 50], [36, 75]];
const BRANCH_WC = [[17, 50], [60, 75]];
// [DN of the stack or drain served, UHC, { vent DN: longest length, m }]  — NBR 8160 Tabela 2
export const VENT_STACKS = [
  [40, 8, { 40: 46 }], [40, 10, { 40: 30 }],
  [50, 12, { 40: 23, 50: 61 }], [50, 20, { 40: 15, 50: 46 }],
  [75, 10, { 40: 13, 50: 46, 75: 317 }], [75, 21, { 40: 10, 50: 33, 75: 247 }], [75, 53, { 40: 8, 50: 29, 75: 207 }], [75, 102, { 40: 8, 50: 26, 75: 189 }],
  [100, 43, { 50: 11, 75: 76, 100: 299 }], [100, 140, { 50: 8, 75: 61, 100: 229 }], [100, 320, { 50: 7, 75: 52, 100: 195 }], [100, 530, { 50: 6, 75: 46, 100: 177 }],
  [150, 500, { 75: 10, 100: 40, 150: 305 }], [150, 1100, { 75: 8, 100: 31, 150: 238 }], [150, 2000, { 75: 7, 100: 26, 150: 201 }], [150, 2900, { 75: 6, 100: 23, 150: 183 }],
  [200, 1800, { 100: 10, 150: 73, 200: 286 }], [200, 3400, { 100: 7, 150: 57, 200: 219 }], [200, 5600, { 100: 6, 150: 49, 200: 186 }], [200, 7600, { 100: 5, 150: 43, 200: 171 }],
  [250, 4000, { 150: 24, 200: 94, 250: 293 }], [250, 7200, { 150: 18, 200: 73, 250: 225 }], [250, 11000, { 150: 16, 200: 60, 250: 192 }], [250, 15000, { 150: 14, 200: 55, 250: 174 }],
  [300, 7300, { 150: 9, 200: 37, 250: 116, 300: 287 }], [300, 13000, { 150: 7, 200: 29, 250: 90, 300: 219 }], [300, 20000, { 150: 6, 200: 24, 250: 76, 300: 186 }], [300, 26000, { 150: 5, 200: 22, 250: 70, 300: 152 }],
];
export const TRAP_TO_VENT = { 40: 1000, 50: 1200, 75: 1800, 100: 2400 };   // mm — NBR 8160 Tabela 1

/** A branch vent's DN for the UHC of the group it vents (0: more than Tabela 8 gives a branch vent). */
export function branchVentSize(uhc, wc) {
  for (const [max, dn] of wc ? BRANCH_WC : BRANCH_NO_WC) if (uhc <= max) return dn;
  return 0;
}

/** A vent stack's smallest DN among `sizes` (DN, smallest first) for the stack it serves, its UHC and length (m); 0 when none. */
export function ventStackSize(stackDn, uhc, lengthM, sizes) {
  const row = VENT_STACKS.find((r) => r[0] === stackDn && uhc <= r[1]);
  if (!row) return 0;
  for (const dn of sizes) if (row[2][dn] !== undefined && row[2][dn] + 1e-9 >= lengthM) return dn;
  return 0;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** Where p lies along a polyline: { s (mm from its first point), d (mm off it) }. */
export function alongLine(verts, p) {
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
export const lineLength = (verts) => verts.slice(1).reduce((s, q, i) => s + dist(verts[i], q), 0);
const tol = (r) => Math.max(5, (r.od || 0) / 2);
/** The run (of `runs`, not `self`) whose line passes within tolerance of p, the nearest, with where along it. */
function runAt(runs, p, self, tolOf) {
  let best = null;
  for (const o of runs) {
    if (o === self) continue;
    const a = alongLine(o.verts, p);
    if (a.d <= tolOf(o) && (!best || a.d < best.a.d)) best = { o, a };
  }
  return best;
}

export function ventNetwork(vents, drains, net) {
  const out = new Map();
  const len = new Map(vents.map((v) => [v.guid, lineLength(v.verts)]));
  for (const v of vents) {
    const foot = runAt(drains, v.verts[0], null, (o) => Math.max(tol(v), tol(o)));
    const top = v.verts[v.verts.length - 1];
    const into = runAt(vents, top, v, (o) => Math.max(tol(v), tol(o)));
    const joins = into ? null : runAt(drains, top, null, (o) => Math.max(tol(v), tol(o)));
    out.set(v.guid, { own: foot?.o.guid ?? null, served: [], roots: [], uhc: 0, wc: 0, stackDn: 0, length: 0, up: [], down: into ? { guid: into.o.guid, s: into.a.s } : null, joins: joins ? { guid: joins.o.guid, s: joins.a.s } : null });
  }
  for (const [g, n] of out) if (n.down) out.get(n.down.guid).up.push({ guid: g, s: n.down.s });
  // the drains a vent serves, its own and those of the vents into it (a loop is followed once)
  const servedOf = (g, seen = new Set()) => {
    if (seen.has(g)) return [];
    seen.add(g);
    const n = out.get(g);
    return [...(n.own ? [n.own] : []), ...n.up.flatMap((u) => servedOf(u.guid, seen))];
  };
  const byDrain = new Map(drains.map((d) => [d.guid, d]));
  // does drain a flow (down its network) into drain b?
  const flowsInto = (a, b) => { const seen = new Set(); for (let g = net.get(a)?.down; g && !seen.has(g); g = net.get(g)?.down) { if (g === b) return true; seen.add(g); } return false; };
  // the longest way from the foot of any vent below to the top of g
  const fromFoot = new Map();
  const below = (g, busy = new Set()) => {
    if (fromFoot.has(g)) return fromFoot.get(g);
    if (busy.has(g)) return 0;
    busy.add(g);
    const n = out.get(g), L = len.get(g);
    let m = L;
    for (const u of n.up) m = Math.max(m, below(u.guid, busy) + (L - u.s));
    busy.delete(g);
    fromFoot.set(g, m);
    return m;
  };
  // from the top of g on to the open end: along the vent it goes into, or up a stack's vent to the stack's top (its first point)
  const above = (g, seen = new Set()) => {
    if (seen.has(g)) return 0;
    seen.add(g);
    const n = out.get(g);
    if (n.down) return len.get(n.down.guid) - n.down.s + above(n.down.guid, seen);
    if (n.joins) return n.joins.s;
    return 0;
  };
  for (const [g, n] of out) {
    const set = [...new Set(servedOf(g))].filter((d) => byDrain.has(d));
    n.served = set;
    n.roots = set.filter((d) => !set.some((e) => e !== d && flowsInto(d, e)));
    for (const d of n.roots) { const m = net.get(d); n.uhc += m?.uhc || 0; n.wc += m?.wc || 0; n.stackDn = Math.max(n.stackDn, byDrain.get(d).nominal || 0); }
    n.length = below(g) + above(g);
  }
  return out;
}

/** Along the drains from a fixture's drain connector to a vent: the first vent foot downstream of it, or a stack. */
export function trapDistance(drains, vents, net, fixture) {
  const byGuid = new Map(drains.map((d) => [d.guid, d]));
  const here = runAt(drains, fixture.p, null, (o) => Math.max(tol(o), (fixture.size || 0) / 2));
  if (!here) return null;
  const dn = here.o.nominal, limit = TRAP_TO_VENT[dn] ?? null;
  const feet = vents.map((v) => ({ v, at: runAt(drains, v.verts[0], null, (o) => Math.max(tol(v), tol(o))) })).filter((x) => x.at);
  let run = here.o, s = here.a.s, mm = 0;
  const seen = new Set();
  while (run && !seen.has(run.guid)) {
    seen.add(run.guid);
    if (run.role === 'stack') return { guid: here.o.guid, mm, dn, limit, vented: true };
    const next = feet.filter((x) => x.at.o === run && x.at.a.s + 1e-6 >= s).sort((a, b) => a.at.a.s - b.at.a.s)[0];
    if (next) return { guid: here.o.guid, mm: mm + next.at.a.s - s, dn, limit, vented: true };
    mm += lineLength(run.verts) - s;
    const down = byGuid.get(net.get(run.guid)?.down);
    if (!down) break;
    // on into the drain it flows into, where its last point lies
    s = alongLine(down.verts, run.verts[run.verts.length - 1]).s;
    run = down;
  }
  return { guid: here.o.guid, mm, dn, limit, vented: false };
}
