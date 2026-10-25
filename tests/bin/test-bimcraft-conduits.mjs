#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * test-bimcraft-conduits.mjs — conduits and cables as makers print them and the fill NBR 5410 allows: the catalogue values as printed
 * (Wavin PVC conduits, Elecon steel conduits, Corfio flexible 750 V cables; elec/conduits.js), the fill worked by hand (53 / 31 / 40 %),
 * the smallest conduit, and in a building: a circuit in a conduit (res-elec.js conduitCheck / setCircuit / circuitPlan), its choice kept in the file.
 *   node bin/test-bimcraft-conduits.mjs [--verbose]
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
const K = await imp('elec/conduits.js');
const EL = await imp('res-elec.js');

let pass = 0, fail = 0;
const ok = (c, m, detail = '') => { if (c) { pass++; if (VERBOSE) console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (detail ? ' (' + detail + ')' : '')); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const quiet = (fn) => async (...a) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return await fn(...a); } finally { console.log = l; console.warn = w; } };

console.log('== the catalogues as printed');
const row = (fam) => K.CONDUITS[fam].sizes.map((s) => [s.key, s.dn, s.od, s.wall].join(' ')).join(' | ');
ok(row('pvc-thread') === '1/2" 20 20.8 2.2 | 3/4" 25 26.2 2.3 | 1" 32 32.9 2.7 | 1.1/4" 40 41.9 3 | 1.1/2" 50 47.4 3 | 2" 60 59.1 3.2 | 2.1/2" 75 74.9 3.8 | 3" 85 87.6 4 | 4" 110 112.7 4.4',
  'Wavin threaded PVC conduit: mean outside diameter and wall, ½" to 4" (page 9)', row('pvc-thread'));
ok(row('pvc-solder') === 'DN20 20 20 1.6 | DN25 25 25 1.8 | DN32 32 32 2.1', 'Wavin solvent-weld PVC conduit: DN 20, 25 and 32 (outside 20, 25, 32; wall 1.6, 1.8, 2.1; page 6)', row('pvc-solder'));
ok(row('steel-heavy') === '1/2" 15 20 1.5 | 3/4" 20 25.2 1.5 | 1" 25 31.5 1.5 | 1.1/4" 32 40.5 2 | 1.1/2" 40 46.6 2.25 | 2" 50 58.4 2.25 | 2.1/2" 65 74.1 2.65 | 3" 80 86.8 2.65 | 4" 100 111.6 2.65',
  'Elecon electrolytic heavy steel conduit (NBR 13057): the smaller outside diameter and the wall, DN 15 to 100 (page 5)', row('steel-heavy'));
ok(row('steel-rir') === '1/2" 15 21.3 2.25 | 3/4" 20 26.9 2.25 | 1" 25 33.7 2.65 | 1.1/4" 32 42.4 3 | 1.1/2" 40 48.3 3 | 2" 50 60.3 3.35 | 2.1/2" 65 73 3.75 | 3" 80 88.9 3.75 | 4" 100 114.3 4.25 | 5" 125 141.3 5 | 6" 150 168.3 5.3',
  'Elecon RIR steel conduit (NBR 5597, NPT): outside diameter and wall, DN 15 to 150 (page 7)', row('steel-rir'));
ok(K.CONDUITS['pvc-thread'].sizes[0].id === 16.4 && K.CONDUITS['pvc-thread'].sizes.every((s) => near(s.id, s.od - 2 * s.wall, 1e-9) && s.derived) && K.CONDUIT_FAMILIES.every((f) => K.SOURCES[K.CONDUITS[f].source]?.url),
  'the inside diameter is the outside less twice the wall (½" PVC: 16.4 mm), marked derived, and every family names its source');
const OD = { 0.5: 2.15, 0.75: 2.35, 1: 2.5, 1.5: 2.95, 2.5: 3.55, 4: 4.05, 6: 4.65, 10: 6, 16: 7, 25: 8.6, 35: 10.15, 50: 11.8, 70: 13.5, 95: 15.7, 120: 17.2, 150: 19.1, 185: 21.4, 240: 24.2 };
ok(Object.entries(OD).every(([s, d]) => K.CABLE_OD[s] === d) && Object.keys(K.CABLE_OD).length === 18, 'Corfio flexible 750 V cable: the outside diameter of every section from 0.5 to 240 mm² as printed (page 5)');
ok(K.CABLE_SOURCE.url.endsWith('Catalogo_de_Produtos-Corfio.pdf'), 'the cable table names its catalogue');

