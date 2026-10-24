#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * test-bimcraft-circuits.mjs — circuits sized as NBR 5410:2004 asks: the tables (current capacity of Tabelas 36 and 37, temperature,
 * grouping, smallest sections; elec/nbr5410.js), the design of a circuit worked by hand (elec/circuit.js: current, section, breaker,
 * voltage drop), and in a building: lights and outlets on circuits, the project's voltage system, a circuit's entity and its devices
 * assigned to it (IfcDistributionCircuit; IfcElectricalCircuit in IFC2X3), Size the circuits as one undo step, the schedule
 * (res-elec.js circuitPlan / setCircuit / sizeCircuits / syncCircuitMembers).
 *   node bin/test-bimcraft-circuits.mjs [--verbose]
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
const T = await imp('elec/nbr5410.js');
const C = await imp('elec/circuit.js');
const EL = await imp('res-elec.js');

let pass = 0, fail = 0;
const ok = (c, m, detail = '') => { if (c) { pass++; if (VERBOSE) console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (detail ? ' (' + detail + ')' : '')); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const quiet = (fn) => async (...a) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return await fn(...a); } finally { console.log = l; console.warn = w; } };
const dec = (b) => new TextDecoder().decode(b);

console.log('== the tables of NBR 5410:2004');
// Tabela 36 as printed (copper, PVC, 70 °C): [A1-2, A1-3, A2-2, A2-3, B1-2, B1-3, B2-2, B2-3, C-2, C-3, D-2, D-3]; to 35 mm² as reproduced in the course material the project's
// engineer sent, the rest as read from the standard's own pages
const T36 = {
  0.5: [7, 7, 7, 7, 9, 8, 9, 8, 10, 9, 12, 10], 0.75: [9, 9, 9, 9, 11, 10, 11, 10, 13, 11, 15, 12], 1: [11, 10, 11, 10, 14, 12, 13, 12, 15, 14, 18, 15],
  1.5: [14.5, 13.5, 14, 13, 17.5, 15.5, 16.5, 15, 19.5, 17.5, 22, 18], 2.5: [19.5, 18, 18.5, 17.5, 24, 21, 23, 20, 27, 24, 29, 24], 4: [26, 24, 25, 23, 32, 28, 30, 27, 36, 32, 38, 31],
  6: [34, 31, 32, 29, 41, 36, 38, 34, 46, 41, 47, 39], 10: [46, 42, 43, 39, 57, 50, 52, 46, 63, 57, 63, 52], 16: [61, 56, 57, 52, 76, 68, 69, 62, 85, 76, 81, 67],
  25: [80, 73, 75, 68, 101, 89, 90, 80, 112, 96, 104, 86], 35: [99, 89, 92, 83, 125, 110, 111, 99, 138, 119, 125, 103], 50: [119, 108, 110, 99, 151, 134, 133, 118, 168, 144, 148, 122],
  240: [321, 286, 291, 261, 415, 370, 351, 313, 461, 403, 361, 297], 1000: [767, 679, 698, 618, 1012, 906, 827, 738, 1125, 996, 792, 652],
};
const REFS = [['A1', 1], ['A2', 2], ['B1', 3], ['B2', 4], ['C', 11], ['D', 61]];   // a method of each reference column
let bad = [];
for (const [s, row] of Object.entries(T36)) REFS.forEach(([ref, m], i) => [2, 3].forEach((n, j) => { if (T.ampacity('pvc', Number(s), m, n) !== row[2 * i + j]) bad.push(s + ' ' + ref + '-' + n); }));
ok(!bad.length, 'Tabela 36 (PVC): ' + Object.keys(T36).length + ' sections × 12 columns as printed (0.5 to 35 mm² also as in the sheet the engineer sent)', bad.join(', '));
const T37 = { 0.5: [10, 9, 10, 9, 12, 10, 11, 10, 12, 11, 14, 12], 1.5: [19, 17, 18.5, 16.5, 23, 20, 22, 19.5, 24, 22, 26, 22], 2.5: [26, 23, 25, 22, 31, 28, 30, 26, 33, 30, 34, 29], 6: [45, 40, 42, 38, 54, 48, 51, 44, 58, 52, 56, 46],
  35: [131, 117, 121, 109, 164, 144, 146, 128, 171, 147, 146, 122], 240: [424, 380, 386, 346, 546, 481, 462, 407, 599, 500, 419, 351], 1000: [1014, 908, 923, 826, 1332, 1173, 1088, 957, 1515, 1237, 916, 767] };
