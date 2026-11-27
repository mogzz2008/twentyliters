/** US liquid gallon, NIST. */
export const LITERS_PER_US_GALLON = 3.785411784;

/** Standard aid / household jerrycan volume, in liters. */
export const JERRYCAN_LITERS = 20;

/**
 * Mass of 1 liter of water, in kilograms.
 * Fresh water is ~0.998 kg/L at 20°C; the 1 kg/L convention is used throughout.
 */
export const KG_PER_LITER = 1;

/**
 * EPA WaterSense: a faucet dripping at one drip per second can waste
 * more than 3,000 gallons per year (Fix a Leak Week).
 * We scale that published yearly figure linearly with drip rate.
 */
export const EPA_DRIP_GALLONS_PER_YEAR = 3000;
export const DAYS_PER_YEAR = 365;

export function gallonsToLiters(gallons) {
  return Number(gallons) * LITERS_PER_US_GALLON;
}

export function litersToGallons(liters) {
  return Number(liters) / LITERS_PER_US_GALLON;
}

export function litersToCans(liters) {
  return Number(liters) / JERRYCAN_LITERS;
}

export function cansToLiters(cans) {
  return Number(cans) * JERRYCAN_LITERS;
}

export function litersToKg(liters) {
  return Number(liters) * KG_PER_LITER;
}

/** Gallons wasted per day at a given faucet drip rate (drips per second). */
export function dripGallonsPerDay(dripsPerSecond) {
  const rate = Number(dripsPerSecond);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return (EPA_DRIP_GALLONS_PER_YEAR / DAYS_PER_YEAR) * rate;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value, digits = 1) {
  const f = 10 ** digits;
  return Math.round(Number(value) * f) / f;
}

export function formatNumber(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCompact(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 100) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (abs >= 10) return n.toLocaleString('en-US', { minimumFractionDigits: Math.min(digits, 1), maximumFractionDigits: Math.min(digits, 1) });
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
