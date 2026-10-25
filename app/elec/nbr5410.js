/* SPDX-License-Identifier: Apache-2.0 */
/**
 * nbr5410.js — the tables of ABNT NBR 5410:2004 (Instalações elétricas de baixa tensão) that size a circuit's conductor: current
 * capacity, temperature and grouping factors, smallest sections. DOM-free, no IFC. Copper conductors; PVC (70 °C) and EPR / XLPE
 * (90 °C) insulation; reference methods A1, A2, B1, B2, C and D. Only numbers are used, not the standard's text.
 *
 * The values were read from the standard's own tables as reproduced in public course material (the tables of the standard
 * collected by Guia da Engenharia; Prysmian's catalogue as copied by PUC Goiás for the voltage drop limits), by program from the
 * text of the PDF and checked against the rendered pages table by table: Tabela 33 (installation methods), 36 and 37 (current
 * capacity), 40 (temperature), 41 (soil resistivity), 42 and 45 (grouping), 47 (smallest sections), 48 (neutral), 58 (protective
 * conductor). Tabela 36 for copper to 35 mm² also agrees with a second reproduction.
 *
 *   SECTIONS · METHODS[key] → { ref: A1 | A2 | B1 | B2 | C | D, group: 'bundle' | 'layer' | 'ceiling' | 'buried-multi' | 'buried-single' }
 *   ampacity(insulation, section, method, loaded) → A (Table 36 PVC / 37 EPR-XLPE, 2 or 3 loaded conductors)
 *   tempFactor(insulation, °C, soil) → Table 40 (30 °C air, 20 °C soil; a temperature between listed ones takes the next hotter's)
 *   soilFactor(K·m/W) → Table 41 (2.5 is the reference; a value between listed ones takes the next higher resistivity)
 *   groupFactor(method, arrangement, circuits, spacing) → Table 42 (rows 1, 2, 3) or Table 45 (buried conduits, 2 to 6 circuits)
 *   minSection(use) → Table 47 · neutralSection(S) → Table 48 · protectiveSection(S) → Table 58
 *   RESISTANCE_20[S] (Ω/km, rigid class 2 copper, IEC 60228) · RESISTANCE_FLEX[S] (flexible, classes 4 and 5, 0.5 to 240 mm²)
 *   BREAKERS (A) · SYSTEMS (voltage systems)
 */
export const SECTIONS = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630, 800, 1000];

// Tabela 33: the installation methods offered here and the reference method of each, and the row of the grouping table it uses
export const METHODS = {
  1: { ref: 'A1', group: 'bundle' },    // isolated conductors or single-core cables in a round conduit in a thermally insulating wall
  2: { ref: 'A2', group: 'bundle' },    // multicore cable in a round conduit in a thermally insulating wall
  3: { ref: 'B1', group: 'bundle' },    // isolated conductors in a round conduit on a wall
  4: { ref: 'B2', group: 'bundle' },    // multicore cable in a round conduit on a wall
  5: { ref: 'B1', group: 'bundle' },    // isolated conductors in a non-round conduit on a wall
  6: { ref: 'B2', group: 'bundle' },    // multicore cable in a non-round conduit on a wall
  7: { ref: 'B1', group: 'bundle' },    // isolated conductors in a round conduit embedded in masonry
  8: { ref: 'B2', group: 'bundle' },    // multicore cable in a round conduit embedded in masonry
  11: { ref: 'C', group: 'layer' },     // single-core or multicore cables on a wall
  '11A': { ref: 'C', group: 'ceiling' },   // single-core or multicore cables fixed to the ceiling
  61: { ref: 'D', group: 'buried-multi' },    // multicore cable in a buried conduit
  '61A': { ref: 'D', group: 'buried-single' },   // single-core cables in a buried conduit (one cable per conduit)
};
export const METHOD_KEYS = Object.keys(METHODS);
export const DEFAULT_METHOD = '7';

