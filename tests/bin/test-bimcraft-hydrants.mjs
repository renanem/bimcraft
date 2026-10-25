#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * test-bimcraft-hydrants.mjs — hydrants and hose reels of IT 22/2025 (CBPMESP): Tabela 2 (the types), Tabela 3 (type and fire
 * reserve by column and built area) and Tabela 1 (Hazen–Williams C) as printed; the loss, speed and flow worked by hand; and in a
 * building: a fire pipe with its column, area and hydrants (mep-model.js firePlan / sizeFire, one undo step).
 *   node bin/test-bimcraft-hydrants.mjs [--verbose]
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
const H = await imp('mep/hydrants.js');
const M = await imp('mep-model.js');

let pass = 0, fail = 0;
const ok = (c, m, detail = '') => { if (c) { pass++; if (VERBOSE) console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (detail ? ' (' + detail + ')' : '')); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const quiet = (fn) => async (...a) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return await fn(...a); } finally { console.log = l; console.warn = w; } };

console.log('== the tables as printed');
const row = (k) => { const t = H.TYPES[k]; return [t.type, t.nozzle, t.hose, t.hoseLength, t.double ? 'duplo' : 'simples', t.flow, t.head].join(' '); };
ok(row('1') === '1 25 25 30 simples 100 80' && row('2') === '2 40 40 30 simples 150 30' && row('3') === '3 40 40 30 simples 200 40', 'Tabela 2: types 1, 2 and 3 (DN, hose 30 m, one expedition, L/min, mca)');
ok(row('4-40') === '4 40 40 30 simples 300 65' && row('4-65') === '4 65 65 30 simples 300 30' && row('5') === '5 65 65 30 duplo 600 60', 'Tabela 2: type 4 with the DN40 nozzle (65 mca) and with the DN65 (30 mca); type 5 double, 600 L/min, 60 mca');
const col = (n) => [0, 1, 2, 3, 4, 5].map((b) => { const a = b === 0 ? 100 : H.AREA_BANDS[b - 1] + 1; const s = H.systemFor(n, a); return s.type + ':' + s.rti; }).join(' ');
ok(col(1) === '1:5 1:8 1:12 1:18 1:25 1:35', 'Tabela 3 column 1: reserves 5, 8, 12, 18, 25, 35 m³ by area band', col(1));
ok(col(2) === '2:8 2:12 2:18 2:25 2:35 2:48' && col(3) === '3:12 3:18 3:25 3:35 3:48 3:70', 'Tabela 3 columns 2 and 3', col(2) + ' | ' + col(3));
ok(col(4) === '4:28 4:32 4:48 4:64 4:96 4:120', 'Tabela 3 column 4: type 4, 28 to 120 m³', col(4));
ok(col(5) === '4:32 4:48 5:64 5:96 5:120 5:180', 'Tabela 3 column 5: type 4 up to 5 000 m², type 5 above; 32 to 180 m³', col(5));
ok(JSON.stringify(H.AREA_BANDS) === '[2500,5000,10000,20000,50000]' && H.systemFor(1, 2500).rti === 5 && H.systemFor(1, 2500.1).rti === 8 && H.systemFor(1, 50000).rti === 25 && H.systemFor(1, 50001).rti === 35 && H.systemFor(1, 0) === null && H.systemFor(9, 100) === null,
  'the band edges (up to 2 500 is the first; above 50 000 the last) and no area, no column: none');
ok(H.C_HAZEN.steel === 120 && H.C_HAZEN.copper === 150 && H.C_HAZEN.pvc === 150 && H.C_HAZEN['pvc-sold'] === 150, 'Tabela 1: galvanised steel 120, copper 150, plastic 150');
ok(H.MAX_SPEED === 5 && H.MAX_NOZZLE_HEAD === 100 && H.minNominalOf('1') === 49 && H.minNominalOf('2') === 49 && H.minNominalOf('3') === 62 && H.minNominalOf('5') === 62, '5 m/s (4.8.12), 100 mca (4.8.8), DN50 for types 1 and 2 and DN65 for the rest (4.11.6)');

