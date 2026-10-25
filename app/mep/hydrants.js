/* SPDX-License-Identifier: Apache-2.0 */
/**
 * hydrants.js — hydrant and hose-reel (mangotinho) systems as Instrução Técnica 22/2025 of the Corpo de Bombeiros of São Paulo
 * (CBPMESP, updated by Portaria CCB 003/800/25) asks. DOM-free, no IFC: mep-model.js gives it the run's length, inside diameter
 * and material. The numbers are the IT's own tables, read from its rendered pages.
 *
 *   TYPES[key] → { type (1..5), nozzle (DN mm), hose (DN mm), hoseLength (m), double, flow (L/min), head (mca) }   IT 22 Tabela 2
 *   TYPE_KEYS = ['1', '2', '3', '4-40', '4-65', '5']
 *   COLUMNS[n] → the occupations of the column of Tabela 3 (n = 1..5); AREA_BANDS (m², upper limits)
 *   systemFor(column, area) → { type: '1'|'2'|'3'|'4'|'5', rti (m³), band } | null            IT 22 Tabela 3
 *   C_HAZEN[material] → the Hazen–Williams factor                                             IT 22 Tabela 1
 *   hazenJ(q (L/min), C, D (mm)) → J (m of water per m)                                       IT 22 item 4.8.10.2
 *   speed(q (L/min), D (mm)) → m/s                                                            IT 22 item 4.8.11
 *   MAX_SPEED (5 m/s, 4.8.12) · MAX_NOZZLE_HEAD (100 mca, 4.8.8) · MIN_NOMINAL_MM (DN65 and, for types 1 and 2, DN50; 4.11.6)
 *   designFlow(key, hydrants) → L/min: the flow of the two most unfavourable jets (4.8.3), so the type's flow times
 *     min(hydrants, 2); a single double hydrant counts as two jets (4.8.3.1) only if the project says two hydrants
 *   checkRun({ key, hydrants, d (mm inside), nominal (mm), material, length (m), rise (m, end above start), minNominal }) →
 *     { q, v, j, loss (mca), need (mca at the run's start for the end hydrant), speedOk, sizeOk, C }
 */
export const TYPE_KEYS = ['1', '2', '3', '4-40', '4-65', '5'];
export const TYPES = {
  '1': { type: 1, nozzle: 25, hose: 25, hoseLength: 30, double: false, flow: 100, head: 80 },
  '2': { type: 2, nozzle: 40, hose: 40, hoseLength: 30, double: false, flow: 150, head: 30 },
  '3': { type: 3, nozzle: 40, hose: 40, hoseLength: 30, double: false, flow: 200, head: 40 },
  '4-40': { type: 4, nozzle: 40, hose: 40, hoseLength: 30, double: false, flow: 300, head: 65 },
  '4-65': { type: 4, nozzle: 65, hose: 65, hoseLength: 30, double: false, flow: 300, head: 30 },
  '5': { type: 5, nozzle: 65, hose: 65, hoseLength: 30, double: true, flow: 600, head: 60 },
};

/** Upper limits of the area bands of Tabela 3 (m²); the last band is above 50 000. */
export const AREA_BANDS = [2500, 5000, 10000, 20000, 50000];
// Tabela 3, one list per column, one value per band (smallest area first): [type, reserve in m³]
const T = (t, ...rti) => rti.map((r, i) => [Array.isArray(t) ? t[i] : t, r]);
const RTI = {
  1: T(1, 5, 8, 12, 18, 25, 35),
  2: T(2, 8, 12, 18, 25, 35, 48),
  3: T(3, 12, 18, 25, 35, 48, 70),
  4: T(4, 28, 32, 48, 64, 96, 120),
  5: T([4, 4, 5, 5, 5, 5], 32, 48, 64, 96, 120, 180),
};
const G1 = 'A-2, A-3, C-1, D-1 (up to 300 MJ/m²), D-2, D-3 (up to 300 MJ/m²), D-4 (up to 300 MJ/m²), E-1 to E-6, F-1 (up to 300 MJ/m²), F-2, F-3, F-4, F-8, G-1 to G-4 (up to 300 MJ/m²), H-1, H-2, H-3, H-5, H-6, I-1, J-1, J-2, M-3';
export const COLUMNS = {
  1: G1,
  2: G1,
  3: 'D-1, D-3, D-4 (above 300 MJ/m²), B-1, B-2, C-2 (above 300 up to 1000 MJ/m²), C-3, F-1 (above 300 MJ/m²), F-5, F-6, F-7, F-9, F-10, F-11, H-4, I-2 (above 300 up to 800 MJ/m²), J-3 (above 300 up to 800 MJ/m²), K-1',
  4: 'C-2 (above 1000 MJ/m²), G-1 to G-4 (above 300 MJ/m²), I-2 (above 800 MJ/m²), J-3 (above 800 MJ/m²), L-1',
  5: 'G-5, I-3, J-4, L-2, L-3, M-7',
};

/** The system type and the fire reserve (RTI, m³) of a column of Tabela 3 for a built area (m²). */
export function systemFor(column, area) {
  const list = RTI[column];
  if (!list || !(area > 0)) return null;
  let band = AREA_BANDS.findIndex((u) => area <= u);
  if (band < 0) band = AREA_BANDS.length;
  const [type, rti] = list[band];
  return { type: String(type), rti, band };
}

/** Hazen–Williams factor C (IT 22 Tabela 1, new pipes) by the material of the pipe tables here. */
export const C_HAZEN = { steel: 120, copper: 150, pvc: 150, 'pvc-sold': 150, pex: 150 };
export const MAX_SPEED = 5, MAX_NOZZLE_HEAD = 100;
/** Smallest nominal diameter (mm) of a hydrant pipe: DN65 (2½"), DN50 (2") for types 1 and 2. A size counts as DN65 from 62 mm
 *  and as DN50 from 49 mm, which takes the 2½" and 2" of the inch tables and the PVC of 75 and 50 mm. */
export const MIN_NOMINAL_MM = { 65: 62, 50: 49 };
export const minNominalOf = (key) => (TYPES[key] && TYPES[key].type <= 2 ? MIN_NOMINAL_MM[50] : MIN_NOMINAL_MM[65]);

/** J = 605 · Q^1.85 · C^-1.85 · D^-4.87 · 10^4 (m/m), Q in L/min, D the inside diameter in mm. */
export const hazenJ = (q, C, D) => 605 * Math.pow(q, 1.85) * Math.pow(C, -1.85) * Math.pow(D, -4.87) * 1e4;
/** v = Q / A (m/s), Q in L/min, D in mm. */
export const speed = (q, D) => (q / 60000) / (Math.PI * (D / 1000) ** 2 / 4);

export function designFlow(key, hydrants) {
  const t = TYPES[key];
  if (!t || !(hydrants > 0)) return 0;
  return t.flow * Math.min(Math.floor(hydrants), 2);
}

export function checkRun({ key, hydrants, d, nominal, material, length, rise = 0, minNominal }) {
  const t = TYPES[key], C = C_HAZEN[material] || C_HAZEN.steel;
  const q = designFlow(key, hydrants);
  if (!t || !(d > 0)) return null;
  const v = speed(q, d), j = hazenJ(q, C, d), loss = j * Math.max(length, 0);
  return {
    q, v, j, loss, C, need: t.head + loss + rise,
    speedOk: v <= MAX_SPEED + 1e-9, sizeOk: nominal + 1e-9 >= (minNominal ?? minNominalOf(key)),
  };
}
