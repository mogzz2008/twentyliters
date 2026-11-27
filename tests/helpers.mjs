import { householdDay } from '../public/js/core/household.js';
import { findPreset } from '../public/js/core/presets.js';

export function dayFromPreset(id) {
  const preset = findPreset(id);
  if (!preset) throw new Error(`missing preset ${id}`);
  return householdDay(preset.state);
}
