#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * test-bimcraft-vents.mjs — stacks and vents of NBR 8160: the tables (stacks by floors, branch vents, vent stacks by length,
 * trap to vent; mep/drainage.js, mep/vents.js), the vent network (what a vent serves, counted once; its length to the open
 * end), and in a building: a water closet and a lavatory on a stack, a vent stack joining the stack vent and a branch vent from
 * the lavatory's drain (mep-model.js drainPlan / ventPlan / sizeVents / trapPlan, one undo step).
 *   node bin/test-bimcraft-vents.mjs [--verbose]
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
const D = await imp('mep/drainage.js');
const V = await imp('mep/vents.js');
const M = await imp('mep-model.js');

let pass = 0, fail = 0;
const ok = (c, m, detail = '') => { if (c) { pass++; if (VERBOSE) console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (detail ? ' (' + detail + ')' : '')); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const quiet = (fn) => async (...a) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return await fn(...a); } finally { console.log = l; console.warn = w; } };

console.log('== the tables (NBR 8160)');
ok([40, 50, 75, 100, 150, 200].map((n) => D.capacity('br', n, 0, 'stack', 3)).join() === '4,10,30,240,960,2200' && [40, 50, 75, 100, 150, 200].map((n) => D.capacity('br', n, 0, 'stack', 4)).join() === '8,24,70,500,1900,3600',
  'stacks (Tabela 6): DN 40 … 200 carry 4 / 10 / 30 / 240 / 960 / 2200 UHC up to three floors, 8 / 24 / 70 / 500 / 1900 / 3600 above');
ok(D.capacity('br', 100, 0.02, 'stack', 3) === 240 && D.capacity('us', 3, 0.25 / 12, 'stack', 4) === 20, 'a stack ignores the slope; a US stack is sized as a branch (no stack table here)');
const sz = [40, 50, 75, 100, 150].map((n) => ({ key: String(n), nominal: n }));
ok(D.smallestSize('br', sz, 25, { role: 'stack', floors: 2 }).key === '75' && D.smallestSize('br', sz, 25, { role: 'stack', floors: 5 }).key === '75' && D.smallestSize('br', sz, 31, { role: 'stack', floors: 2 }).key === '100' && D.smallestSize('br', sz, 8, { role: 'stack', floors: 5, floor: 100 }).key === '100',
  '25 UHC: DN 75 either way; 31 UHC in a house: DN 100; a water closet on it: DN 100 whatever it carries');
ok([12, 13, 18, 19, 36].map((u) => V.branchVentSize(u, false)).join() === '40,50,50,75,75' && V.branchVentSize(37, false) === 0, 'branch vents without a water closet (Tabela 8): up to 12 DN 40, 13–18 DN 50, 19–36 DN 75, more: none');
ok([17, 18, 60].map((u) => V.branchVentSize(u, true)).join() === '50,75,75' && V.branchVentSize(61, true) === 0, 'with a water closet: up to 17 DN 50, 18–60 DN 75');
const PVC = [40, 50, 75, 100, 150, 200];
ok(V.ventStackSize(100, 43, 11, PVC) === 50 && V.ventStackSize(100, 43, 11.5, PVC) === 75 && V.ventStackSize(100, 44, 11, PVC) === 75 && V.ventStackSize(100, 530, 50, PVC) === 100 && V.ventStackSize(100, 531, 5, PVC) === 0,
  'vent stacks (Tabela 2): a DN 100 stack of 43 UHC, 11 m: DN 50; 11.5 m: DN 75; 44 UHC: the next row (DN 50 to 8 m): DN 75; 530 UHC 50 m: DN 100; 531 UHC: off the table');
ok(V.ventStackSize(300, 26000, 152, [150, 200, 250, 300]) === 300 && V.ventStackSize(75, 10, 13, [40, 50, 75]) === 40 && V.ventStackSize(75, 10, 13.5, [40, 50, 75]) === 50, 'the last row (DN 300, 26 000 UHC, DN 300 to 152 m); DN 75 stacks start at DN 40 vents');
ok(V.TRAP_TO_VENT[40] === 1000 && V.TRAP_TO_VENT[50] === 1200 && V.TRAP_TO_VENT[75] === 1800 && V.TRAP_TO_VENT[100] === 2400, 'trap to vent (Tabela 1): 1.00 / 1.20 / 1.80 / 2.40 m for DN 40 / 50 / 75 / 100');