// column of a row: [A1-2, A1-3, A2-2, A2-3, B1-2, B1-3, B2-2, B2-3, C-2, C-3, D-2, D-3] (2 or 3 loaded conductors)
const COL = { A1: 0, A2: 2, B1: 4, B2: 6, C: 8, D: 10 };
// Tabela 36 — copper, PVC, 70 °C (30 °C air, 20 °C soil), A
const CU_PVC = {
  1: [11, 10, 11, 10, 14, 12, 13, 12, 15, 14, 18, 15],
  4: [26, 24, 25, 23, 32, 28, 30, 27, 36, 32, 38, 31],
  6: [34, 31, 32, 29, 41, 36, 38, 34, 46, 41, 47, 39],
  10: [46, 42, 43, 39, 57, 50, 52, 46, 63, 57, 63, 52],
  16: [61, 56, 57, 52, 76, 68, 69, 62, 85, 76, 81, 67],
  25: [80, 73, 75, 68, 101, 89, 90, 80, 112, 96, 104, 86],
  35: [99, 89, 92, 83, 125, 110, 111, 99, 138, 119, 125, 103],
  50: [119, 108, 110, 99, 151, 134, 133, 118, 168, 144, 148, 122],
  70: [151, 136, 139, 125, 192, 171, 168, 149, 213, 184, 183, 151],
  95: [182, 164, 167, 150, 232, 207, 201, 179, 258, 223, 216, 179],
  120: [210, 188, 192, 172, 269, 239, 232, 206, 299, 259, 246, 203],
  150: [240, 216, 219, 196, 309, 275, 265, 236, 344, 299, 278, 230],
  185: [273, 245, 248, 223, 353, 314, 300, 268, 392, 341, 312, 258],
  240: [321, 286, 291, 261, 415, 370, 351, 313, 461, 403, 361, 297],
  300: [367, 328, 334, 298, 477, 426, 401, 358, 530, 464, 408, 336],
  400: [438, 390, 398, 355, 571, 510, 477, 425, 634, 557, 478, 394],
  500: [502, 447, 456, 406, 656, 587, 545, 486, 729, 642, 540, 445],
  630: [578, 514, 526, 467, 758, 678, 626, 559, 843, 743, 614, 506],
  800: [669, 593, 609, 540, 881, 788, 723, 645, 978, 865, 700, 577],
  1000: [767, 679, 698, 618, 1012, 906, 827, 738, 1125, 996, 792, 652],
  0.5: [7, 7, 7, 7, 9, 8, 9, 8, 10, 9, 12, 10],
  0.75: [9, 9, 9, 9, 11, 10, 11, 10, 13, 11, 15, 12],
  1.5: [14.5, 13.5, 14, 13, 17.5, 15.5, 16.5, 15, 19.5, 17.5, 22, 18],
  2.5: [19.5, 18, 18.5, 17.5, 24, 21, 23, 20, 27, 24, 29, 24],
};
// Tabela 37 — copper, EPR or XLPE, 90 °C, A
const CU_EPR = {
  1: [15, 13, 14, 13, 18, 16, 17, 15, 19, 17, 21, 17],
  4: [35, 31, 33, 30, 42, 37, 40, 35, 45, 40, 44, 37],
  6: [45, 40, 42, 38, 54, 48, 51, 44, 58, 52, 56, 46],
  10: [61, 54, 57, 51, 75, 66, 69, 60, 80, 71, 73, 61],
  16: [81, 73, 76, 68, 100, 88, 91, 80, 107, 96, 95, 79],
  25: [106, 95, 99, 89, 133, 117, 119, 105, 138, 119, 121, 101],
  35: [131, 117, 121, 109, 164, 144, 146, 128, 171, 147, 146, 122],
  50: [158, 141, 145, 130, 198, 175, 175, 154, 209, 179, 173, 144],
  70: [200, 179, 183, 164, 253, 222, 221, 194, 269, 229, 213, 178],
  95: [241, 216, 220, 197, 306, 269, 265, 233, 328, 278, 252, 211],
  120: [278, 249, 253, 227, 354, 312, 305, 268, 382, 322, 287, 240],
  150: [318, 285, 290, 259, 407, 358, 349, 307, 441, 371, 324, 271],
  185: [362, 324, 329, 295, 464, 408, 395, 348, 506, 424, 363, 304],
  240: [424, 380, 386, 346, 546, 481, 462, 407, 599, 500, 419, 351],
  300: [486, 435, 442, 396, 628, 553, 529, 465, 693, 576, 474, 396],
  400: [579, 519, 527, 472, 751, 661, 628, 552, 835, 692, 555, 464],
  500: [664, 595, 604, 541, 864, 760, 718, 631, 966, 797, 627, 525],
  630: [765, 685, 696, 623, 998, 879, 825, 725, 1122, 923, 711, 596],
  800: [885, 792, 805, 721, 1158, 1020, 952, 837, 1311, 1074, 811, 679],
  1000: [1014, 908, 923, 826, 1332, 1173, 1088, 957, 1515, 1237, 916, 767],
  0.5: [10, 9, 10, 9, 12, 10, 11, 10, 12, 11, 14, 12],
  0.75: [12, 11, 12, 11, 15, 13, 15, 13, 16, 14, 18, 15],
  1.5: [19, 17, 18.5, 16.5, 23, 20, 22, 19.5, 24, 22, 26, 22],
  2.5: [26, 23, 25, 22, 31, 28, 30, 26, 33, 30, 34, 29],
};
const AMPACITY = { pvc: CU_PVC, epr: CU_EPR };
export const INSULATIONS = { pvc: { maxC: 70, label: 'PVC' }, epr: { maxC: 90, label: 'EPR / XLPE' } };