bad = [];
for (const [s, row] of Object.entries(T37)) REFS.forEach(([ref, m], i) => [2, 3].forEach((n, j) => { if (T.ampacity('epr', Number(s), m, n) !== row[2 * i + j]) bad.push(s + ' ' + ref + '-' + n); }));
ok(!bad.length, 'Tabela 37 (EPR / XLPE): seven sections × 12 columns as printed', bad.join(', '));
let mono = true;
for (const ins of ['pvc', 'epr']) for (const [, m] of REFS) for (const n of [2, 3]) for (let i = 1; i < T.SECTIONS.length; i++) if (!(T.ampacity(ins, T.SECTIONS[i], m, n) > T.ampacity(ins, T.SECTIONS[i - 1], m, n))) mono = false;
ok(mono && T.ampacity('pvc', 16, 7, 2) === T.ampacity('pvc', 16, 3, 2) && T.ampacity('pvc', 16, 8, 3) === T.ampacity('pvc', 16, 4, 3), 'both tables grow with the section; installation methods 7 and 8 read the reference methods B1 and B2');
ok(T.METHODS[1].ref === 'A1' && T.METHODS[2].ref === 'A2' && T.METHODS[3].ref === 'B1' && T.METHODS[4].ref === 'B2' && T.METHODS[5].ref === 'B1' && T.METHODS[6].ref === 'B2' && T.METHODS[7].ref === 'B1' && T.METHODS[8].ref === 'B2' && T.METHODS[11].ref === 'C' && T.METHODS['11A'].ref === 'C' && T.METHODS[61].ref === 'D' && T.METHODS['61A'].ref === 'D',
  'Tabela 33: methods 1 → A1, 2 → A2, 3 → B1, 4 → B2, 5 → B1, 6 → B2, 7 → B1, 8 → B2, 11 and 11A → C, 61 and 61A → D');
ok(T.tempFactor('pvc', 40) === 0.87 && T.tempFactor('pvc', 35) === 0.94 && T.tempFactor('pvc', 60) === 0.5 && T.tempFactor('pvc', 65) === null && T.tempFactor('epr', 80) === 0.41 && T.tempFactor('epr', 45) === 0.87 && T.tempFactor('pvc', 30) === 1 && T.tempFactor('pvc', 10) === 1.22,
  'Tabela 40 (air): PVC 40 °C 0.87, 35 °C 0.94, 60 °C 0.50, none at 65 °C; EPR 45 °C 0.87, 80 °C 0.41');
ok(T.tempFactor('pvc', 20, true) === 1 && T.tempFactor('pvc', 30, true) === 0.89 && T.tempFactor('epr', 60, true) === 0.65 && T.tempFactor('epr', 80, true) === 0.38 && T.tempFactor('pvc', 33) === 0.94 && T.tempFactor('pvc', 9) === null,
  'Tabela 40 (soil, 20 °C is 1): PVC 30 °C 0.89, EPR 60 °C 0.65, 80 °C 0.38; 33 °C takes the 35 °C factor, under 10 °C is off the table');
