/* SPDX-License-Identifier: Apache-2.0 */
/**
 * conduits.js — conduits and cables as makers print them, and the fill of a conduit as NBR 5410 asks. DOM-free, no IFC.
 *
 * Physical data comes from makers' catalogues (SOURCES says which, in which document and on which page) and is kept apart from
 * the criterion, which is the standard's: the sum of the cross-sections of the cables (by their outside diameter, insulation
 * included) at most 53 % of the conduit's inside cross-section for one cable, 31 % for two and 40 % for three or more.
 *   - A conduit's inside diameter is the maker's own when it prints one; else it is DERIVED (`derived: true`) as the outside
 *     diameter less twice the wall (the smaller outside diameter where the maker gives a range), and the help says so.
 *   - Nothing is invented: a cable or a conduit the catalogue does not give has no fill (the result says "pending").
 *
 *   SOURCES[key] → { maker, line, document, page, url, note }
 *   CONDUITS[family] → { label, material: 'pvc' | 'steel', source, sizes: [{ key, dn, od, wall, id, derived }] } (smallest first)
 *   CABLE_OD[section] → mm: the nominal outside diameter of a PVC-insulated flexible 750 V cable (CABLE_SOURCE)
 *   FILL_LIMIT(n) → the largest fill (0..1) for n cables in the conduit
 *   conductorsOf(phases, section, reducedNeutral) → [section of each conductor]: the phases, the neutral and the protective conductor
 *   fillOf(conduit size, sections) → { conductors, area (mm²), inside (mm²), ratio, limit, ok } | { pending: 'cable' }
 *   smallestConduit(family, sections) → the first size of the family whose fill is within the limit, or null
 */
import { neutralSection, protectiveSection } from './nbr5410.js';

export const SOURCES = {
  wavinThread: { maker: 'Amanco Wavin', line: 'Eletroduto rígido roscável', document: 'Ficha técnica "Eletroduto Rígido Soldável e Roscável"', page: '8 and 9 (outside diameter B (dem) and wall C)', url: 'https://mediahub.wavin.com/m/2159cf9811cfe732/original/-FT-Eletroduto-Soldavel-e-Roscavel.pdf', note: 'measures are approximate, as the catalogue says; the inside diameter is derived' },
  wavinSolder: { maker: 'Amanco Wavin', line: 'Eletroduto rígido soldável', document: 'Ficha técnica "Eletroduto Rígido Soldável e Roscável"', page: '6 (diameter B and wall C)', url: 'https://mediahub.wavin.com/m/2159cf9811cfe732/original/-FT-Eletroduto-Soldavel-e-Roscavel.pdf', note: 'measures are approximate, as the catalogue says; the inside diameter is derived' },
  eleconHeavy: { maker: 'Elecon', line: 'Eletroduto eletrolítico pesado, NBR 13057', document: 'Catálogo Elecon (Eletrodutos)', page: '5 (wall and outside diameter, minimum and maximum)', url: 'https://elecon.com.br/wp-content/uploads/2017/10/catalogo.pdf', note: 'the inside diameter is derived from the smaller outside diameter' },
  eleconRir: { maker: 'Elecon', line: 'Eletroduto RIR galvanizado a fogo, NBR 5597 (rosca NPT)', document: 'Catálogo Elecon (Eletrodutos)', page: '7 (outside diameter and wall)', url: 'https://elecon.com.br/wp-content/uploads/2017/10/catalogo.pdf', note: 'the inside diameter is derived' },
};
export const CABLE_SOURCE = { maker: 'Corfio', line: 'Cabo flexível BWF 750 V', document: 'Catálogo de Produtos Corfio', page: '5 (Dados construtivos: diâmetro externo nominal)', url: 'https://www.corfio.com.br/documentos/Catalogo_de_Produtos-Corfio.pdf', note: 'PVC-insulated, 450/750 V, classes 4 and 5 (ABNT NBR NM 247-3); another maker\'s cable differs by a few per cent' };

