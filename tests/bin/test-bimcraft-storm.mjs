#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * test-bimcraft-storm.mjs — storm drains of NBR 10844: Manning at 2/3 full against the standard's Table 4, the downpipe abacuses of
 * its Figure 3 as read (points on the drawn curves, interpolation, off the chart, 70 mm inside at least), and in a building: two
 * downpipes into a horizontal drain, their flows from area and rainfall (mep-model.js stormPlan / sizeStorm, one undo step).
 *   node bin/test-bimcraft-storm.mjs [--verbose]
 */
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'public_html/assets/apps/bimcraft/dev');
const VERBOSE = process.argv.includes('--verbose');
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(spec, ctx, next) {
  if (spec === 'manifold-3d') return { url: ${JSON.stringify(pathToFileURL(path.join(ROOT, 'public_html/assets/vendor/manifold-3d/current/manifold.js')).href)}, shortCircuit: true };
  return next(spec, ctx);
}`), import.meta.url);
(await import(pathToFileURL(path.join(APP, 'i18n.js')).href)).init({ strings: JSON.parse(fs.readFileSync(path.join(APP, 'lang/en.json'), 'utf8')) });
const imp = (f) => import(pathToFileURL(path.join(APP, f)).href);
const WebIFC = await imp('ifc/api.js');
const { IfcModel } = await imp('ifc-model.js');
const { IfcEditor } = await imp('ifc-edit.js');
const { ModelWriter } = await imp('model-write.js');
const OPS = await imp('model-ops.js');
const N = await imp('new-model.js');
const S = await imp('mep/storm.js');
const M = await imp('mep-model.js');

let pass = 0, fail = 0;
const ok = (c, m, detail = '') => { if (c) { pass++; if (VERBOSE) console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (detail ? ' (' + detail + ')' : '')); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const quiet = (fn) => async (...a) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return await fn(...a); } finally { console.log = l; console.warn = w; } };

console.log('== horizontal drains: Manning at 2/3 full (NBR 10844 Table 4)');
const T4 = { 50: [32, 45, 64, 90], 75: [95, 133, 188, 267], 100: [204, 287, 405, 575], 125: [370, 521, 735, 1040], 150: [602, 847, 1190, 1690], 200: [1300, 1820, 2570, 3650], 250: [2350, 3310, 4660, 6620], 300: [3820, 5380, 7590, 10800] };
let worst = 0;
for (const [D, row] of Object.entries(T4)) row.forEach((v, i) => { worst = Math.max(worst, Math.abs(S.manningFlow(Number(D), [0.005, 0.01, 0.02, 0.04][i]) / v - 1)); });
ok(worst < 0.01, 'every value of Table 4 (n = 0.011, D 50 to 300, 0.5 to 4 %) within 1 % (' + (worst * 100).toFixed(2) + ' %: the table rounds)');
ok(S.manningFlow(100, 0) === 0 && near(S.designFlow(150, 100), 250) && S.MIN_SLOPE === 0.005, 'no slope, no flow; 150 mm/h on 100 m²: 250 L/min; 0.5 % at least');

console.log('== downpipes: the abacuses of Figure 3');
// the reading of Figure 3 as stored (D in mm at Q in L/min), so it does not change by accident; how it was read and checked
// against the drawn lines is in storm.js
const read = [
  ['edge', 'H', 50, 600, 99.1], ['edge', 'H', 70, 1000, 89.0], ['edge', 'H', 100, 2400, 125.4], ['funnel', 'H', 50, 800, 117.2], ['funnel', 'H', 90, 2000, 98.6],
];
for (const [o, , H, Q, D] of read) { const r = S.downpipeDiameter(o, Q, H, 1e6); ok(near(r.Dh, D, 0.05), (o === 'edge' ? '(a) sharp-edged' : '(b) funnel') + ' outlet, H = ' + H + ' mm at ' + Q + ' L/min: ' + r.Dh.toFixed(1) + ' mm (stored ' + D + ')'); }
const a = (Q, H, L) => S.downpipeDiameter('edge', Q, H, L);
ok(a(1000, 70, 3).D >= a(1000, 70, 6).D && a(1000, 70, 6).D >= a(1000, 70, 25).D && a(1000, 70, 25).Dl >= a(1000, 70, Infinity).Dl, 'a longer downpipe never needs more');
ok(near(a(1200, 75, 4).Dh, (a(1200, 70, 4).Dh + a(1200, 80, 4).Dh) / 2, 1e-9) && near(a(1500, 90, 4.5).Dl, (a(1500, 90, 3).Dl + a(1500, 90, 6).Dl) / 2, 1e-9), 'between curves: linear in H, and in L');
ok(near(a(1500, 90, 50).Dl, (a(1500, 90, 25).Dl + a(1500, 90, Infinity).Dl) / 2, 1e-9), 'between 25 m and ∞: linear in 1/L (50 m halfway)');
ok(a(1000, 70, 3).D === Math.max(a(1000, 70, 3).Dh, a(1000, 70, 3).Dl), 'the higher of the two intersections');
ok(a(300, 50, 1).D === 70 && a(300, 50, 1).Dl < 70, 'at least 70 mm inside');
ok(a(1000, 40, 3).off === 'H' && a(1000, 110, 3).off === 'H' && a(1000, 70, 0.2).off === 'L' && a(2700, 50, 3).off === 'D', 'off the chart: H under 50 or over 100 mm, L under 0.3 m, D over 150 mm');
for (const o of ['edge', 'funnel']) {
  let mono = true;
  for (let Q = 200; Q <= 2600; Q += 100) for (const H of [50, 70, 100]) { const r1 = S.downpipeDiameter(o, Q, H, 2), r2 = S.downpipeDiameter(o, Q + 100, H, 2); if (!r1.off && !r2.off && r2.D + 1e-9 < r1.D) mono = false; }
  ok(mono, (o === 'edge' ? '(a)' : '(b)') + ': more flow never needs less');
}

console.log('== two downpipes into a horizontal drain (PVC, NBR 5688)');
const text = N.newBuilding({ name: 'Storm', levels: N.stackLevels(1, 3000, () => 'Ground'), fileName: 's.ifc', now: new Date('2026-10-23T12:00:00Z') });
const eng = await quiet(IfcModel.create)(WebIFC, null);
await quiet((b) => eng.load(b))(new TextEncoder().encode(text));
const ed = new IfcEditor(WebIFC, eng);
const L1 = OPS.snapshotModel(ed).levels[0].guid;
const W = () => new ModelWriter(WebIFC, ed.api, ed.mid);
const pr = (size, points, extra = {}) => ed.modelChange(M.placeRun({ storey: L1, kind: 'pipe', system: 'storm', mat: 'pvc-esg', cls: 'SN', size, slope: 0, points, ...extra }), { label: 'Storm' });
pr('50', [[0, 0, 6000], [0, 0, -300]], { role: 'stack', area: 100, rain: 150, outlet: 'edge', gutter: 50 });
// its foot on the drain, which falls 1 % from x = 0
pr('75', [[5000, 0, 6000], [5000, 0, -350]], { role: 'stack', area: 300, rain: 150, outlet: 'edge', gutter: 70 });
pr('100', [[0, 0, -300], [10000, 0, -300]], { slope: 0.01 });
let runs = M.readRuns(W());
const p1 = runs.find((r) => r.role === 'stack' && r.points[0][0] === 0), p2 = runs.find((r) => r.role === 'stack' && r.points[0][0] === 5000), hz = runs.find((r) => r.role !== 'stack');
ok(p1.area === 100 && p1.rain === 150 && p1.outlet === 'edge' && p1.gutter === 50 && near(hz.slope, 0.01), 'area, rainfall, outlet and water depth kept on the run (CadCraft_MepRun)');
let plan = M.stormPlan(W());
const q1 = plan.get(p1.guid), q2 = plan.get(p2.guid), qh = plan.get(hz.guid);
ok(near(q1.q, 250) && near(q2.q, 750) && near(qh.q, 1000), '150 mm/h on 100 m² and on 300 m²: 250 and 750 L/min; the drain carries both, 1000', [q1.q, q2.q, qh.q].join());
ok(near(q1.length, 6.3, 1e-6) && q1.D === 70 && q1.need === '75' && q1.grow, 'the small downpipe (6.3 m, H 50): under 70 mm on the chart, so 70: DN 75 (72.1 inside), drawn DN 50');
const d2 = S.downpipeDiameter('edge', 750, 70, 6.35);
ok(near(q2.D, d2.D, 1e-9) && q2.need === (d2.D <= 72.1 ? '75' : '100'), 'the other (750 L/min, H 70, 6.3 m): ' + q2.D.toFixed(1) + ' mm inside → DN ' + q2.need);
ok(near(q2.length, 6.35, 1e-6) && qh.need === '200' && qh.grow && near(qh.cap, S.manningFlow(101.6 - 3.6, 0.01), 1e-9), 'the drain at 1 %: DN 150 carries ' + Math.round(S.manningFlow(150 - 5.2, 0.01)) + ' L/min, short of 1000: DN 200', qh.need);
// the drain at 2 %: the second downpipe's foot follows it
const steep = (s) => { ed.modelChange(M.changeRun(hz.guid, { slope: s }), { label: 'Slope' }); ed.modelChange(M.changeRun(p2.guid, { points: [[5000, 0, 6000], [5000, 0, -300 - s * 5000]] }), { label: 'Foot' }); };
steep(0.02);
ok(M.stormPlan(W()).get(hz.guid).need === '150', 'at 2 %: DN 150 is enough');
steep(0.003);
const flat = M.stormPlan(W()).get(hz.guid);
ok(flat.flat && !flat.need && !flat.toobig, 'at 0.3 %: flatter than 0.5 %, not sized');
ed.undo(); ed.undo();
const n0 = ed.changes.length;
ed.modelChange(M.sizeStorm(), { label: 'Size the storm drains' });
runs = M.readRuns(W());
ok(ed.changes.length === n0 + 1 && runs.find((r) => r.guid === p1.guid).size === '75' && runs.find((r) => r.guid === hz.guid).size === '150', 'Size the storm drains: one undo step; the small downpipe DN 75, the drain DN 150 (at 2 %)');
ok([...M.stormPlan(W()).values()].every((q) => !q.grow), 'sized again: nothing left to change');
ed.undo();
ok(M.readRuns(W()).find((r) => r.guid === p1.guid).size === '50', 'undo: back as drawn');
ed.modelChange(M.changeRun(p1.guid, { gutter: 30 }), { label: 'H' });
ok(M.stormPlan(W()).get(p1.guid).off === 'H', 'a 30 mm water depth: off the chart, said so');
ok(M.runDefaults('pipe', 'storm', undefined, 'br').slope === 0.005 && M.drainMinimum({ kind: 'pipe', system: 'storm', mat: 'pvc-esg', cls: 'SN', size: '100' }) === 0.005 && M.drainMinimum({ kind: 'pipe', system: 'san', mat: 'pvc-esg', cls: 'SN', size: '100' }) === 0.01,
  'a Brazilian storm drain starts at 0.5 % (NBR 10844); a sanitary one keeps NBR 8160 (1 % for DN 100)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