ok([1, 2.5, 3].map((r) => T.soilFactor(r)).join() === '1.18,1,0.96' && T.soilFactor(1.2) === 1.1 && T.soilFactor(3.5) === null, 'Tabela 41: soil resistivity 1 → 1.18, 2.5 → 1, 3 → 0.96; 1.2 takes the factor of 1.5');
const g = (n) => T.groupFactor(7, '', n);
ok([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 16, 19, 20, 30].map(g).join() === '1,0.8,0.7,0.65,0.6,0.57,0.54,0.52,0.5,0.5,0.45,0.45,0.41,0.41,0.38,0.38', 'Tabela 42 row 1 (conduit, bundle): 1 → 1.00 … 8 → 0.52, 9–11 → 0.50, 12–15 → 0.45, 16–19 → 0.41, 20 or more → 0.38');
ok([1, 2, 8, 9, 30].map((n) => T.groupFactor(11, 'layer', n)).join() === '1,0.85,0.71,0.7,0.7' && [1, 2, 8, 9].map((n) => T.groupFactor('11A', 'ceiling', n)).join() === '0.95,0.81,0.62,0.61' && T.groupFactor(11, 'bundle', 3) === 0.7,
  'Tabela 42 rows 2 and 3 (a single layer on a wall, on the ceiling): 1.00 0.85 … 0.71, then 0.70; 0.95 0.81 … 0.62, then 0.61; a method C cable in a bundle uses row 1');
ok(T.groupFactor(61, '', 3, 0.25) === 0.85 && T.groupFactor(61, '', 2, 0) === 0.85 && T.groupFactor(61, '', 6, 1) === 0.8 && T.groupFactor('61A', '', 2, 0) === 0.8 && T.groupFactor('61A', '', 6, 0.5) === 0.8 && T.groupFactor('61A', '', 6, 0.1) === 0.7 && T.groupFactor(61, '', 7, 0.5) === null,
  'Tabela 45 (buried conduits): multicore 2 circuits touching 0.85, 3 at 0.25 m 0.85, 6 at 1 m 0.80; single-core 2 touching 0.80, 6 at 0.5 m 0.80; 7 circuits is off the table');
ok(T.minSection('lighting') === 1.5 && T.minSection('power') === 2.5, 'Tabela 47: 1.5 mm² for lighting, 2.5 mm² for power circuits (outlets included)');
ok(T.neutralSection(25) === 25 && T.neutralSection(70) === 70 && T.neutralSection(70, true) === 35 && T.neutralSection(400, true) === 185 && T.neutralSection(35, true) === 25, 'Tabela 48: a reduced neutral only above 25 mm² and only when asked: 70 → 35, 400 → 185');
ok(T.protectiveSection(10) === 10 && T.protectiveSection(16) === 16 && T.protectiveSection(25) === 16 && T.protectiveSection(35) === 16 && T.protectiveSection(70) === 35, 'Tabela 58: up to 16 mm² as the phase, up to 35 mm² 16 mm², above half');
ok(near(T.resistance(2.5, 'pvc'), 7.41 * (1 + 0.00393 * 50), 1e-9) && near(T.resistance(2.5, 'epr'), 7.41 * (1 + 0.00393 * 70), 1e-9), 'conductor resistance at 70 °C (PVC) and 90 °C (EPR): 7.41 Ω/km at 20 °C is 8.87 and 9.45');

console.log('== a circuit worked by hand');
const base = { watts: 500, pf: 1, phases: 'FN', system: '127/220', use: 'lighting', length: 20, method: '7', insulation: 'pvc', ambient: 30, grouped: 1 };
let r = C.designCircuit(base);
ok(near(r.ib, 500 / 127, 1e-9) && r.need.section === 1.5 && r.need.breaker === 6 && near(r.need.iz, 17.5, 1e-9) && near(r.need.drop.percent, 2 * (500 / 127) * 0.02 * T.resistance(1.5, 'pvc') / 127 * 100, 1e-9),
  '500 W of lighting at 127 V, 20 m, conduit in masonry: 3.94 A, 1.5 mm² (17.5 A), a 6 A breaker, drop 1.8 %', JSON.stringify(r.need));
