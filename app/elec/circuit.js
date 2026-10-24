/* SPDX-License-Identifier: Apache-2.0 */
/**
 * circuit.js — one circuit sized as NBR 5410:2004 asks: the design current, the smallest conductor section that carries it with the
 * temperature and grouping corrections and drops no more than the limit, the circuit breaker, the neutral and the protective
 * conductor. DOM-free, no IFC; tables in nbr5410.js.
 *
 *   circuit = { watts, apparent (the load is VA, not W: the power factor is not divided by), demand (default 1), pf (default 1), phases, system, use ('lighting' | 'power'), length (m; 0 = not known),
 *     method (a key of METHODS), insulation ('pvc' | 'epr'), ambient (°C; air, or soil for method D), grouped (circuits in the
 *     same conduit or bundle, this one included), arrangement ('' | 'bundle'), spacing (m between buried conduits),
 *     soil (K·m/W, method D), section (mm², chosen; 0 = none yet), breaker (A, chosen; 0 = none yet), dropLimit (% of the
 *     voltage; default 4, the limit for terminal circuits), reducedNeutral }
 *   phases: 'FN' one phase and neutral · 'FF' two phases · '3F' three phases, no neutral · '3FN' three phases and neutral (balanced)
 *   voltsOf(system, phases) → V the circuit is at (phase to neutral for FN, phase to phase for the others)
 *   loadedOf(phases) → loaded conductors, 2 or 3 (the neutral of a balanced three-phase circuit does not count, 6.2.5.6)
 *   designCurrent(circuit) → I_B (A): S · demand / V, with S = P / pf for a load in W (S = the load for one in VA); for three phases
 *     S · demand / (√3 · V)
 *   dropOf(circuit, section) → { volts, percent } | null when the length is not known: ΔV = b · I_B · L · (R cosφ + X sinφ), b = 2
 *     for FN and FF, √3 for three phases; R at the insulation's highest working temperature (so on the safe side), X = 0.1 Ω/km
 *   evaluate(circuit, section, breaker) → what that section and breaker give: I_Z (A), checks
 *   designCircuit(circuit) → { ib, volts, loaded, minSection, kTemp, kGroup, kSoil, now (the chosen section and breaker evaluated, or
 *     null), need: { section, breaker, iz, drop } | null, grow, error } — `need` is the smallest section from the chosen one up, with
 *     the smallest breaker from the chosen one up, such that I_B ≤ I_n ≤ I_Z and the drop is within the limit
 *   error: 'temp' | 'group' | 'soil' | 'method' | 'phases' | 'load' (what cannot be looked up) | 'toobig' (no section is enough)
 */
import { SECTIONS, METHODS, ampacity, tempFactor, soilFactor, groupFactor, minSection, neutralSection, protectiveSection, resistance, REACTANCE, BREAKERS, TRIP_FACTOR, SYSTEMS, DEFAULT_SYSTEM } from './nbr5410.js';

export const PHASES = ['FN', 'FF', '3F', '3FN'];
export const voltsOf = (system, phases) => { const s = SYSTEMS[system] || SYSTEMS[DEFAULT_SYSTEM]; return phases === 'FN' ? s.fn : s.ff; };
export const loadedOf = (phases) => (phases === 'FN' || phases === 'FF' ? 2 : 3);
const three = (phases) => phases === '3F' || phases === '3FN';

export function designCurrent(c) {
  const v = voltsOf(c.system, c.phases), pf = c.pf > 0 ? c.pf : 1;
  const s = ((c.watts || 0) * (c.demand > 0 ? c.demand : 1)) / (c.apparent ? 1 : pf);   // volt-amperes
  return s / ((three(c.phases) ? Math.sqrt(3) : 1) * v);
}

export function dropOf(c, section) {
  if (!(c.length > 0)) return null;
  const ib = designCurrent(c), pf = c.pf > 0 && c.pf <= 1 ? c.pf : 1, sin = Math.sqrt(Math.max(0, 1 - pf * pf));
  const b = three(c.phases) ? Math.sqrt(3) : 2;
  const volts = b * ib * (c.length / 1000) * (resistance(section, c.insulation || 'pvc') * pf + REACTANCE * sin);
  return { volts, percent: (volts / voltsOf(c.system, c.phases)) * 100 };
}

