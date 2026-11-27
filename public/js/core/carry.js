import { JMP_BASIC_ROUND_TRIP_MINUTES } from './who.js';
import { JERRYCAN_LITERS, KG_PER_LITER, litersToCans, clamp } from './units.js';

export const DEFAULT_CANS_PER_TRIP = 1;
export const MIN_ROUND_TRIP = 5;
export const MAX_ROUND_TRIP = 90;
export const MIN_CANS_PER_TRIP = 1;
export const MAX_CANS_PER_TRIP = 2;

/**
 * Thought experiment: if this volume had to be collected in 20-liter cans,
 * how many trips, minutes, and kilograms would that imply?
 *
 * Default round trip is 30 minutes — the WHO/UNICEF JMP threshold that
 * separates “basic” from “limited” drinking-water service. This is a
 * scenario, not a claim about any one community's actual walk.
 */
export function carryModel(litersPerDay, options = {}) {
  const liters = Math.max(0, Number(litersPerDay) || 0);
  const cansPerTrip = clamp(
    Math.round(Number(options.cansPerTrip) || DEFAULT_CANS_PER_TRIP),
    MIN_CANS_PER_TRIP,
    MAX_CANS_PER_TRIP,
  );
  const roundTripMinutes = clamp(
    Number(options.roundTripMinutes) || JMP_BASIC_ROUND_TRIP_MINUTES,
    MIN_ROUND_TRIP,
    MAX_ROUND_TRIP,
  );

  const cans = litersToCans(liters);
  const exactTrips = cansPerTrip > 0 ? cans / cansPerTrip : 0;
  const wholeTrips = cans === 0 ? 0 : Math.ceil(exactTrips - 1e-12);
  const minutes = exactTrips * roundTripMinutes;
  const hours = minutes / 60;
  const kgPerCan = JERRYCAN_LITERS * KG_PER_LITER;
  const kgPerTrip = cansPerTrip * kgPerCan;
  const totalKg = liters * KG_PER_LITER;

  return {
    liters,
    cans,
    cansPerTrip,
    roundTripMinutes,
    exactTrips,
    wholeTrips,
    minutes,
    hours,
    kgPerCan,
    kgPerTrip,
    totalKg,
  };
}

/** Whole hours + remaining minutes, for captions. */
export function splitHours(hours) {
  const totalMinutes = Math.round((Number(hours) || 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return { hours: h, minutes: m, totalMinutes };
}

export function formatDuration(hours) {
  const { hours: h, minutes: m } = splitHours(hours);
  if (h <= 0 && m <= 0) return '0 min';
  if (h <= 0) return `${m} min`;
  if (m === 0) return h === 1 ? '1 hour' : `${h} hours`;
  return `${h} hr ${m} min`;
}