// [key, dn (mm), outside diameter (mm), wall (mm)] → the inside diameter derived as the outside less twice the wall
const make = (list) => list.map(([key, dn, od, wall]) => ({ key, dn, od, wall, id: Math.round((od - 2 * wall) * 100) / 100, derived: true }));
export const CONDUITS = {
  'pvc-thread': { label: 'PVC, threaded (Wavin)', material: 'pvc', source: 'wavinThread', sizes: make([['1/2"', 20, 20.8, 2.2], ['3/4"', 25, 26.2, 2.3], ['1"', 32, 32.9, 2.7], ['1.1/4"', 40, 41.9, 3.0], ['1.1/2"', 50, 47.4, 3.0], ['2"', 60, 59.1, 3.2],
    ['2.1/2"', 75, 74.9, 3.8], ['3"', 85, 87.6, 4.0], ['4"', 110, 112.7, 4.4]]) },
  'pvc-solder': { label: 'PVC, solvent-weld (Wavin)', material: 'pvc', source: 'wavinSolder', sizes: make([['DN20', 20, 20, 1.6], ['DN25', 25, 25, 1.8], ['DN32', 32, 32, 2.1]]) },
  'steel-heavy': { label: 'Steel, electrolytic heavy, NBR 13057 (Elecon)', material: 'steel', source: 'eleconHeavy', sizes: make([['1/2"', 15, 20.00, 1.50], ['3/4"', 20, 25.20, 1.50], ['1"', 25, 31.50, 1.50], ['1.1/4"', 32, 40.50, 2.00], ['1.1/2"', 40, 46.60, 2.25],
    ['2"', 50, 58.40, 2.25], ['2.1/2"', 65, 74.10, 2.65], ['3"', 80, 86.80, 2.65], ['4"', 100, 111.60, 2.65]]) },
  'steel-rir': { label: 'Steel, hot-dip galvanised RIR, NBR 5597 (Elecon)', material: 'steel', source: 'eleconRir', sizes: make([['1/2"', 15, 21.3, 2.25], ['3/4"', 20, 26.9, 2.25], ['1"', 25, 33.7, 2.65], ['1.1/4"', 32, 42.4, 3.00], ['1.1/2"', 40, 48.3, 3.00],
    ['2"', 50, 60.3, 3.35], ['2.1/2"', 65, 73.0, 3.75], ['3"', 80, 88.9, 3.75], ['4"', 100, 114.3, 4.25], ['5"', 125, 141.3, 5.00], ['6"', 150, 168.3, 5.30]]) },
};
export const CONDUIT_FAMILIES = Object.keys(CONDUITS);

// nominal outside diameter (mm) of a flexible 750 V PVC cable by section (Corfio, BWF 750 V; the 2 mm² row is not a section here)
export const CABLE_OD = { 0.5: 2.15, 0.75: 2.35, 1: 2.50, 1.5: 2.95, 2.5: 3.55, 4: 4.05, 6: 4.65, 10: 6.00, 16: 7.00, 25: 8.60, 35: 10.15, 50: 11.80, 70: 13.50, 95: 15.70, 120: 17.20, 150: 19.10, 185: 21.40, 240: 24.20 };

/** NBR 5410: 53 % for one cable in the conduit, 31 % for two, 40 % for three or more. */
export const FILL_LIMIT = (n) => (n <= 1 ? 0.53 : n === 2 ? 0.31 : 0.40);

/** The conductors a circuit puts in its conduit: phases, neutral (one phase and neutral; three phases and neutral) and protective. */
export function conductorsOf(phases, section, reducedNeutral = false) {
  const n = { FN: 1, FF: 2, '3F': 3, '3FN': 3 }[phases] || 1;
  const out = Array(n).fill(section);
  if (phases === 'FN') out.push(section);
  else if (phases === '3FN') out.push(neutralSection(section, reducedNeutral));
  out.push(protectiveSection(section));
  return out;
}

/** The fill of a conduit size by conductors (a section each): { conductors, area, inside, ratio, limit, ok }, or { pending: 'cable' } when a cable's
 *  diameter is not in CABLE_OD. */
export function fillOf(size, sections) {
  if (sections.some((s) => !(CABLE_OD[s] > 0))) return { pending: 'cable' };
  const area = sections.reduce((a, s) => a + Math.PI * CABLE_OD[s] ** 2 / 4, 0), inside = Math.PI * size.id ** 2 / 4;
  const limit = FILL_LIMIT(sections.length), ratio = area / inside;
  return { conductors: sections.length, area, inside, ratio, limit, ok: ratio <= limit + 1e-9 };
}
export function smallestConduit(family, sections) {
  const c = CONDUITS[family];
  if (!c) return null;
  for (const s of c.sizes) { const f = fillOf(s, sections); if (f.pending) return null; if (f.ok) return s; }
  return null;
}
