#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * test-bimcraft-water.mjs — cold water checked as NBR 5626:2020 asks: the design flow by the method the project declares
 * (weights of NBR 5626:1998, or every fixture at once), head loss by Darcy–Weisbach, fittings by equivalent length, pressures
 * from the tank's water level (mep/water.js), and in a building: a tank feeding a water closet and a lavatory in PVC soldável
 * (mep-model.js waterPlan / sizeWater; the run's Water and WaterLevel kept in the file).
 *   node bin/test-bimcraft-water.mjs [--verbose]
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
const FO = await imp('family-ops.js');
const WA = await imp('mep/water.js');
const M = await imp('mep-model.js');

let pass = 0, fail = 0;
const ok = (c, m, detail = '') => { if (c) { pass++; if (VERBOSE) console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (detail ? ' (' + detail + ')' : '')); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const quiet = (fn) => async (...a) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return await fn(...a); } finally { console.log = l; console.warn = w; } };

console.log('== flows, head loss, equivalent lengths');
const F = (...k) => k.map((kind) => ({ kind }));
ok(near(WA.designFlow('weights', F('lav', 'wc', 'shower')), 0.3) && near(WA.designFlow('sum', F('lav', 'wc', 'shower')), 0.5), 'lavatory + water closet + shower: weights 0.3 + 0.3 + 0.4 → 0.3 √1.0 = 0.30 L/s; every fixture at once 0.50 L/s');
ok(near(WA.designFlow('weights', F('lav')), 0.15) && near(WA.designFlow('weights', F('sink', 'sink')), 0.3 * Math.sqrt(1.4)), 'never more than the fixtures\' own flows (one lavatory: 0.15, not 0.3 √0.3 = 0.164); two sinks: 0.3 √1.4');
ok(WA.MIN_USE_KPA === 10 && WA.MIN_ANY_KPA === 5 && WA.MAX_STATIC_KPA === 400 && WA.MAX_SPEED === 3, 'NBR 5626:2020 limits: 10 kPa at a point of use, 5 kPa anywhere, 400 kPa static; 3 m/s by default');
const h = WA.headLoss(0.3, 21.6, 0.0015);
ok(near(h.V, 0.3e-3 / (Math.PI * 0.0216 ** 2 / 4), 1e-9) && h.Re > 17000 && h.Re < 18000 && h.f > 0.026 && h.f < 0.028 && near(h.J, h.f / 0.0216 * h.V ** 2 / (2 * 9.81), 1e-12),
  '0.3 L/s in DN 25 PVC soldável (21.6 inside): 0.82 m/s, Re ≈ 17 600, Colebrook f ≈ 0.027, J = f/D · V²/2g', JSON.stringify(h));
const fwh = 0.000859 * 0.0003 ** 1.75 * 0.0216 ** -4.75;
ok(h.J < fwh && h.J > fwh * 0.85, 'within 15 % under Fair-Whipple-Hsiao for PVC (' + h.J.toFixed(4) + ' against ' + fwh.toFixed(4) + ' m/m)');
ok(WA.equivalentLength(25, 'elbow90') === 1.2 && WA.equivalentLength(25, 'teeSide') === 2.4 && WA.equivalentLength(110, 'globe') === 42.3 && WA.equivalentLength(32, 'ball') === WA.equivalentLength(32, 'gate') && WA.equivalentLength(0, 'elbow90') === 0,
  'equivalent lengths (rigid PVC): DN 25 elbow 1.2 m, side outlet 2.4 m, DN 110 globe valve 42.3 m; a ball valve as a gate valve; another material: 0');

