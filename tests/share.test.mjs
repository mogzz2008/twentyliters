import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeState, decodeState, matchPreset, defaultView } from '../public/js/core/share.js';
import { findPreset, PRESETS, DEFAULT_PRESET_ID } from '../public/js/core/presets.js';
import { householdDay } from '../public/js/core/household.js';

describe('share links and presets', () => {
  it('lists eight one-click presets and defaults to the typical US home', () => {
    assert.equal(PRESETS.length, 8);
    assert.equal(DEFAULT_PRESET_ID, 'typical-us');
    assert.ok(findPreset('who-20'));
    assert.equal(findPreset('missing'), null);
  });

  it('round-trips every preset through the URL hash', () => {
    for (const preset of PRESETS) {
      const view = {
        presetId: preset.id,
        household: { ...preset.state },
        carry: { cansPerTrip: 1, roundTripMinutes: 30 },
        fairLiters: null,
      };
      const hash = encodeState(view);
      const back = decodeState(hash);
      assert.equal(back.presetId, preset.id, preset.id);
      const a = householdDay(preset.state);
      const b = householdDay(back.household);
      assert.ok(Math.abs(a.gallons - b.gallons) < 1e-9, preset.id);
      assert.equal(a.people, b.people);
    }
  });

  it('round-trips a custom fixture day, two-can trips, and a fair-share cap', () => {
    const household = {
      ...findPreset('family-standard').state,
      showerMinutes: 5,
      leakDripsPerSec: 0.5,
    };
    const view = {
      presetId: 'custom',
      household,
      carry: { cansPerTrip: 2, roundTripMinutes: 45 },
      fairLiters: 50,
    };
    const back = decodeState(encodeState(view));
    assert.equal(back.presetId, 'custom');
    assert.equal(back.household.showerMinutes, 5);
    assert.equal(back.household.leakDripsPerSec, 0.5);
    assert.equal(back.carry.cansPerTrip, 2);
    assert.equal(back.carry.roundTripMinutes, 45);
    assert.equal(back.fairLiters, 50);
    assert.equal(matchPreset(household), 'custom');
  });

  it('accepts a short #p= preset link and empty/invalid hashes', () => {
    const dorm = decodeState('#p=dorm');
    assert.equal(dorm.presetId, 'dorm');
    assert.equal(dorm.household.people, 1);
    const fallback = defaultView();
    assert.equal(decodeState('').presetId, fallback.presetId);
    assert.equal(decodeState('#s=%%%').presetId, fallback.presetId);
  });
});
