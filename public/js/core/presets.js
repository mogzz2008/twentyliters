import {
  REU2016_INDOOR_GALLONS,
  REU2016_INDOOR_TOTAL,
  defaultFixtureState,
  outdoorFromIndoorShare,
} from './household.js';
import { WHO_BASIC_LITERS, WHO_INTERMEDIATE_LITERS } from './who.js';

const FIXTURE_DEFAULTS = defaultFixtureState();

function fixtures(overrides) {
  return { ...FIXTURE_DEFAULTS, mode: 'fixtures', ...overrides };
}

function enduse(people, outdoorShare, extras = {}) {
  const outdoor = outdoorFromIndoorShare(REU2016_INDOOR_TOTAL, outdoorShare);
  return {
    mode: 'enduse',
    people,
    endUses: { ...REU2016_INDOOR_GALLONS, outdoor },
    ...extras,
  };
}

/**
 * One-click sample households. Every volume is either a published end-use
 * total, a clearly labeled fixture assumption, or a WHO quantity band.
 */
export const PRESETS = [
  {
    id: 'typical-us',
    short: 'Typical US home',
    title: 'Typical US single-family home',
    hint: 'WRF 2016 indoor end uses + EPA 30% outdoor share',
    state: enduse(2.5, 0.3),
  },
  {
    id: 'family-standard',
    short: 'Family of four',
    title: 'Family of four, standard fixtures',
    hint: 'Labeled 8-minute showers, 1.6 gpf toilets, 2.5 gpm heads',
    state: fixtures({
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
      outdoorGallonsPerDay: 72,
    }),
  },
  {
    id: 'watersense',
    short: 'WaterSense retrofit',
    title: 'Family of four, WaterSense fixtures',
    hint: 'Same habits, 2.0 gpm showers, 1.28 gpf toilets, 1.5 gpm faucets',
    state: fixtures({
      people: 4,
      showersPerPersonPerDay: 1,
      showerMinutes: 8,
      showerGpm: 2.0,
      flushesPerPersonPerDay: 5,
      toiletGpf: 1.28,
      faucetMinutesPerPerson: 4,
      faucetGpm: 1.5,
      laundryLoadsPerWeek: 5,
      laundryGalPerLoad: 20,
      dishwasherCyclesPerWeek: 4,
      dishwasherGalPerCycle: 4,
      bathsPerWeek: 1,
      bathGallons: 30,
      leakDripsPerSec: 0,
      otherLeakGallonsPerDay: 0,
      outdoorGallonsPerDay: 72,
    }),
  },
  {
    id: 'dorm',
    short: 'Campus dorm',
    title: 'One-person campus dorm day',
    hint: 'One student, no outdoor watering, two laundry loads a week',
    state: fixtures({
      people: 1,
      showersPerPersonPerDay: 1,
      showerMinutes: 8,
      showerGpm: 2.5,
      flushesPerPersonPerDay: 5,
      toiletGpf: 1.6,
      faucetMinutesPerPerson: 5,
      faucetGpm: 2.2,
      laundryLoadsPerWeek: 2,
      laundryGalPerLoad: 20,
      dishwasherCyclesPerWeek: 0,
      dishwasherGalPerCycle: 4,
      bathsPerWeek: 0,
      bathGallons: 30,
      leakDripsPerSec: 0,
      otherLeakGallonsPerDay: 0,
      outdoorGallonsPerDay: 0,
    }),
  },
  {
    id: 'arid-west',
    short: 'Arid-west yard',
    title: 'Typical indoor use, arid-west outdoor share',
    hint: 'REU2016 indoor + EPA “as much as 60%” outdoor in arid regions',
    state: enduse(2.5, 0.6),
  },
  {
    id: 'leaky',
    short: 'Drip + leaks',
    title: 'Family of four plus a one-drip-per-second faucet',
    hint: 'Standard fixtures plus EPA’s 3,000+ gallons/year drip rate',
    state: fixtures({
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
      leakDripsPerSec: 1,
      otherLeakGallonsPerDay: 0,
      outdoorGallonsPerDay: 72,
    }),
  },
  {
    id: 'who-50',
    short: '50-liter day',
    title: 'Four people on a WHO 50 L intermediate-quantity day',
    hint: '50 liters per person — WHO’s typical intermediate-access quantity',
    state: { mode: 'volume', people: 4, litersPerPerson: WHO_INTERMEDIATE_LITERS },
  },
  {
    id: 'who-20',
    short: '20-liter day',
    title: 'Four people on a WHO 20 L basic-access-quantity day',
    hint: '20 liters per person — one jerrycan each, WHO’s typical basic-access quantity',
    state: { mode: 'volume', people: 4, litersPerPerson: WHO_BASIC_LITERS },
  },
];

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}

export const DEFAULT_PRESET_ID = 'typical-us';
