import { PRESETS, findPreset, DEFAULT_PRESET_ID } from './presets.js';
import { defaultFixtureState } from './household.js';
import { JMP_BASIC_ROUND_TRIP_MINUTES } from './who.js';
import { clamp } from './units.js';

const FIXTURE_KEYS = [
  'people',
  'showersPerPersonPerDay',
  'showerMinutes',
  'showerGpm',
  'flushesPerPersonPerDay',
  'toiletGpf',
  'faucetMinutesPerPerson',
  'faucetGpm',
  'laundryLoadsPerWeek',
  'laundryGalPerLoad',
  'dishwasherCyclesPerWeek',
  'dishwasherGalPerCycle',
  'bathsPerWeek',
  'bathGallons',
  'leakDripsPerSec',
  'otherLeakGallonsPerDay',
  'otherIndoorGallonsPerDay',
  'outdoorGallonsPerDay',
];

export const END_USE_SHARE_KEYS = [
  'toilet', 'faucet', 'shower', 'laundry', 'leaks', 'baths', 'dishwasher', 'other', 'outdoor',
];

export function defaultView() {
  const preset = findPreset(DEFAULT_PRESET_ID);
  return {
    presetId: DEFAULT_PRESET_ID,
    household: { ...preset.state },
    carry: {
      cansPerTrip: 1,
      roundTripMinutes: JMP_BASIC_ROUND_TRIP_MINUTES,
    },
    fairLiters: null,
  };
}

export function encodeState(view) {
  const payload = {
    v: 1,
    p: view.presetId || null,
    c: view.carry?.cansPerTrip ?? 1,
    t: view.carry?.roundTripMinutes ?? JMP_BASIC_ROUND_TRIP_MINUTES,
  };
  if (view.fairLiters != null && Number.isFinite(Number(view.fairLiters))) {
    payload.f = Number(view.fairLiters);
  }
  const hh = view.household || {};
  if (hh.mode === 'volume') {
    payload.m = 'volume';
    payload.n = hh.people;
    payload.l = hh.litersPerPerson;
  } else if (hh.mode === 'enduse') {
    payload.m = 'enduse';
    payload.n = hh.people;
    payload.e = END_USE_SHARE_KEYS.map((k) => hh.endUses?.[k] ?? 0);
  } else {
    payload.m = 'fixtures';
    payload.x = FIXTURE_KEYS.map((k) => hh[k] ?? 0);
  }
  const json = JSON.stringify(payload);
  const b64 = toBase64Url(json);
  return `#s=${b64}`;
}

export function decodeState(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw) return defaultView();
  const params = new URLSearchParams(raw.includes('=') ? raw : `s=${raw}`);
  const presetOnly = params.get('p');
  if (presetOnly && !params.get('s') && findPreset(presetOnly)) {
    return {
      ...defaultView(),
      presetId: presetOnly,
      household: { ...findPreset(presetOnly).state },
    };
  }
  const packed = params.get('s');
  if (!packed) return defaultView();
  let payload;
  try {
    payload = JSON.parse(fromBase64Url(packed));
  } catch {
    return defaultView();
  }
  return viewFromPayload(payload);
}

function viewFromPayload(payload) {
  const view = defaultView();
  if (!payload || payload.v !== 1) return view;
  view.carry = {
    cansPerTrip: clamp(Math.round(Number(payload.c) || 1), 1, 2),
    roundTripMinutes: clamp(Number(payload.t) || JMP_BASIC_ROUND_TRIP_MINUTES, 5, 90),
  };
  if (payload.f != null && Number.isFinite(Number(payload.f))) {
    view.fairLiters = clamp(Number(payload.f), 5, 200);
  }
  const mode = payload.m;
  if (mode === 'volume') {
    view.presetId = matchPreset({ mode: 'volume', people: payload.n, litersPerPerson: payload.l });
    view.household = {
      mode: 'volume',
      people: Number(payload.n) || 1,
      litersPerPerson: Number(payload.l) || 20,
    };
    return view;
  }
  if (mode === 'enduse' && Array.isArray(payload.e)) {
    const endUses = Object.fromEntries(END_USE_SHARE_KEYS.map((k, i) => [k, Number(payload.e[i]) || 0]));
    const household = { mode: 'enduse', people: Number(payload.n) || 2.5, endUses };
    view.household = household;
    view.presetId = matchPreset(household);
    return view;
  }
  if (mode === 'fixtures' && Array.isArray(payload.x)) {
    const household = { ...defaultFixtureState() };
    FIXTURE_KEYS.forEach((k, i) => {
      household[k] = Number(payload.x[i]);
    });
    view.household = household;
    view.presetId = matchPreset(household);
    return view;
  }
  if (payload.p && findPreset(payload.p)) {
    view.presetId = payload.p;
    view.household = { ...findPreset(payload.p).state };
  }
  return view;
}

function almostEqual(a, b, tol = 1e-6) {
  return Math.abs(Number(a) - Number(b)) <= tol;
}

function statesEqual(a, b) {
  if (!a || !b || a.mode !== b.mode) return false;
  if (!almostEqual(a.people, b.people)) return false;
  if (a.mode === 'volume') return almostEqual(a.litersPerPerson, b.litersPerPerson);
  if (a.mode === 'enduse') {
    return END_USE_SHARE_KEYS.every((k) => almostEqual(a.endUses?.[k], b.endUses?.[k]));
  }
  return FIXTURE_KEYS.every((k) => almostEqual(a[k], b[k]));
}

export function matchPreset(household) {
  const found = PRESETS.find((p) => statesEqual(p.state, household));
  return found ? found.id : 'custom';
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  const b64 = typeof btoa === 'function'
    ? btoa(bin)
    : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(text) {
  const pad = text.length % 4 === 0 ? '' : '='.repeat(4 - (text.length % 4));
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + pad;
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}