r = C.designCircuit({ ...base, watts: 1800, use: 'power', grouped: 3, length: 15 });
ok(near(r.ib, 1800 / 127, 1e-9) && r.need.section === 2.5 && r.need.breaker === 16 && near(r.need.iz, 24 * 0.7, 1e-9) && r.kGroup === 0.7, 'outlets, 1800 W, 3 circuits together: 14.2 A, 2.5 mm² at 24 × 0.70 = 16.8 A, a 16 A breaker');
r = C.designCircuit({ ...base, watts: 1800, use: 'power', grouped: 4, length: 15 });
ok(r.need.section === 4 && r.need.breaker === 16 && near(r.need.iz, 32 * 0.65, 1e-9), 'a fourth circuit in the conduit (0.65): 2.5 mm² gives 15.6 A, short of the 16 A breaker, so 4 mm² (20.8 A)');
r = C.designCircuit({ ...base, watts: 2000, use: 'power', length: 60 });
ok(r.need.section === 10 && r.need.breaker === 16 && near(r.need.drop.percent, 2 * (2000 / 127) * 0.06 * T.resistance(10, 'pvc') / 127 * 100, 1e-9) && r.need.drop.percent <= 4,
  '2000 W over 60 m: 6 mm² would drop 6.3 %, so 10 mm² (3.3 %), the breaker 16 A', JSON.stringify(r.need));
const motor = { ...base, watts: 11000, phases: '3F', pf: 0.85, insulation: 'epr', use: 'power', length: 0, system: '127/220' };
r = C.designCircuit(motor);
ok(near(r.ib, 11000 / (Math.sqrt(3) * 220 * 0.85), 1e-9) && r.volts === 220 && r.loaded === 3 && r.need.section === 6 && r.need.breaker === 40 && near(r.need.iz, 48, 1e-9) && r.need.drop === null, '11 kW three-phase at 220 V, power factor 0.85, EPR: 34.0 A, 6 mm² (48 A), a 40 A breaker; no length, no drop checked');
ok(C.designCircuit({ ...motor, ambient: 45 }).need.section === 6 && near(C.designCircuit({ ...motor, ambient: 45 }).need.iz, 48 * 0.87, 1e-9) && C.designCircuit({ ...motor, ambient: 50 }).need.section === 10, 'at 45 °C (0.87) 6 mm² still carries 41.8 A; at 50 °C (0.82) 39.4 A is short of 40 A: 10 mm²');
r = C.designCircuit({ ...base, ambient: 65 });
ok(r.error === 'temp' && !r.need, 'PVC at 65 °C: off the table, said so');
r = C.designCircuit({ ...base, section: 6, breaker: 0 });
ok(r.need.section === 6 && r.need.breaker === 6 && r.grow && r.now.section === 6 && r.now.ampacityOk && r.now.breakerOk === null, 'a chosen 6 mm² is never made smaller; no breaker chosen yet: 6 A');
r = C.designCircuit({ ...base, section: 1.5, breaker: 6 });
ok(!r.grow && r.now.breakerOk && r.now.ampacityOk && r.now.dropOk && r.now.minOk, 'chosen 1.5 mm² and 6 A: they stand, every check passes');
r = C.designCircuit({ ...base, section: 1.5, breaker: 20 });
ok(r.grow && r.need.section === 2.5 && r.need.breaker === 20 && r.now.breakerOk === false, 'chosen 1.5 mm² with a 20 A breaker: the breaker is above what the cable carries (17.5 A): 2.5 mm² (24 A)');
r = C.designCircuit({ ...base, use: 'power', watts: 100 });
ok(r.need.section === 2.5 && !C.evaluate({ ...base, use: 'power' }, 1.5, 6).minOk, 'an outlet circuit never goes under 2.5 mm²');
ok(C.designCircuit({ ...base, watts: 0 }).error === 'load' && C.designCircuit({ ...base, phases: 'X' }).error === 'phases' && C.designCircuit({ ...base, method: '99' }).error === 'method' && C.designCircuit({ ...base, watts: 5e6 }).error === 'toobig',
  'no load, an unknown phase or method, a load no section carries: said so, not sized');
r = C.designCircuit({ ...base, watts: 3000, phases: '3FN', length: 0, use: 'power' });
ok(r.loaded === 3 && C.cableText({ phases: '3FN' }, 70, { reducedNeutral: true }) === '3 × 70 + N 35 + PE 35 mm²' && C.cableText({ phases: 'FN' }, 2.5) === '1 × 2.5 + N 2.5 + PE 2.5 mm²' && C.cableText({ phases: '3F' }, 10) === '3 × 10 + PE 10 mm²' && C.cableText({ phases: 'FF' }, 4) === '2 × 4 + PE 4 mm²',
  'the conductors written out: one phase and neutral, three phases and a reduced neutral, no neutral');