console.log('== the fill NBR 5410 allows');
ok(K.FILL_LIMIT(1) === 0.53 && K.FILL_LIMIT(2) === 0.31 && K.FILL_LIMIT(3) === 0.4 && K.FILL_LIMIT(12) === 0.4, 'one cable 53 %, two 31 %, three or more 40 %');
ok(K.conductorsOf('FN', 2.5).join() === '2.5,2.5,2.5' && K.conductorsOf('FF', 4).join() === '4,4,4' && K.conductorsOf('3F', 10).join() === '10,10,10,10' && K.conductorsOf('3FN', 35).join() === '35,35,35,35,16' && K.conductorsOf('3FN', 70, true).join() === '70,70,70,35,35',
  'the conductors in the conduit: phases, neutral and protective (one phase and neutral 2.5 mm²: three of 2.5; three phases and neutral 35 mm²: four of 35 and a 16)');
const half = K.CONDUITS['pvc-thread'].sizes[0];
let f = K.fillOf(half, [2.5, 2.5, 2.5]);
ok(near(f.ratio, 3 * 3.55 ** 2 / 16.4 ** 2, 1e-12) && near(f.ratio, 0.1406, 1e-4) && f.limit === 0.4 && f.ok && f.conductors === 3, 'three 2.5 mm² cables (3.55 mm) in a ½" PVC conduit (16.4 mm inside): 14.1 % of the 40 % allowed', JSON.stringify(f));
f = K.fillOf(K.CONDUITS['pvc-thread'].sizes[1], Array(12).fill(2.5));
ok(near(f.ratio, 12 * 3.55 ** 2 / 21.6 ** 2, 1e-12) && f.ok && near(f.ratio, 0.324, 1e-3), 'twelve of them (four circuits) in a ¾": 32.4 %, within the 40 %');
f = K.fillOf(half, Array(12).fill(2.5));
ok(!f.ok && near(f.ratio, 12 * 3.55 ** 2 / 16.4 ** 2, 1e-12) && near(f.ratio, 0.562, 1e-3), 'the same twelve in a ½": 56.2 %, over the 40 %');
ok(K.smallestConduit('pvc-thread', [2.5, 2.5, 2.5]).key === '1/2"' && K.smallestConduit('pvc-thread', Array(12).fill(2.5)).key === '3/4"' && K.smallestConduit('pvc-thread', Array(14).fill(2.5)).key === '3/4"' && K.smallestConduit('pvc-thread', Array(15).fill(2.5)).key === '1"',
  'the smallest PVC conduit: three cables ½", twelve and fourteen ¾" (37.8 %), fifteen 1" (¾" would be 40.5 %)');
ok(K.smallestConduit('steel-rir', K.conductorsOf('3FN', 35)).key === '1.1/4"' && !K.fillOf(K.CONDUITS['steel-rir'].sizes[2], K.conductorsOf('3FN', 35)).ok && near(K.fillOf(K.CONDUITS['steel-rir'].sizes[3], K.conductorsOf('3FN', 35)).ratio, (4 * 10.15 ** 2 + 7 ** 2) / 36.4 ** 2, 1e-12),
  'three phases and neutral of 35 mm² in RIR steel: 1" is over (57 %), 1¼" takes it (34.8 %)');
ok(K.fillOf(half, [300]).pending === 'cable' && K.smallestConduit('pvc-thread', [300]) === null && K.smallestConduit('pvc-thread', Array(500).fill(240)) === null, 'a cable the catalogue has no diameter for (300 mm²): pending, not guessed; no size takes 500 cables of 240 mm²: none');