console.log('== the network (pure)');
// a tank 10 m above a DN 25 pipe level at 0, dropping 2 m first; two branches of 1 m to a lavatory and a sink
const pipe = (guid, verts, extra = {}) => ({ guid, verts, d: 21.6, eps: 0.0015, dn: 25, level: null, method: 'weights', fittings: [], ...extra });
const runs = [pipe('s', [[0, 0, 2000], [0, 0, 0], [4000, 0, 0]], { level: 10000 }), pipe('a', [[1000, 0, 0], [1000, 1000, 0]]), pipe('b', [[3000, 0, 0], [3000, 1000, 0]])];
const fx = [{ id: 1, p: [1000, 1000, 0], kind: 'lav' }, { id: 2, p: [3000, 1000, 0], kind: 'sink' }];
let net = WA.waterNetwork(runs, fx);
const S = net.runs.get('s');
ok(net.runs.get('a').feeder === 's' && net.runs.get('b').feeder === 's' && S.source && !net.errors.length, 'two branches fed by the source run');
ok(near(S.pieces[0].q, 0.3 * Math.sqrt(1.0), 1e-9) && near(S.pieces.at(-2).q, 0.25, 1e-9) && S.pieces.at(-1).q === 0, 'flows along it: both fixtures (0.3 √1.0 = 0.30) before the first branch, the sink alone (0.25) after it, none past the last', S.pieces.map((p) => p.q.toFixed(3)).join());
const lossTo = (x) => x.pieces.reduce((s, p) => s + p.loss, 0);
const lav = net.fixtures.get(1), sink = net.fixtures.get(2);
ok(near(lav.static, 10 * 9.81, 1e-6) && lav.p < lav.static && near(sink.static, lav.static), 'static pressure at both: 10 m of water (98.1 kPa)');
const eA = 10 - S.pieces.slice(0, 2).reduce((s, p) => s + p.loss, 0);   // the energy line at the first branch
const A = net.runs.get('a');
ok(near(lav.p, (eA - lossTo(A)) * 9.81, 1e-6), 'the lavatory: what the energy line has left at its branch less the branch\'s own loss (with the tee\'s side outlet, 2.4 m)', lav.p.toFixed(2));
ok(near(A.pieces[0].le, 2.4, 1e-9) && near(A.pieces[0].loss, A.pieces[0].j * (1 + 2.4), 1e-12), 'the branch counts its tee\'s side outlet: J × (1 m + 2.4 m)');
ok(lav.ok && sink.ok && S.vMax < 3, 'both above 10 kPa and under 400 kPa; slower than 3 m/s');
// a tank only 0.3 m above the pipe's start: its drop does not count for the 5 kPa, the level pipe does
net = WA.waterNetwork([pipe('s', [[0, 0, 2000], [0, 0, 0], [4000, 0, 0]], { level: 2300 }), runs[1], runs[2]], fx);
ok(net.runs.get('s').pMin > 5 && near(net.runs.get('s').pieces[0].pMin ?? -1, -1), 'the drop out of the tank is left out of the 5 kPa check (its first piece has none)');
net = WA.waterNetwork([pipe('s', [[0, 0, 0], [4000, 0, 0]], { level: 600 }), runs[1], runs[2]], fx);
ok(!net.fixtures.get(1).ok && net.fixtures.get(1).p < 10, 'a tank 0.6 m above the fixtures: under 10 kPa at the points of use');
net = WA.waterNetwork([pipe('s', [[0, 0, 0], [4000, 0, 0]], { level: 45000 }), runs[1], runs[2]], fx);
ok(!net.fixtures.get(1).ok && net.fixtures.get(1).static > 400, 'a tank 45 m above them: over 400 kPa static');
net = WA.waterNetwork([pipe('s', [[0, 0, 0], [4000, 0, 0]], { level: 10000, method: 'sum' }), runs[1], runs[2]], fx);
ok(near(net.runs.get('s').pieces[0].q, 0.4, 1e-9), 'every fixture at once: 0.15 + 0.25 = 0.40 L/s');
net = WA.waterNetwork([pipe('x', [[0, 0, 0], [1000, 0, 0]])], []);
ok(!net.runs.size && net.errors[0]?.key === 'nosource', 'a pipe no tank feeds: not checked, said so');
const fast = WA.waterNetwork([pipe('s', [[0, 0, 0], [1000, 0, 0]], { level: 30000, d: 10 }), pipe('k', [[1000, 0, 0], [1000, 500, 0]], { d: 10 })], [1, 2, 3, 4].map((i) => ({ id: i, p: [1000, 500, 0], kind: 'sink' })));
ok(fast.runs.get('s').vMax > 3, 'four sinks on a 10 mm bore: faster than 3 m/s', fast.runs.get('s').vMax.toFixed(2));