// the voltage drop against the makers' V/A·km (Prysmian, conduit, non-magnetic): single phase and three phase, FP 0.8 and 0.95
const maker = { 1.5: [23.3, 27.6, 20.2, 23.9], 2.5: [14.3, 16.9, 12.4, 14.7], 4: [8.96, 10.6, 7.79, 9.15], 10: [3.63, 4.23, 3.17, 3.67], 16: [2.32, 2.68, 2.03, 2.33], 35: [1.12, 1.25, 0.98, 1.09], 70: [0.62, 0.67, 0.55, 0.59], 150: [0.35, 0.34, 0.31, 0.30], 240: [0.26, 0.24, 0.23, 0.21] };
let worst = 0;
for (const [s, row] of Object.entries(maker)) [['FN', 0.8], ['FN', 0.95], ['3F', 0.8], ['3F', 0.95]].forEach(([ph, pf], i) => {
  // 1 A over 1 km: watts that make 1 A
  const c = { watts: (ph === 'FN' ? 127 : Math.sqrt(3) * 220) * pf, pf, phases: ph, system: '127/220', length: 1000, insulation: 'pvc' };
  worst = Math.max(worst, Math.abs(C.dropOf(c, Number(s)).volts / row[i] - 1));
});
ok(worst < 0.04, 'the voltage drop (R at 70 °C and 0.1 Ω/km) agrees with a maker\'s V/A·km table within 4 % from 1.5 to 240 mm² (' + (worst * 100).toFixed(1) + ' %)');

// loads in VA or in W, the breakers of 70 and 90 A, the conventional trip current
r = C.designCircuit({ ...base, watts: 1000, pf: 0.8, use: 'power' });
const rVA = C.designCircuit({ ...base, watts: 1000, pf: 0.8, use: 'power', apparent: true });
ok(near(r.ib, 1000 / (127 * 0.8), 1e-9) && near(rVA.ib, 1000 / 127, 1e-9), 'a load in W is divided by the power factor (1000 W at 0.8: 9.84 A); one in VA is not (7.87 A)');
ok(near(C.dropOf({ ...base, watts: 1000, pf: 0.8, apparent: true }, 4).volts, 2 * (1000 / 127) * 0.02 * (T.resistance(4, 'pvc') * 0.8 + 0.1 * 0.6), 1e-9), 'the voltage drop still uses the power factor for a load in VA');
ok(T.BREAKERS.includes(70) && T.BREAKERS.includes(90) && T.BREAKERS.join() === [6, 10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 90, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000].join(), 'the breaker ratings now include 70 and 90 A');
r = C.designCircuit({ ...base, watts: 8500, phases: 'FN', use: 'power', length: 0 });
ok(near(r.ib, 8500 / 127, 1e-9) && r.need.breaker === 70 && r.need.section === 16 && near(r.need.iz, 76, 1e-9),
  '8.5 kW at 127 V: 66.9 A, a 70 A breaker (not 80), 16 mm² (76 A in B1 with two loaded conductors)', JSON.stringify(r.need));
ok(C.evaluate({ ...base }, 2.5, 16).breakerOk === true && C.evaluate({ ...base, watts: 2400 }, 2.5, 32).breakerOk === false, 'the breaker check holds I_B ≤ I_n ≤ I_Z and 1.45 I_n ≤ 1.45 I_Z');

