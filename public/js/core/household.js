import { dripGallonsPerDay, gallonsToLiters, litersToGallons, litersToCans, litersToKg } from './units.js';

export const END_USE_KEYS = [
  'toilet',
  'faucet',
  'shower',
  'laundry',
  'leaks',
  'baths',
  'dishwasher',
  'other',
  'outdoor',
];

export const END_USE_LABELS = {
  toilet: 'Toilets',
  faucet: 'Faucets',
  shower: 'Showers',
  laundry: 'Clothes washer',
  leaks: 'Leaks',
  baths: 'Baths',
  dishwasher: 'Dishwasher',
  other: 'Other indoor',
  outdoor: 'Outdoor',
};

/** REU2016 indoor end uses, gallons per household per day (executive report). */
export const REU2016_INDOOR_GALLONS = {
  toilet: 33.1,
  faucet: 28.1,
  shower: 26.3,
  laundry: 22.7,
  leaks: 17.0,
  other: 5.3,
  baths: 3.6,
  dishwasher: 1.6,
};

export const REU2016_INDOOR_TOTAL = 138;

export function reu2016IndoorSum() {
  return Object.values(REU2016_INDOOR_GALLONS).reduce((s, n) => s + n, 0);
}

/**
 * Outdoor gallons so that outdoor is `share` of household total,
 * given a known indoor volume.
 */
export function outdoorFromIndoorShare(indoorVolume, outdoorShare = 0.3) {
  const indoor = Number(indoorVolume);
  const share = Number(outdoorShare);
  if (!Number.isFinite(indoor) || indoor < 0) return 0;
  if (!Number.isFinite(share) || share <= 0) return 0;
  if (share >= 1) throw new RangeError('outdoor share must be < 1');
  return indoor * (share / (1 - share));
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function fixtureEndUses(input = {}) {
  const people = Math.max(0, num(input.people));
  const shower = people * num(input.showersPerPersonPerDay) * num(input.showerMinutes) * num(input.showerGpm);
  const toilet = people * num(input.flushesPerPersonPerDay) * num(input.toiletGpf);
  const faucet = people * num(input.faucetMinutesPerPerson) * num(input.faucetGpm);
  const laundry = (num(input.laundryLoadsPerWeek) * num(input.laundryGalPerLoad)) / 7;
  const dishwasher = (num(input.dishwasherCyclesPerWeek) * num(input.dishwasherGalPerCycle)) / 7;
  const baths = (num(input.bathsPerWeek) * num(input.bathGallons)) / 7;
  const leaks = dripGallonsPerDay(input.leakDripsPerSec) + Math.max(0, num(input.otherLeakGallonsPerDay));
  const other = Math.max(0, num(input.otherIndoorGallonsPerDay));
  const outdoor = Math.max(0, num(input.outdoorGallonsPerDay));
  return { toilet, faucet, shower, laundry, leaks, baths, dishwasher, other, outdoor };
}

export function sumEndUses(uses) {
  return END_USE_KEYS.reduce((s, k) => s + num(uses[k]), 0);
}

export function indoorGallons(uses) {
  return END_USE_KEYS.filter((k) => k !== 'outdoor').reduce((s, k) => s + num(uses[k]), 0);
}

/**
 * Build a household-day summary from either published end-use gallons
 * or a fixture lab. `mode` is 'enduse' | 'fixtures' | 'volume'.
 *
 * Volume mode sets a flat per-person liter budget (WHO-style day).
 */
export function householdDay(state) {
  const people = Math.max(0.1, num(state.people, 1));
  let uses;
  let mode = state.mode || 'fixtures';

  if (mode === 'volume') {
    const litersEach = Math.max(0, num(state.litersPerPerson));
    const liters = litersEach * people;
    const gallons = litersToGallons(liters);
    uses = {
      toilet: 0, faucet: 0, shower: 0, laundry: 0, leaks: 0,
      baths: 0, dishwasher: 0, other: gallons, outdoor: 0,
    };
    return finalize(uses, people, mode, { volumeLitersPerPerson: litersEach });
  }

  if (mode === 'enduse') {
    uses = Object.fromEntries(END_USE_KEYS.map((k) => [k, Math.max(0, num(state.endUses?.[k]))]));
  } else {
    uses = fixtureEndUses(state);
    mode = 'fixtures';
  }

  return finalize(uses, people, mode, {});
}

function finalize(uses, people, mode, extra) {
  const gallons = sumEndUses(uses);
  const indoor = indoorGallons(uses);
  const liters = gallonsToLiters(gallons);
  const cans = litersToCans(liters);
  const kg = litersToKg(liters);
  const perPersonGallons = gallons / people;
  const perPersonLiters = liters / people;
  const breakdown = END_USE_KEYS
    .map((key) => ({
      key,
      label: END_USE_LABELS[key],
      gallons: uses[key],
      liters: gallonsToLiters(uses[key]),
      cans: litersToCans(gallonsToLiters(uses[key])),
      share: gallons > 0 ? uses[key] / gallons : 0,
    }))
    .filter((row) => row.gallons > 0.0001 || row.key === 'outdoor');

  return {
    mode,
    people,
    uses,
    gallons,
    indoor,
    outdoor: uses.outdoor,
    liters,
    cans,
    kg,
    perPersonGallons,
    perPersonLiters,
    breakdown,
    ...extra,
  };
}

export function defaultFixtureState() {
  return {
    mode: 'fixtures',
    people: 4,
    showersPerPersonPerDay: 1,
    showerMinutes: 8,
    showerGpm: 2.5,
    flushesPerPersonPerDay: 5,
    toiletGpf: 1.6,
    faucetMinutesPerPerson: 4,
    faucetGpm: 2.2,
    laundryLoadsPerWeek: 5,
    laundryGalPerLoad: 20,
    dishwasherCyclesPerWeek: 4,
    dishwasherGalPerCycle: 4,
    bathsPerWeek: 1,
    bathGallons: 30,
    leakDripsPerSec: 0,
    otherLeakGallonsPerDay: 0,
    otherIndoorGallonsPerDay: 0,
    outdoorGallonsPerDay: 0,
  };
}