/** What a section and a breaker give for this circuit: I_Z and the checks (only a check that can be made is in the result). */
export function evaluate(c, section, breaker) {
  const ins = c.insulation || 'pvc', method = c.method || '7', sys = METHODS[method];
  const soil = sys?.ref === 'D';
  const kTemp = tempFactor(ins, c.ambient ?? (soil ? 20 : 30), soil), kGroup = groupFactor(method, c.arrangement, c.grouped || 1, c.spacing || 0), kSoil = soil ? soilFactor(c.soil ?? 2.5) : 1;
  const base = ampacity(ins, section, method, loadedOf(c.phases));
  const iz = base != null && kTemp != null && kGroup != null && kSoil != null ? base * kTemp * kGroup * kSoil : null;
  const ib = designCurrent(c), drop = dropOf(c, section), limit = c.dropLimit > 0 ? c.dropLimit : 4;
  return {
    section, breaker, iz, base, ib,
    ampacityOk: iz != null && ib <= iz + 1e-9,
    // I_B <= I_n <= I_Z, and the current that makes the breaker act (1.45 I_n) at or under 1.45 I_Z
    breakerOk: iz != null && breaker > 0 ? ib <= breaker + 1e-9 && breaker <= iz + 1e-9 && TRIP_FACTOR * breaker <= TRIP_FACTOR * iz + 1e-9 : null,
    drop, dropOk: drop ? drop.percent <= limit + 1e-9 : null,
    minOk: section + 1e-9 >= minSection(c.use),
  };
}

export function designCircuit(c) {
  const out = { ib: designCurrent(c), volts: voltsOf(c.system, c.phases), loaded: loadedOf(c.phases), minSection: minSection(c.use), kTemp: null, kGroup: null, kSoil: 1, now: null, need: null, grow: false, error: null };
  const ins = c.insulation || 'pvc', method = c.method || '7';
  if (!PHASES.includes(c.phases)) { out.error = 'phases'; return out; }
  if (!METHODS[method]) { out.error = 'method'; return out; }
  if (!(c.watts > 0)) { out.error = 'load'; return out; }
  const soil = METHODS[method].ref === 'D';
  out.kTemp = tempFactor(ins, c.ambient ?? (soil ? 20 : 30), soil);
  out.kGroup = groupFactor(method, c.arrangement, c.grouped || 1, c.spacing || 0);
  if (soil) out.kSoil = soilFactor(c.soil ?? 2.5);
  if (out.kTemp == null) { out.error = 'temp'; return out; }
  if (out.kGroup == null) { out.error = 'group'; return out; }
  if (out.kSoil == null) { out.error = 'soil'; return out; }
  if (c.section > 0 || c.breaker > 0) out.now = evaluate(c, c.section > 0 ? c.section : 0, c.breaker > 0 ? c.breaker : 0);
  // from the chosen section up (never smaller than drawn), with the smallest breaker from the chosen one up
  const need = Math.max(out.ib, c.breaker || 0);
  const breaker = BREAKERS.find((b) => b + 1e-9 >= need);
  if (breaker !== undefined) {
    for (const s of SECTIONS) {
      if (s + 1e-9 < Math.max(out.minSection, c.section || 0)) continue;
      const e = evaluate(c, s, breaker);
      if (e.iz != null && breaker <= e.iz + 1e-9 && e.dropOk !== false) { out.need = { section: s, breaker, iz: e.iz, drop: e.drop }; break; }
    }
  }
  if (!out.need) { out.error = 'toobig'; return out; }
  out.grow = !(c.section > 0) || !(c.breaker > 0) || out.need.section > c.section + 1e-9 || out.need.breaker > c.breaker + 1e-9;
  return out;
}

/** The conductors of a circuit as the schedule writes them: "1 × 2.5 + N 2.5 + PE 2.5 mm²" (phases and their section, the neutral
 *  when the circuit has one, the protective conductor). */
export function cableText(c, section, { reducedNeutral = false } = {}) {
  const phases = { FN: 1, FF: 2, '3F': 3, '3FN': 3 }[c.phases] || 1;
  const neutral = c.phases === 'FN' ? section : c.phases === '3FN' ? neutralSection(section, reducedNeutral) : null;
  return phases + ' × ' + section + (neutral != null ? ' + N ' + neutral : '') + ' + PE ' + protectiveSection(section) + ' mm²';   // i18n-ignore: a cable mark
}