console.log('== lights and outlets on circuits in a building (IFC4)');
const build = async () => {
  const text = N.newBuilding({ name: 'Circuits', levels: N.stackLevels(1, 3000, () => 'Ground'), fileName: 'c.ifc', now: new Date('2026-10-24T12:00:00Z') });
  const eng = await quiet(IfcModel.create)(WebIFC, null);
  await quiet((b) => eng.load(b))(new TextEncoder().encode(text));
  const ed = new IfcEditor(WebIFC, eng), levels = OPS.snapshotModel(ed).levels;
  const P = [[0, 0], [6000, 0], [6000, 4000], [0, 4000]];
  ed.modelChange(OPS.drawWalls({ storey: levels[0].guid, segs: P.map((p, i) => ({ a: p, b: P[(i + 1) % P.length] })), typeKey: 'ext-2x6', topLevel: '', height: 3000, extSide: 'right' }));
  return { ed, levels, W: () => new ModelWriter(WebIFC, ed.api, ed.mid) };
};
const B = await build();
const { ed, W } = B, L1 = B.levels[0].guid;
const walls = () => OPS.snapshotModel(ed).walls.filter((x) => x.storey === B.levels[0].id).map((x) => ({ guid: x.guid, a: x.a, b: x.b, t: x.t }));
const put = (kind, at, circuit, load, extra = {}) => ed.modelChange(EL.placeDevice({ level: L1, kind, units: 'mm', circuit, load, ...(EL.DEVICES[kind].mount === 'wall' ? EL.wallSpot(walls(), at) : { at }), ...extra }), { label: kind });
for (const x of [1000, 2000, 3000]) put('luminaire', [x, 2000], '1', 100);
for (const x of [1000, 2500, 4000]) put('socket', [x, 100], '2', 600);
put('socket.3ph', [5900, 2000], '3', 4000);
put('board', [3000, 3900], '', 0);
let D = EL.readDevices(W());
ok(D.length === 8 && D.filter((d) => d.circuit === '1').length === 3, 'three lights on circuit 1, three outlets on circuit 2, a three-phase outlet on 3, a panel');
ok(EL.readElectricalProject(W()).system === '127/220' && !EL.readCircuits(W()).size, 'no entity until a circuit is designed; the voltage system is 127/220 until the project says otherwise');
let plan = EL.circuitPlan(W());
const p1 = plan.get('1'), p2 = plan.get('2'), p3 = plan.get('3');
ok(plan.size === 3 && p1.count === 3 && p1.watts === 300 && p1.circuit.use === 'lighting' && p2.circuit.use === 'power' && p3.circuit.phases === '3F' && p1.circuit.phases === 'FN', 'three circuits found, the panel left out; lights make a lighting circuit, outlets a power one, a three-phase outlet a three-phase one');
ok(near(p1.result.ib, 300 / 127, 1e-9) && p1.result.need.section === 1.5 && p1.result.need.breaker === 6 && near(p2.result.ib, 1800 / 127, 1e-9) && p2.result.need.section === 2.5 && p2.result.need.breaker === 16 && near(p3.result.ib, 4000 / (Math.sqrt(3) * 220), 1e-9) && p3.result.need.section === 2.5 && p3.result.need.breaker === 16,
  'sized at 127/220 V: circuit 1 2.36 A → 1.5 mm², 6 A; circuit 2 14.2 A → 2.5 mm², 16 A; circuit 3 10.5 A → 2.5 mm², 16 A', JSON.stringify([p1.result.need, p2.result.need, p3.result.need]));
ed.modelChange(EL.setElectricalProject({ system: '220/380' }), { label: 'System' });
plan = EL.circuitPlan(W());
ok(plan.get('1').result.volts === 220 && near(plan.get('1').result.ib, 300 / 220, 1e-9) && plan.get('3').result.volts === 380 && plan.get('3').result.need.breaker === 10 && EL.readElectricalProject(W()).system === '220/380',
  'the project at 220/380 V: circuit 1 at 220 V (1.36 A), circuit 3 at 380 V (6.1 A: a 10 A breaker)');