/** Table 36 / 37: amperes for a section, a method (a key of METHODS) and 2 or 3 loaded conductors; null when not in the table. */
export function ampacity(insulation, section, method, loaded) {
  const row = AMPACITY[insulation]?.[section], m = METHODS[method];
  if (!row || !m) return null;
  return row[COL[m.ref] + (loaded >= 3 ? 1 : 0)];
}

// Tabela 40: [°C, PVC, EPR/XLPE]
const T_AIR = [[10, 1.22, 1.15], [15, 1.17, 1.12], [20, 1.12, 1.08], [25, 1.06, 1.04], [30, 1, 1], [35, 0.94, 0.96], [40, 0.87, 0.91], [45, 0.79, 0.87], [50, 0.71, 0.82], [55, 0.61, 0.76], [60, 0.50, 0.71],
  [65, null, 0.65], [70, null, 0.58], [75, null, 0.50], [80, null, 0.41]];
const T_SOIL = [[10, 1.10, 1.07], [15, 1.05, 1.04], [20, 1, 1], [25, 0.95, 0.96], [30, 0.89, 0.93], [35, 0.84, 0.89], [40, 0.77, 0.85], [45, 0.71, 0.80], [50, 0.63, 0.76], [55, 0.55, 0.71], [60, 0.45, 0.65],
  [65, null, 0.60], [70, null, 0.53], [75, null, 0.46], [80, null, 0.38]];
/** Table 40's factor for an ambient (or soil) temperature; null off the table (under 10 °C, or hotter than the insulation allows). */
export function tempFactor(insulation, celsius, soil = false) {
  const col = insulation === 'epr' ? 2 : 1, tab = soil ? T_SOIL : T_AIR;
  if (!(celsius >= 10)) return null;
  const row = tab.find((r) => r[0] >= celsius - 1e-9);
  return row && row[col] != null ? row[col] : null;
}
// Tabela 41: [K·m/W, factor]
const SOIL = [[1, 1.18], [1.5, 1.10], [2, 1.05], [2.5, 1], [3, 0.96]];
export function soilFactor(resistivity) {
  if (!(resistivity >= 1)) return null;
  const row = SOIL.find((r) => r[0] >= resistivity - 1e-9);
  return row ? row[1] : null;
}

// Tabela 42, rows 1 (bundle, closed conduit), 2 (single layer on a wall, floor or unperforated tray), 3 (single layer on the ceiling):
// 1, 2, 3, 4, 5, 6, 7, 8 circuits, then 9 to 11, 12 to 15, 16 to 19, 20 or more (row 1) or one value for 9 or more (rows 2 and 3)
const G42 = {
  bundle: [1, 0.80, 0.70, 0.65, 0.60, 0.57, 0.54, 0.52],
  layer: [1, 0.85, 0.79, 0.75, 0.73, 0.72, 0.72, 0.71],
  ceiling: [0.95, 0.81, 0.72, 0.68, 0.66, 0.64, 0.63, 0.62],
};
const G42_TAIL = { bundle: [[11, 0.50], [15, 0.45], [19, 0.41], [Infinity, 0.38]], layer: [[Infinity, 0.70]], ceiling: [[Infinity, 0.61]] };
// Tabela 45 (buried conduits, 0.7 m deep, soil 2.5 K·m/W), 2 to 6 circuits, by the spacing between conduits: nil, 0.25, 0.5, 1 m
const G45 = {
  'buried-multi': { 0: [0.85, 0.75, 0.70, 0.65, 0.60], 0.25: [0.90, 0.85, 0.80, 0.80, 0.80], 0.5: [0.95, 0.90, 0.85, 0.85, 0.80], 1: [0.95, 0.95, 0.90, 0.90, 0.80] },
  'buried-single': { 0: [0.80, 0.70, 0.65, 0.60, 0.60], 0.25: [0.90, 0.80, 0.75, 0.70, 0.70], 0.5: [0.90, 0.85, 0.80, 0.80, 0.80], 1: [0.95, 0.90, 0.90, 0.90, 0.90] },
};
export const SPACINGS = [0, 0.25, 0.5, 1];
/** Table 42 or 45's grouping factor for `circuits` (this one included); `arrangement` 'bundle' puts a method C cable in row 1.
 *  null when the table does not go that far (buried: 7 circuits or more). */
