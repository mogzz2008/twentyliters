import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { carryModel, formatDuration, splitHours } from '../public/js/core/carry.js';
import { JMP_BASIC_ROUND_TRIP_MINUTES, whoQuantityBand, jmpLackingComponentsMillions, JMP_2024, JMP_GENDER_2022 } from '../public/js/core/who.js';
import { dayFromPreset } from './helpers.mjs';

describe('carry model', () => {
  it('defaults to a 30-minute JMP basic-threshold round trip and one can per trip', () => {
    const model = carryModel(20);
    assert.equal(model.cans, 1);
    assert.equal(model.cansPerTrip, 1);
    assert.equal(model.roundTripMinutes, JMP_BASIC_ROUND_TRIP_MINUTES);
    assert.equal(model.exactTrips, 1);
    assert.equal(model.wholeTrips, 1);
    assert.equal(model.minutes, 30);
    assert.equal(model.hours, 0.5);
    assert.equal(model.totalKg, 20);
    assert.equal(model.kgPerTrip, 20);
  });

  it('splits two cans per trip and never exceeds a 40 kg trip', () => {
    const model = carryModel(100, { cansPerTrip: 2, roundTripMinutes: 30 });
    assert.equal(model.cans, 5);
    assert.equal(model.exactTrips, 2.5);
    assert.equal(model.wholeTrips, 3);
    assert.equal(model.minutes, 75);
    assert.equal(model.kgPerTrip, 40);
  });

  it('treats an empty day as zero trips', () => {
    const model = carryModel(0);
    assert.equal(model.wholeTrips, 0);
    assert.equal(model.hours, 0);
  });

  it('clamps trip settings to the supported range', () => {
    const model = carryModel(40, { cansPerTrip: 9, roundTripMinutes: 3 });
    assert.equal(model.cansPerTrip, 2);
    assert.equal(model.roundTripMinutes, 5);
  });

  it('turns the typical US home into a long carry at the 30-minute threshold', () => {
    const day = dayFromPreset('typical-us');
    const model = carryModel(day.liters, { cansPerTrip: 1, roundTripMinutes: 30 });
    // ~197 gallons ≈ 37+ cans × 30 min ≈ 18+ hours
    assert.ok(model.cans > 37 && model.cans < 38);
    assert.ok(model.hours > 18 && model.hours < 19.5);
  });

  it('formats durations for captions', () => {
    assert.equal(formatDuration(0), '0 min');
    assert.equal(formatDuration(0.5), '30 min');
    assert.equal(formatDuration(1), '1 hour');
    assert.equal(formatDuration(2), '2 hours');
    assert.deepEqual(splitHours(18.65), { hours: 18, minutes: 39, totalMinutes: 1119 });
    assert.equal(formatDuration(18.65), '18 hr 39 min');
  });
});

describe('WHO quantity bands and JMP figures', () => {
  it('classifies 5, 20, 50, and 100+ liter days into the published bands', () => {
    assert.equal(whoQuantityBand(5).id, 'no-access');
    assert.equal(whoQuantityBand(20).id, 'basic');
    assert.equal(whoQuantityBand(50).id, 'intermediate');
    assert.equal(whoQuantityBand(51).id, 'optimal');
    assert.equal(whoQuantityBand(100).id, 'optimal');
    assert.equal(whoQuantityBand(310).id, 'optimal');
    assert.equal(whoQuantityBand(20).ratioToBasic, 1);
    assert.equal(whoQuantityBand(100).ratioToIntermediate, 2);
  });

  it('keeps the 2024 JMP ladder components consistent with the 2.1 billion headline', () => {
    const millions = jmpLackingComponentsMillions();
    assert.equal(millions, 1400 + 287 + 302 + 106);
    assert.equal(millions, 2095);
    assert.equal(JMP_2024.lackingSafelyManagedBillions, 2.1);
    assert.equal(JMP_2024.safelyManaged.percent, 74);
    assert.equal(JMP_2024.safelyManaged.peopleBillions, 6.0);
    assert.equal(JMP_2024.ladder[3].peopleMillions, 106);
  });

  it('records the JMP 2023 gender findings we cite', () => {
    assert.equal(JMP_GENDER_2022.offPremisesPeopleBillions, 1.8);
    assert.equal(JMP_GENDER_2022.womenAndGirlsShare, 0.7);
  });
});