let key = ''; try { ed.modelChange(EL.setElectricalProject({ system: '110/190' })); } catch (e) { key = e.key; }
ok(key === 'res.err.elcircuit', 'an unknown voltage system: refused');
ed.undo(); ed.modelChange(EL.setElectricalProject({ system: '127/220' }), { label: 'System' });
// the design of circuit 2
ed.modelChange(EL.setCircuit('2', { grouped: 4, length: 25, ambient: 40 }), { label: 'Circuit 2' });
const rec2 = EL.readCircuits(W()).get('2');
ok(rec2 && rec2.grouped === 4 && near(rec2.length, 25, 1e-6) && rec2.ambient === 40 && rec2.method === '7' && rec2.section === 0 && rec2.phases === 'FN', 'circuit 2 has its entity now, with what was set (25 m, four circuits together, 40 °C) and the defaults (method 7, PVC)');
plan = EL.circuitPlan(W());
const r2 = plan.get('2').result;
ok(near(r2.kTemp, 0.87) && near(r2.kGroup, 0.65) && r2.need.section === 4 && r2.need.breaker === 16 && near(r2.need.iz, 32 * 0.87 * 0.65, 1e-9) && near(r2.need.drop.percent, 2 * (1800 / 127) * 0.025 * T.resistance(4, 'pvc') / 127 * 100, 1e-9),
  'at 40 °C (0.87) with four circuits together (0.65) 2.5 mm² carries 13.6 A: 4 mm² (18.1 A), 16 A, a drop of 3.1 %', JSON.stringify(r2.need));
for (const [patch, what] of [[{ phases: 'XX' }, 'a phase arrangement that is none'], [{ section: 3 }, 'a section not in the tables'], [{ pf: 1.5 }, 'a power factor above 1'], [{ method: '99' }, 'an installation method that is none'], [{ ambient: 5 }, 'a temperature under 10 °C'], [{ breaker: 17 }, 'a breaker rating not in the list']]) {
  key = ''; try { ed.modelChange(EL.setCircuit('2', patch)); } catch (e) { key = e.key; }
  ok(key === 'res.err.elcircuit', what + ': refused');
}
// Size the circuits: one undo step; every circuit gets its section and breaker
const n0 = ed.changes.length;
ed.modelChange(EL.sizeCircuits(), { label: 'Size the circuits' });
const recs = EL.readCircuits(W());
ok(ed.changes.length === n0 + 1 && recs.size === 3 && recs.get('1').section === 1.5 && recs.get('1').breaker === 6 && recs.get('2').section === 4 && recs.get('2').breaker === 16 && recs.get('3').section === 2.5 && recs.get('3').breaker === 16,
  'Size the circuits: one undo step; circuit 1 1.5 mm² / 6 A, circuit 2 4 mm² / 16 A, circuit 3 2.5 mm² / 16 A');