console.log('== the vent network (pure)');
// a stack with two branches; a vent stack from the building drain joining the stack 1000 below its top; a branch vent into it
const dr = (guid, verts, nominal, role = 'branch') => ({ guid, verts, od: nominal, nominal, role });
const drains = [dr('st', [[0, 0, 6000], [0, 0, 0]], 100, 'stack'), dr('bd', [[0, 0, 0], [5000, 0, 0]], 100, 'main'), dr('b1', [[-2000, 0, 1000], [0, 0, 1000]], 50), dr('b2', [[-2000, 0, 3000], [0, 0, 3000]], 100)];
const net = D.drainNetwork(drains, [{ id: 1, p: [-2000, 0, 1000], size: 40, kind: 'lav' }, { id: 2, p: [-1500, 0, 1000], size: 40, kind: 'shower' }, { id: 3, p: [-2000, 0, 3000], size: 100, kind: 'wc' }]);
const vents = [{ guid: 'vs', verts: [[500, 0, 0], [500, 0, 5000], [0, 0, 5000]], od: 50 }, { guid: 'bv', verts: [[-1000, 0, 1000], [-1000, 0, 2000], [500, 0, 2000]], od: 40 }];
const vn = V.ventNetwork(vents, drains, net);
const vs = vn.get('vs'), bv = vn.get('bv');
ok(bv.own === 'b1' && bv.down?.guid === 'vs' && vs.own === 'bd' && vs.joins?.guid === 'st' && vs.up.length === 1, 'the branch vent vents b1 and goes into the vent stack; the vent stack vents the building drain and joins the stack');
ok(bv.uhc === 3 && bv.wc === 0 && vs.uhc === 9 && vs.wc === 1 && vs.roots.join() === 'bd' && vs.stackDn === 100, 'UHC: the branch vent 3 (lavatory 1 + shower 2); the vent stack 9, b1 counted once (it flows into the building drain the vent stack serves)', JSON.stringify([bv.uhc, vs.uhc, vs.roots]));
ok(near(vs.length, Math.max(5500, 2500 + 5500 - 2000) + 1000, 1e-6) && near(bv.length, 2500 + (5500 - 2000) + 1000, 1e-6),
  'length to the open end: the vent stack 7000 (from the branch vent\'s foot, through it, up the stack vent 1000); the branch vent the same way', vs.length + ' / ' + bv.length);
const tr = (p, size) => V.trapDistance(drains, vents, net, { p, size });
const t1 = tr([-2000, 0, 1000], 40), t2 = tr([-2000, 0, 3000], 100);
ok(t1.guid === 'b1' && near(t1.mm, 1000) && t1.vented && t1.limit === 1200 && t2.guid === 'b2' && near(t2.mm, 2000) && t2.vented && t2.limit === 2400,
  'trap to vent: the lavatory 1000 along b1 to the branch vent\'s foot (DN 50: 1.20 m); the water closet 2000 along b2 to the stack (DN 100: 2.40 m)', JSON.stringify([t1, t2]));
const lone = V.trapDistance([dr('x', [[0, 0, 0], [3000, 0, 0]], 40)], [], new Map([['x', { down: null }]]), { p: [0, 0, 0], size: 40 });
ok(lone && !lone.vented && near(lone.mm, 3000), 'a drain that reaches no vent: not vented');