console.log('== the loss, the speed and the flow');
const J = 605e4 * Math.pow(300, 1.85) * Math.pow(120, -1.85) * Math.pow(62.71, -4.87);
ok(near(H.hazenJ(300, 120, 62.71), J, 1e-12) && near(J, 0.0582, 5e-4), 'Hazen–Williams: 300 L/min in 62.71 mm, C 120: about 0.058 m/m (5.8 m per 100 m; 5.46 × 6.05e6 / 5.72e8)', String(J));
ok(near(H.speed(300, 62.71), 300 / 60000 / (Math.PI * 0.06271 ** 2 / 4), 1e-12) && near(H.speed(300, 62.71), 1.619, 1e-3), 'v = Q/A: 1.62 m/s', String(H.speed(300, 62.71)));
ok(H.designFlow('2', 1) === 150 && H.designFlow('2', 2) === 300 && H.designFlow('2', 9) === 300 && H.designFlow('2', 0) === 0 && H.designFlow('4-65', 3) === 600, 'the flow of the two most unfavourable jets: one hydrant its type flow, two or more twice it');
const c = H.checkRun({ key: '4-65', hydrants: 1, d: 62.71, nominal: 63.5, material: 'steel', length: 40, rise: 3 });
ok(near(c.q, 300) && near(c.loss, 40 * J, 1e-9) && near(c.need, 30 + 40 * J + 3, 1e-9) && c.speedOk && c.sizeOk, 'a run of 40 m rising 3 m to a type 4 hydrant (30 mca): ' + c.need.toFixed(2) + ' mca at its start');
const small = H.checkRun({ key: '4-65', hydrants: 2, d: 40, nominal: 40, material: 'steel', length: 10 });
ok(!small.sizeOk && !small.speedOk, 'two jets of 300 L/min in a 40 mm pipe: too small and too fast');

console.log('== a fire pipe in a building');
const text = N.newBuilding({ name: 'Fire', levels: N.stackLevels(1, 3000, () => 'Ground'), fileName: 'f.ifc', now: new Date('2026-10-24T12:00:00Z') });
const eng = await quiet(IfcModel.create)(WebIFC, null);
await quiet((b) => eng.load(b))(new TextEncoder().encode(text));
const ed = new IfcEditor(WebIFC, eng);
const L1 = OPS.snapshotModel(ed).levels[0].guid;
const W = () => new ModelWriter(WebIFC, ed.api, ed.mid);
ed.modelChange(M.placeRun({ storey: L1, kind: 'pipe', system: 'fire', mat: 'steel', cls: '40', size: '1-1/2', points: [[0, 0, 0], [30000, 0, 0]], fireCol: 3, fireArea: 3000, hydrants: 2 }), { label: 'Fire' });
let r = M.readRuns(W()).find((x) => x.system === 'fire');
ok(r.fireCol === 3 && r.fireArea === 3000 && r.hydrants === 2 && r.fireType === '', 'column, area and hydrants kept on the run (CadCraft_MepRun)');
ok(M.fireTypeOf(r) === '3', 'column 3 and 3 000 m²: type 3');
let q = M.firePlan(W()).get(r.guid);
ok(q.type === '3' && q.rti === 18 && near(q.q, 400) && near(q.length, 30) && !q.sizeOk && !q.speedOk && q.grow, 'type 3 (reserve 18 m³): two jets of 200 L/min in a 1½" pipe: too small, too fast, 30 m', JSON.stringify(q));
ok(q.needSize === '2-1/2' || q.needSize === '3', 'the smallest size of DN65 or more at 5 m/s or less: ' + q.needSize);
const n0 = ed.changes.length;
ed.modelChange(M.sizeFire(), { label: 'Size the fire pipes' });
r = M.readRuns(W()).find((x) => x.system === 'fire');
q = M.firePlan(W()).get(r.guid);
ok(ed.changes.length === n0 + 1 && r.size === q.size && q.sizeOk && q.speedOk && !q.grow, 'Size the fire pipes: one undo step; now ' + r.size + ' and nothing left to change');
ed.undo();
ok(M.readRuns(W()).find((x) => x.system === 'fire').size === '1-1/2', 'undo: back as drawn');
ed.modelChange(M.changeRun(r.guid, { fireType: '2', hydrants: 1 }), { label: 'Type' });
q = M.firePlan(W()).get(r.guid);
ok(q.type === '2' && near(q.q, 150) && !q.sizeOk && q.speedOk && q.needSize === '2', 'a type named on the run wins over Tabela 3; type 2, one hydrant: 150 L/min; the 1½" is under DN50, the 2" is the smallest', JSON.stringify(q));
ed.modelChange(M.changeRun(r.guid, { fireCol: 0, fireArea: 0, fireType: '', hydrants: 1 }), { label: 'None' });
const none = M.firePlan(W()).get(r.guid);
ok(none.type === '' && none.q === undefined, 'no column, area or type: nothing is checked');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