console.log('== a circuit in a conduit');
const text = N.newBuilding({ name: 'Conduits', levels: N.stackLevels(1, 3000, () => 'Ground'), fileName: 'k.ifc', now: new Date('2026-10-24T12:00:00Z') });
const eng = await quiet(IfcModel.create)(WebIFC, null);
await quiet((b) => eng.load(b))(new TextEncoder().encode(text));
const ed = new IfcEditor(WebIFC, eng), L1 = OPS.snapshotModel(ed).levels[0].guid, W = () => new ModelWriter(WebIFC, ed.api, ed.mid);
for (const x of [1000, 2000, 3000]) ed.modelChange(EL.placeDevice({ level: L1, kind: 'luminaire', units: 'mm', circuit: 'A', load: 100, at: [x, 2000] }), { label: 'Light' });
ok(EL.circuitPlan(W()).get('A').conduit === null, 'no conduit asked: no check');
ed.modelChange(EL.setCircuit('A', { conduit: 'pvc-thread' }), { label: 'Conduit' });
let cd = EL.circuitPlan(W()).get('A').conduit;
ok(cd.family === 'pvc-thread' && cd.size === null && cd.smallest.key === '1/2"' && cd.section === 1.5 && cd.conductors === 3 && cd.together === 1, 'a threaded PVC conduit asked, none chosen: for the 1.5 mm² the circuit needs, the smallest is ½"', JSON.stringify(cd));
ed.modelChange(EL.setCircuit('A', { conduitSize: '3/4"' }), { label: 'Size' });
cd = EL.circuitPlan(W()).get('A').conduit;
ok(cd.size.key === '3/4"' && cd.fill.ok && near(cd.fill.ratio, 3 * 2.95 ** 2 / 21.6 ** 2, 1e-12), 'the ¾" chosen: three 1.5 mm² cables (2.95 mm) fill 5.6 %', cd.fill.ratio.toFixed(4));
ed.modelChange(EL.setCircuit('A', { section: 25, breaker: 6 }), { label: 'Section' });
cd = EL.circuitPlan(W()).get('A').conduit;
ok(cd.section === 25 && cd.conductors === 3 && !cd.fill.ok && near(cd.fill.ratio, (2 * 8.6 ** 2 + 7 ** 2) / 21.6 ** 2, 1e-12) && cd.smallest.key === '1"',
  'a chosen 25 mm² (two cables of 8.6 mm and a 16 mm² protective one of 7.0) fills 42.2 % of the ¾": over; the smallest is 1"', JSON.stringify(cd.fill));
ed.modelChange(EL.setCircuit('A', { section: 1.5, grouped: 8 }), { label: 'Together' });
cd = EL.circuitPlan(W()).get('A').conduit;
ok(cd.together === 8 && cd.conductors === 24 && near(cd.fill.ratio, 24 * 2.95 ** 2 / 21.6 ** 2, 1e-12) && !cd.fill.ok, 'eight circuits together are taken to have the same cables: 24 of them in the ¾" is 44.8 %, over 40 %; the smallest is ' + cd.smallest.key, JSON.stringify(cd.fill));
ed.modelChange(EL.setCircuit('A', { insulation: 'epr' }), { label: 'EPR' });
cd = EL.circuitPlan(W()).get('A').conduit;
ok(cd.pending === 'cable', 'EPR cables: the catalogue has PVC ones only, so the fill is pending');
ed.modelChange(EL.setCircuit('A', { insulation: 'pvc', method: '11' }), { label: 'On a wall' });
ok(EL.circuitPlan(W()).get('A').conduit === null, 'a method that is not a conduit (cables on a wall): no conduit check');
ed.modelChange(EL.setCircuit('A', { method: '7' }), { label: 'Masonry' });
for (const [patch, what] of [[{ conduit: 'wood' }, 'a conduit family that is none'], [{ conduitSize: '9"' }, 'a conduit size that is none']]) {
  let key = ''; try { ed.modelChange(EL.setCircuit('A', patch)); } catch (e) { key = e.key; }
  ok(key === 'res.err.elcircuit', what + ': refused');
}
const rec = EL.readCircuits(W()).get('A');
ok(rec.conduit === 'pvc-thread' && rec.conduitSize === '3/4"' && /IFCPROPERTYSINGLEVALUE\('ConduitFamily',\$,IFCLABEL\('pvc-thread'\)/.test(new TextDecoder().decode(ed.save())), 'the choice kept in the file (CadCraft_Circuit ConduitFamily, ConduitSize)');
ed.modelChange(EL.setCircuit('A', { conduit: '' }), { label: 'None' });
ok(EL.circuitPlan(W()).get('A').conduit === null && EL.readCircuits(W()).get('A').conduitSize === '3/4"', 'no conduit again: no check');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