ok([...EL.circuitPlan(W()).values()].every((p) => !p.result.grow), 'sized again: nothing left to change');
const members = (label) => { const w = W(), c = EL.readCircuits(w).get(label); const out = []; for (const rid of w.api.GetLineIDsWithType(w.mid, WebIFC.IFCRELASSIGNSTOGROUP)) { const l = w.api.GetLine(w.mid, rid, false); if (l.RelatingGroup?.value === c.id) for (const h of l.RelatedObjects) out.push(w.api.GetLine(w.mid, h.value, false).Tag.value); } return out.sort(); };
ok(members('1').join() === 'L1,L2,L3' && members('2').join() === 'R1,R2,R3' && members('3').join() === 'R4', 'each circuit\'s devices assigned to its entity (L1 L2 L3; R1 R2 R3; R4); the panel to none');
let txt = dec(ed.save());
ok((txt.match(/IFCDISTRIBUTIONCIRCUIT\(/g) || []).length === 3 && /IFCRELSERVICESBUILDINGS\(/.test(txt) && /'CadCraft_Circuit'/.test(txt) && /IFCPROPERTYSINGLEVALUE\('SectionMm2',\$,IFCREAL\(4\.\)/.test(txt) && /IFCPROPERTYSINGLEVALUE\('Phases',\$,IFCLABEL\('FN'\)/.test(txt),
  'in the file: three IfcDistributionCircuit serving the building, with CadCraft_Circuit (Phases FN and 3F, SectionMm2, …)');
// moving a device to another circuit moves it in the relations
const l3 = D.find((d) => d.tag === 'L3');
ed.modelChange(EL.changeDevice(l3.guid, { circuit: '2' }), { label: 'Circuit' });
ok(members('1').join() === 'L1,L2' && members('2').join() === 'L3,R1,R2,R3', 'a light moved to circuit 2: out of the relation of circuit 1, into circuit 2\'s');
ed.undo();
ok(members('1').join() === 'L1,L2,L3' && members('2').join() === 'R1,R2,R3', 'undo: back');
// a circuit emptied: its relation goes, its design stays; devices deleted leave the relation
ed.modelChange(EL.removeDevices(D.filter((d) => d.circuit === '3').map((d) => d.guid)), { label: 'Delete' });
const w3 = W();
ok(EL.readCircuits(w3).has('3') && [...w3.api.GetLineIDsWithType(w3.mid, WebIFC.IFCRELASSIGNSTOGROUP)].every((rid) => w3.api.GetLine(w3.mid, rid, false).RelatingGroup?.value !== EL.readCircuits(w3).get('3').id) && EL.circuitPlan(w3).size === 2,
  'the three-phase outlet deleted: circuit 3 keeps its design but has no relation and is not in the plan');
ed.undo();
// the schedule with the design
D = EL.readDevices(W());
const sc = EL.circuitSchedule(D, { units: 'mm', plan: EL.circuitPlan(W()) });
const row2 = sc.rows.find((x) => x[0] === '2');
ok(sc.head.length === 9 && row2 && row2[1] === '3' && row2[3] === '1800' && row2[4] === '14.2' && row2[5] === '127' && row2[6] === '1 × 4 + N 4 + PE 4 mm²' && row2[7] === '16 A' && row2[8] === '3.1 %', 'the circuit schedule with the design: circuit 2 is 1800 W, 14.2 A at 127 V, 1 × 4 + N 4 + PE 4 mm², 16 A, 3.1 %', JSON.stringify(row2));
ok(EL.circuitSchedule(D, { units: 'ftin' }).head.length === 6, 'without a plan the schedule is the old one (six columns)');
// the file read back
const eng2 = await quiet(IfcModel.create)(WebIFC, null);
await quiet((b) => eng2.load(b))(ed.save());
const ed2 = new IfcEditor(WebIFC, eng2), w2 = new ModelWriter(WebIFC, ed2.api, ed2.mid);
ok(EL.readCircuits(w2).size === 3 && EL.readCircuits(w2).get('2').section === 4 && EL.readElectricalProject(w2).system === '127/220' && EL.circuitPlan(w2).get('2').result.need.section === 4, 'the file read back: the three circuits and their design, the voltage system');

console.log('== an IFC2X3 file (IfcElectricalCircuit)');
{
  const fx = path.join(ROOT, 'tools/detailcraft-test/fixtures/ios-steel-ifc2x3.ifc');
  if (!fs.existsSync(fx)) console.log('  --   the DetailCraft fixture is not here: skipped');
  else {
    const e3 = await quiet(IfcModel.create)(WebIFC, null);
    await quiet((b) => e3.load(b))(fs.readFileSync(fx));
    const ed3 = new IfcEditor(WebIFC, e3), lv = OPS.snapshotModel(ed3).levels, w3b = () => new ModelWriter(WebIFC, ed3.api, ed3.mid);
    for (const x of [1000, 2000]) ed3.modelChange(EL.placeDevice({ level: lv[0].guid, kind: 'luminaire', units: 'mm', circuit: 'A1', load: 60, at: [x, 1000] }), { label: 'Light' });
    ed3.modelChange(EL.setCircuit('A1', { length: 12 }), { label: 'Circuit' });
    ed3.modelChange(EL.sizeCircuits(), { label: 'Size' });
    const t3 = dec(ed3.save());
    ok(/IFCELECTRICALCIRCUIT\(/.test(t3) && !/IFCDISTRIBUTIONCIRCUIT\(/.test(t3) && /IFCRELASSIGNSTOGROUP\(/.test(t3) && EL.readCircuits(w3b()).get('A1')?.section === 1.5 && EL.readCircuits(w3b()).get('A1').breaker === 6, 'IFC2X3: IfcElectricalCircuit, its two lights assigned by IfcRelAssignsToGroup, 1.5 mm² and 6 A');
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