console.log('== a tank, a water closet and a lavatory (PVC soldável)');
const text = N.newBuilding({ name: 'Water', levels: N.stackLevels(1, 3000, () => 'Ground'), fileName: 'w.ifc', now: new Date('2026-10-23T12:00:00Z') });
const eng = await quiet(IfcModel.create)(WebIFC, null);
await quiet((b) => eng.load(b))(new TextEncoder().encode(text));
const ed = new IfcEditor(WebIFC, eng);
const L1 = OPS.snapshotModel(ed).levels[0].guid;
const W = () => new ModelWriter(WebIFC, ed.api, ed.mid);
ed.modelChange(FO.placeFamily({ storey: L1, family: 'fam-wc', x: 0, y: 0 }), { label: 'WC' });
ed.modelChange(FO.placeFamily({ storey: L1, family: 'fam-lavatory', x: 1500, y: 0 }), { label: 'Lavatory' });
const cw = M.readFixturePorts(W()).filter((q) => q.system === 'cw').sort((a, b) => a.p[0] - b.p[0]);
const [pW, pL] = cw.map((q) => q.p);
ok(cw.length === 2 && pW[1] < 2000 && pL[1] < 2000, 'the two fixtures\' cold water connectors', JSON.stringify(cw.map((q) => q.p)));
const pr = (size, points, extra = {}) => ed.modelChange(M.placeRun({ storey: L1, kind: 'pipe', system: 'cw', mat: 'pvc-sold', cls: 'PN750', size, slope: 0, points, ...extra }), { label: 'Cold water' });
pr('32', [[5000, 2000, 7000], [5000, 2000, 2500], [-1500, 2000, 2500]], { water: 'weights', level: 8000 });
pr('20', [[pW[0], 2000, 2500], [pW[0], 2000, pW[2]], [pW[0], pW[1], pW[2]]]);
pr('20', [[pL[0], 2000, 2500], [pL[0], 2000, pL[2]], [pL[0], pL[1], pL[2]]]);
const rr = M.readRuns(W());
const src = rr.find((r) => r.water), toW = rr.find((r) => !r.water && r.points[0][0] === pW[0]), toL = rr.find((r) => !r.water && r.points[0][0] === pL[0]);
ok(src && src.water === 'weights' && near(src.level, 8000, 0.01) && toW && toL, 'the source run keeps its method and water level in the file (CadCraft_MepRun Water, WaterLevel)');
ok(M.readFixturePorts(W()).filter((q) => q.system === 'cw').every((q) => q.connected), 'both connectors connected to their pipes');
let plan = M.waterPlan(W());
const ps = plan.runs.get(src.guid);
ok(ps && near(ps.pieces.find((p) => p.q > 0).q, Math.min(0.3 * Math.sqrt(0.6), 0.3), 1e-9), 'the source carries both: 0.3 √(0.3 + 0.3) = 0.232 L/s', ps && ps.pieces.map((p) => p.q.toFixed(3)).join());
ok(plan.runs.get(toW.guid).feeder === src.guid && plan.runs.get(toL.guid).feeder === src.guid, 'both branches fed from it');
ok(ps.pieces.some((p) => p.le > 0) && ps.localLosses, 'its elbow and its tees count by equivalent length (PVC soldável)');
const fW = [...plan.fixtures.values()].find((f) => f.kind === 'wc'), fL = [...plan.fixtures.values()].find((f) => f.kind === 'lav');
ok(fW && fL && near(fW.static, (8000 - pW[2]) / 1000 * 9.81, 1e-6) && fW.p < fW.static && fW.ok && fL.ok, 'the water closet and the lavatory: static from the water level, dynamic less the losses, both within the limits', JSON.stringify([fW, fL]));
const n0 = ed.changes.length;
ed.modelChange(M.sizeWater(), { label: 'Size' });
ok(M.readRuns(W()).every((r) => r.size === rr.find((x) => x.guid === r.guid).size), 'Size the water pipes: every pipe already at or under 3 m/s, nothing changed');
ed.modelChange(M.changeRun(src.guid, { waterNote: 'Every fixture at once: a small house, one bathroom' }), { label: 'Note' });
ok(M.readRuns(W()).find((r) => r.guid === src.guid).waterNote === 'Every fixture at once: a small house, one bathroom', 'the justification of the method kept in the file (CadCraft_MepRun WaterNote)');
ed.modelChange(M.changeRun(src.guid, { water: 'sum' }), { label: 'Method' });
plan = M.waterPlan(W());
ok(near(plan.runs.get(src.guid).pieces.find((p) => p.q > 0).q, 0.3, 1e-9), 'declared method: every fixture at once, 0.15 + 0.15 = 0.30 L/s');
ed.modelChange(M.changeRun(src.guid, { water: '' }), { label: 'Not a source' });
plan = M.waterPlan(W());
ok(!plan.runs.size && plan.unfed.size === 3, 'no run fed from a tank: none checked, all three said to be unfed');
ed.undo();
ok(M.readRuns(W()).find((r) => r.guid === src.guid).water === 'sum' && ed.changes.length >= n0, 'undo: a source again');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
