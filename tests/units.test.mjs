import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LITERS_PER_US_GALLON,
  JERRYCAN_LITERS,
  gallonsToLiters,
  litersToGallons,
  litersToCans,
  cansToLiters,
  litersToKg,
  dripGallonsPerDay,
  clamp,
  roundTo,
  formatNumber,
  formatCompact,
  EPA_DRIP_GALLONS_PER_YEAR,
  DAYS_PER_YEAR,
} from '../public/js/core/units.js';

describe('units', () => {
  it('converts US gallons to liters with the NIST factor', () => {
    assert.equal(gallonsToLiters(1), LITERS_PER_US_GALLON);
    assert.equal(gallonsToLiters(0), 0);
    assert.ok(Math.abs(gallonsToLiters(82) - 310.403766288) < 1e-9);
  });

  it('round-trips gallons and liters', () => {
    assert.ok(Math.abs(litersToGallons(gallonsToLiters(300)) - 300) < 1e-12);
    assert.ok(Math.abs(gallonsToLiters(litersToGallons(20)) - 20) < 1e-12);
  });

  it('counts 20-liter jerrycans', () => {
    assert.equal(JERRYCAN_LITERS, 20);
    assert.equal(litersToCans(20), 1);
    assert.equal(litersToCans(100), 5);
    assert.equal(cansToLiters(2), 40);
    assert.ok(Math.abs(litersToCans(10) - 0.5) < 1e-12);
  });

  it('treats a liter of water as one kilogram', () => {
    assert.equal(litersToKg(20), 20);
    assert.equal(litersToKg(0), 0);
  });

  it('scales the EPA 3,000 gallon/year drip rate linearly', () => {
    assert.equal(dripGallonsPerDay(0), 0);
    assert.equal(dripGallonsPerDay(-1), 0);
    assert.equal(dripGallonsPerDay(1), EPA_DRIP_GALLONS_PER_YEAR / DAYS_PER_YEAR);
    assert.equal(dripGallonsPerDay(2), (2 * EPA_DRIP_GALLONS_PER_YEAR) / DAYS_PER_YEAR);
    assert.ok(dripGallonsPerDay(1) > 8.2 && dripGallonsPerDay(1) < 8.3);
  });

  it('clamps and formats numbers', () => {
    assert.equal(clamp(5, 1, 4), 4);
    assert.equal(clamp(-2, 0, 3), 0);
    assert.equal(clamp(2, 0, 3), 2);
    assert.equal(roundTo(1.26, 1), 1.3);
    assert.equal(formatNumber(15.52, 1), '15.5');
    assert.equal(formatCompact(197.14, 1), '197');
    assert.equal(formatCompact(9.21, 1), '9.2');
    assert.equal(formatNumber(Number.NaN), '—');
  });
});