// ---- in a building ----
async function bathroom() {
  const text = N.newBuilding({ name: 'Vents', levels: N.stackLevels(1, 3000, () => 'Ground'), fileName: 'v.ifc', now: new Date('2026-10-23T12:00:00Z') });
  const eng = await quiet(IfcModel.create)(WebIFC, null);
  await quiet((b) => eng.load(b))(new TextEncoder().encode(text));
  const ed = new IfcEditor(WebIFC, eng);
  const L1 = OPS.snapshotModel(ed).levels[0].guid;
  const W = () => new ModelWriter(WebIFC, ed.api, ed.mid);
  ed.modelChange(FO.placeFamily({ storey: L1, family: 'fam-wc', x: 0, y: 0 }), { label: 'WC' });   // drain at (0, 380, 0), down
  ed.modelChange(FO.placeFamily({ storey: L1, family: 'fam-lavatory', x: 1500, y: 0 }), { label: 'Lavatory' });   // drain at (1500, 450, 500)
  const pr = (system, size, points, extra = {}) => ed.modelChange(M.placeRun({ storey: L1, kind: 'pipe', system, mat: 'pvc-esg', cls: 'SN', size, slope: 0, points, ...extra }), { label: system });
  pr('san', '100', [[3000, 2000, 6000], [3000, 2000, -500]], { role: 'stack' });
  pr('san', '100', [[3000, 2000, -500], [8000, 2000, -500]], { role: 'main', slope: 0.02 });
  pr('san', '100', [[0, 380, 0], [0, 380, -200], [0, 2000, -200], [3000, 2000, -200]]);
  pr('san', '40', [[1500, 450, 500], [1500, 1000, 500], [1500, 1000, 300], [1500, 2000, 300], [3000, 2000, 300]]);
  pr('vent', '40', [[3500, 2000, -510], [3500, 2000, 5000], [3000, 2000, 5000]], { role: 'main' });   // its foot on the building drain (fallen 10)
  pr('vent', '40', [[1500, 1500, 300], [1500, 1500, 1200], [3500, 1500, 1200], [3500, 2000, 1200]]);
  return { ed, W };
}
console.log('== a bathroom on a stack, vented (NBR 8160)');
const B = await bathroom();
let runs = M.readRuns(B.W());
const find = (pred) => runs.find(pred);
const stack = find((r) => r.role === 'stack'), main = find((r) => r.system === 'san' && r.role === 'main'), wcRun = find((r) => r.system === 'san' && r.points[0][0] === 0), lavRun = find((r) => r.system === 'san' && r.points[0][0] === 1500);
const col = find((r) => r.system === 'vent' && r.role === 'main'), bvent = find((r) => r.system === 'vent' && r.role === 'branch');
ok(runs.length === 6 && stack && main && wcRun && lavRun && col && bvent && M.readFixturePorts(B.W()).filter((q) => q.system === 'san').every((q) => q.connected), 'six runs drawn; both fixtures\' drains connected');
ok(M.buildingFloors(B.W()) === 1, 'a building of one storey');
const dp = M.drainPlan(B.W());
ok(dp.get(stack.guid).units === 7 && dp.get(stack.guid).need === '100' && !dp.get(stack.guid).grow && dp.get(stack.guid).floors === 1, 'the stack carries 7 UHC and needs DN 100 (a water closet on it)', JSON.stringify(dp.get(stack.guid)));
let vp = M.ventPlan(B.W());
ok(vp.get(bvent.guid).units === 1 && vp.get(bvent.guid).need === '40' && !vp.get(bvent.guid).grow, 'the branch vent vents the lavatory\'s drain: 1 UHC, DN 40', JSON.stringify(vp.get(bvent.guid)));
const c = vp.get(col.guid);
ok(c.units === 7 && c.wc === 1 && c.stackDn === 100 && c.need === '50' && c.grow, 'the vent stack serves 7 UHC on a DN 100 drain: DN 50 at least (drawn DN 40)', JSON.stringify(c));
ok(near(c.length, 8700, 1), 'its length: from the branch vent\'s foot (3400 of branch vent, 4300 of vent stack above it) up to the stack and 1000 up the stack vent', c.length);
let tp = M.trapPlan(B.W());
ok(tp.get(lavRun.guid)?.over && near(tp.get(lavRun.guid).mm, 1250, 1) && tp.get(lavRun.guid).limit === 1000, 'the lavatory\'s trap is 1.25 m from the branch vent, more than 1.00 m for DN 40', JSON.stringify(tp.get(lavRun.guid)));
ok(tp.get(wcRun.guid)?.over && tp.get(wcRun.guid).vented && near(tp.get(wcRun.guid).mm, 4820, 1), 'the water closet reaches the stack after 4.82 m, more than 2.40 m', JSON.stringify(tp.get(wcRun.guid)));
const n0 = B.ed.changes.length;
B.ed.modelChange(M.sizeVents(), { label: 'Size the vents' });
runs = M.readRuns(B.W());
ok(B.ed.changes.length === n0 + 1 && find((r) => r.guid === col.guid).size === '50' && find((r) => r.guid === bvent.guid).size === '40', 'Size the vents: one undo step; the vent stack made DN 50, the branch vent left at DN 40');
ok(/'Pipe run DN50 Vent'/.test(new TextDecoder().decode(B.ed.save())), 'its name follows the size');
ok([...M.ventPlan(B.W()).values()].every((q) => !q.grow), 'sized again: nothing left to change');
B.ed.undo();
ok(M.readRuns(B.W()).find((r) => r.guid === col.guid).size === '40', 'undo: back to DN 40');
// floors: a run may say the building has more than three; the stack table's other column
B.ed.modelChange(M.changeRun(stack.guid, { floors: 'more' }), { label: 'Floors' });
ok(M.readRuns(B.W()).find((r) => r.guid === stack.guid).floors === 'more' && M.drainPlan(B.W()).get(stack.guid).floors === 4, 'Floors: more than three, kept in the file');
// a vent that vents no drain is left alone
B.ed.modelChange(M.placeRun({ storey: OPS.snapshotModel(B.ed).levels[0].guid, kind: 'pipe', system: 'vent', mat: 'pvc-esg', cls: 'SN', size: '40', slope: 0, points: [[9000, 9000, 0], [9000, 9000, 3000]] }), { label: 'Vent' });
const lonely = [...M.ventPlan(B.W()).values()].find((q) => q.alone);
ok(lonely && !lonely.need && !lonely.grow && !lonely.toobig, 'a vent on no drain: nothing to size');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