export function groupFactor(method, arrangement, circuits, spacing = 0) {
  const m = METHODS[method];
  if (!m) return null;
  const n = Math.max(1, Math.floor(circuits || 1));
  if (m.group.startsWith('buried')) {
    if (n === 1) return 1;
    const sp = SPACINGS.find((s) => s >= spacing - 1e-9);
    if (sp === undefined || n > 6) return null;
    return G45[m.group][sp][n - 2];
  }
  const row = m.ref === 'C' && arrangement === 'bundle' ? 'bundle' : m.group;
  const head = G42[row];
  if (n <= 8) return head[n - 1];
  return G42_TAIL[row].find((r) => n <= r[0])[1];
}

/** Table 47: the smallest copper section by the use of the circuit: lighting 1.5 mm², power (sockets included) 2.5 mm². */
export const minSection = (use) => (use === 'lighting' ? 1.5 : 2.5);
// Tabela 48: phase section → reduced neutral (only above 25 mm², and only where the standard allows it)
const N48 = { 35: 25, 50: 25, 70: 35, 95: 50, 120: 70, 150: 70, 185: 95, 240: 120, 300: 150, 400: 185 };
export const neutralSection = (s, reduced = false) => (s <= 25 || !reduced ? s : N48[s] ?? s);
/** Table 58: up to 16 mm² the protective conductor is as large as the phase, up to 35 mm² 16 mm², above S/2. */
export const protectiveSection = (s) => (s <= 16 ? s : s <= 35 ? 16 : s / 2);

// DC resistance at 20 °C of class 2 copper conductors, Ω/km (IEC 60228, the same figures as ABNT NBR NM 280)
export const RESISTANCE_20 = { 0.5: 36.0, 0.75: 24.5, 1: 18.1, 1.5: 12.1, 2.5: 7.41, 4: 4.61, 6: 3.08, 10: 1.83, 16: 1.15, 25: 0.727, 35: 0.524, 50: 0.387, 70: 0.268, 95: 0.193, 120: 0.153, 150: 0.124,
  185: 0.0991, 240: 0.0754, 300: 0.0601, 400: 0.0470, 500: 0.0366, 630: 0.0283, 800: 0.0221, 1000: 0.0176 };
// the same for flexible conductors (ABNT NBR NM 280 classes 4 and 5): the maximum resistance a maker's table of a 750 V flexible cable gives
export const RESISTANCE_FLEX = { 0.5: 39.0, 0.75: 26.0, 1: 19.5, 1.5: 13.3, 2.5: 7.98, 4: 4.95, 6: 3.30, 10: 1.91, 16: 1.21, 25: 0.780, 35: 0.554, 50: 0.386, 70: 0.272, 95: 0.206, 120: 0.161, 150: 0.129, 185: 0.106, 240: 0.0801 };
export const CONDUCTORS = ['flex', 'rigid'];
export const COPPER_ALPHA = 0.00393;   // per °C
/** Conductor resistance Ω/km at the insulation's highest working temperature (what a cable carries at its rated current): of a
 *  flexible conductor (the default, the larger) or a rigid one; above 240 mm² there is no flexible figure here, so the rigid one. */
export const resistance = (section, insulation, conductor = 'flex') =>
  ((conductor === 'rigid' ? RESISTANCE_20[section] : RESISTANCE_FLEX[section] ?? RESISTANCE_20[section]) * (1 + COPPER_ALPHA * (INSULATIONS[insulation].maxC - 20)));
export const REACTANCE = 0.1;   // Ω/km, conductors in a conduit; with it the voltage drop agrees with the makers' V/A·km tables within about 3 %

/** Circuit breaker ratings (A) the sizing chooses among: the IEC 60898 preferred values, 70 and 90 A (made by some makers only: the
 *  project checks the line it specifies has them), and the usual moulded-case ones above 125 A. */
export const BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 90, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000];
/** The current that makes a breaker act within the conventional time, as a multiple of its rating: 1.45 for the breakers of NBR NM 60898. */
export const TRIP_FACTOR = 1.45;

/** Voltage systems (phase to neutral / phase to phase, V). */
export const SYSTEMS = { '127/220': { fn: 127, ff: 220 }, '220/380': { fn: 220, ff: 380 }, '230/400': { fn: 230, ff: 400 } };
export const DEFAULT_SYSTEM = '127/220';
