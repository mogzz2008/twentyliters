import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  REU2016_INDOOR_GALLONS,
  REU2016_INDOOR_TOTAL,
  reu2016IndoorSum,
  outdoorFromIndoorShare,
  fixtureEndUses,
  householdDay,
  defaultFixtureState,
} from '../public/js/core/household.js';
import { gallonsToLiters, litersToCans, dripGallonsPerDay } from '../public/js/core/units.js';
import { dayFromPreset } from './helpers.mjs';

describe('household day', () => {
  it('sums REU2016 indoor components to 137.7 gallons, near the published 138', () => {
    const sum = reu2016IndoorSum();
    assert.ok(Math.abs(sum - 137.7) < 1e-9);
    assert.equal(REU2016_INDOOR_TOTAL, 138);
    assert.ok(Math.abs(sum - REU2016_INDOOR_TOTAL) < 0.31);
    assert.equal(REU2016_INDOOR_GALLONS.toilet, 33.1);
    assert.equal(REU2016_INDOOR_GALLONS.leaks, 17.0);
  });

  it('derives outdoor volume from an indoor total and a share of household use', () => {
    const outdoor = outdoorFromIndoorShare(138, 0.3);
    assert.ok(Math.abs(outdoor - (138 * 0.3) / 0.7) < 1e-12);
    const arid = outdoorFromIndoorShare(138, 0.6);
    assert.ok(Math.abs(arid - (138 * 0.6) / 0.4) < 1e-12);
    assert.equal(outdoorFromIndoorShare(100, 0), 0);
    assert.throws(() => outdoorFromIndoorShare(100, 1), /outdoor share/);
  });

  it('builds fixture end uses from labeled rates and frequencies', () => {
    const uses = fixtureEndUses({
      people: 4,
      showersPerPersonPerDay: 1,
      showerMinutes: 8,
      showerGpm: 2.5,
      flushesPerPersonPerDay: 5,
      toiletGpf: 1.6,
      faucetMinutesPerPerson: 4,
      faucetGpm: 2.2,
      laundryLoadsPerWeek: 7,
      laundryGalPerLoad: 20,
      dishwasherCyclesPerWeek: 0,
      dishwasherGalPerCycle: 4,
      bathsPerWeek: 0,
      bathGallons: 30,
      leakDripsPerSec: 0,
      otherLeakGallonsPerDay: 0,
      outdoorGallonsPerDay: 10,
    });
    assert.equal(uses.shower, 80);
    assert.equal(uses.toilet, 32);
    assert.equal(uses.faucet, 35.2);
    assert.equal(uses.laundry, 20);
    assert.equal(uses.outdoor, 10);
    assert.equal(uses.dishwasher, 0);
  });

  it('adds EPA drip waste on top of other leak gallons', () => {
    const uses = fixtureEndUses({
      ...defaultFixtureState(),
      leakDripsPerSec: 1,
      otherLeakGallonsPerDay: 5,
    });
    assert.ok(Math.abs(uses.leaks - (dripGallonsPerDay(1) + 5)) < 1e-12);
  });

  it('computes the typical US home from published indoor use plus a 30% outdoor share', () => {
    const day = dayFromPreset('typical-us');
    assert.equal(day.mode, 'enduse');
    assert.equal(day.people, 2.5);
    assert.ok(Math.abs(day.indoor - 137.7) < 1e-9);
    const expectedOutdoor = outdoorFromIndoorShare(138, 0.3);
    assert.ok(Math.abs(day.outdoor - expectedOutdoor) < 1e-12);
    assert.ok(Math.abs(day.gallons - (137.7 + expectedOutdoor)) < 1e-12);
    assert.ok(day.gallons > 196 && day.gallons < 198);
    assert.ok(Math.abs(day.liters - gallonsToLiters(day.gallons)) < 1e-12);
    assert.ok(day.cans > 37 && day.cans < 38);
    // Per person should sit near the USGS 82 gpcd domestic figure, not match it exactly.
    assert.ok(day.perPersonGallons > 75 && day.perPersonGallons < 85);
  });

  it('keeps a family-of-four standard day at 30% outdoor and a known indoor total', () => {
    const day = dayFromPreset('family-standard');
    assert.equal(day.mode, 'fixtures');
    assert.equal(day.people, 4);
    assert.ok(Math.abs(day.uses.shower - 80) < 1e-9);
    assert.ok(Math.abs(day.uses.toilet - 32) < 1e-9);
    assert.equal(day.outdoor, 72);
    const share = day.outdoor / day.gallons;
    assert.ok(Math.abs(share - 0.3) < 0.002);
    assert.ok(day.gallons > 230 && day.gallons < 250);
  });

  it('saves water when the same family switches to WaterSense fixtures', () => {
    const standard = dayFromPreset('family-standard');
    const efficient = dayFromPreset('watersense');
    assert.ok(efficient.gallons < standard.gallons);
    const saved = standard.gallons - efficient.gallons;
    // Shower 0.5 gpm * 32 min = 16; toilet 0.32 * 20 flushes = 6.4; faucet 0.7 * 16 min = 11.2 → 33.6
    assert.ok(Math.abs(saved - 33.6) < 0.05);
    assert.equal(efficient.uses.shower, 64);
    assert.ok(Math.abs(efficient.uses.toilet - 25.6) < 1e-9);
    assert.equal(efficient.uses.faucet, 24);
  });

  it('models a one-person dorm with no outdoor use', () => {
    const day = dayFromPreset('dorm');
    assert.equal(day.people, 1);
    assert.equal(day.outdoor, 0);
    assert.equal(day.uses.shower, 20);
    assert.equal(day.uses.toilet, 8);
    assert.ok(day.gallons > 40 && day.gallons < 55);
    assert.ok(day.cans > 8 && day.cans < 11);
  });

  it('raises outdoor use to 60% of the total in the arid-west preset', () => {
    const day = dayFromPreset('arid-west');
    const share = day.outdoor / day.gallons;
    assert.ok(Math.abs(share - 0.6) < 0.002);
    assert.ok(day.gallons > 340 && day.gallons < 350);
  });

  it('adds more than 8 gallons a day when a faucet drips once per second', () => {
    const base = dayFromPreset('family-standard');
    const leaky = dayFromPreset('leaky');
    const delta = leaky.gallons - base.gallons;
    assert.ok(Math.abs(delta - dripGallonsPerDay(1)) < 1e-9);
    assert.ok(delta > 8.2 && delta < 8.3);
  });

  it('builds WHO quantity days from a per-person liter budget', () => {
    const fifty = dayFromPreset('who-50');
    const twenty = dayFromPreset('who-20');
    assert.equal(fifty.mode, 'volume');
    assert.equal(fifty.people, 4);
    assert.equal(fifty.liters, 200);
    assert.equal(fifty.cans, 10);
    assert.equal(fifty.kg, 200);
    assert.equal(twenty.liters, 80);
    assert.equal(twenty.cans, 4);
    assert.equal(twenty.perPersonLiters, 20);
  });

  it('is zero-safe when people or uses are empty', () => {
    const empty = householdDay({
      mode: 'fixtures',
      people: 1,
      showersPerPersonPerDay: 0,
      showerMinutes: 0,
      showerGpm: 0,
      flushesPerPersonPerDay: 0,
      toiletGpf: 0,
      faucetMinutesPerPerson: 0,
      faucetGpm: 0,
      laundryLoadsPerWeek: 0,
      laundryGalPerLoad: 0,
      dishwasherCyclesPerWeek: 0,
      dishwasherGalPerCycle: 0,
      bathsPerWeek: 0,
      bathGallons: 0,
      leakDripsPerSec: 0,
      outdoorGallonsPerDay: 0,
    });
    assert.equal(empty.gallons, 0);
    assert.equal(empty.cans, 0);
    assert.equal(litersToCans(empty.liters), 0);
  });
});
