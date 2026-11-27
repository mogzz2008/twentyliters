import { householdDay, END_USE_KEYS, END_USE_LABELS } from './core/household.js';
import { PRESETS, findPreset } from './core/presets.js';
import { carryModel, formatDuration } from './core/carry.js';
import { decodeState, encodeState, matchPreset } from './core/share.js';
import { whoQuantityBand, JMP_2024, JMP_GENDER_2022, WHO_INTERMEDIATE_LITERS } from './core/who.js';
import { formatCompact, formatNumber, clamp } from './core/units.js';
import { isMuted, setMuted, playTick, playCan, playWhoosh, playSuccess, playDrip } from './audio.js';

const MAX_CANS = 48;
const EPA_FAMILY_GALLONS = 300;
const USGS_GPCD = 82;

const FIXTURE_BINDINGS = [
  ['people-fix', 'people', 'people-fix-val', (v) => labelPeople(v)],
  ['showers', 'showersPerPersonPerDay', 'showers-val', (v) => String(v)],
  ['shower-min', 'showerMinutes', 'shower-min-val', (v) => `${v} min`],
  ['shower-gpm', 'showerGpm', 'shower-gpm-val', (v) => `${formatNumber(v, 1)} gpm`],
  ['flushes', 'flushesPerPersonPerDay', 'flushes-val', (v) => String(v)],
  ['toilet-gpf', 'toiletGpf', 'toilet-gpf-val', (v) => `${formatNumber(v, 2)} gpf`],
  ['faucet-min', 'faucetMinutesPerPerson', 'faucet-min-val', (v) => `${formatNumber(v, 1)} min`],
  ['faucet-gpm', 'faucetGpm', 'faucet-gpm-val', (v) => `${formatNumber(v, 1)} gpm`],
  ['laundry-loads', 'laundryLoadsPerWeek', 'laundry-loads-val', (v) => String(v)],
  ['laundry-gal', 'laundryGalPerLoad', 'laundry-gal-val', (v) => `${v} gal`],
  ['dish-cyc', 'dishwasherCyclesPerWeek', 'dish-cyc-val', (v) => String(v)],
  ['dish-gal', 'dishwasherGalPerCycle', 'dish-gal-val', (v) => `${formatNumber(v, 1)} gal`],
  ['baths', 'bathsPerWeek', 'baths-val', (v) => String(v)],
  ['bath-gal', 'bathGallons', 'bath-gal-val', (v) => `${v} gal`],
  ['drips', 'leakDripsPerSec', 'drips-val', (v) => `${formatNumber(v, 1)} /s`],
  ['outdoor-fix', 'outdoorGallonsPerDay', 'outdoor-fix-val', (v) => `${formatNumber(v, 0)} gal`],
];

const view = decodeState(location.hash);
let tickLock = 0;
const anim = new Map();

function labelPeople(value) {
  const n = Number(value);
  return n === 1 ? '1 person' : `${formatNumber(n, n % 1 === 0 ? 0 : 1)} people`;
}

function currentHousehold() {
  return householdDay(view.household);
}

function fairDay(day) {
  if (view.fairLiters == null) return null;
  const cap = view.fairLiters * day.people;
  if (day.liters <= cap + 1e-9) return { ...day, capped: true, unchanged: true };
  const scale = cap / day.liters;
  return {
    ...day,
    capped: true,
    unchanged: false,
    liters: cap,
    gallons: day.gallons * scale,
    cans: day.cans * scale,
    kg: day.kg * scale,
    perPersonLiters: view.fairLiters,
    perPersonGallons: day.perPersonGallons * scale,
  };
}

function qs(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

function renderPresets() {
  const root = qs('presets');
  root.replaceChildren();
  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset';
    btn.dataset.preset = preset.id;
    btn.textContent = preset.short;
    btn.title = preset.hint;
    btn.setAttribute('aria-pressed', String(view.presetId === preset.id));
    if (view.presetId === preset.id) btn.classList.add('active');
    btn.addEventListener('click', () => applyPreset(preset.id));
    root.append(btn);
  }
  if (view.presetId === 'custom') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset active';
    btn.dataset.preset = 'custom';
    btn.textContent = 'Custom';
    btn.setAttribute('aria-pressed', 'true');
    btn.disabled = true;
    root.append(btn);
  }
}

function applyPreset(id) {
  const preset = findPreset(id);
  if (!preset) return;
  view.presetId = id;
  view.household = { ...preset.state };
  if (preset.state.endUses) view.household.endUses = { ...preset.state.endUses };
  playCan();
  render();
}

function animateText(el, next, digits) {
  const target = Number(next);
  const prev = Number(el.dataset.v || 0);
  if (!Number.isFinite(target)) {
    el.textContent = '—';
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(target - prev) < 0.05) {
    el.dataset.v = String(target);
    el.textContent = formatCompact(target, digits);
    return;
  }
  const key = el.id || el;
  cancelAnimationFrame(anim.get(key) || 0);
  const t0 = performance.now();
  const dur = 420;
  const frame = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - (1 - p) ** 3;
    const value = prev + (target - prev) * eased;
    el.textContent = formatCompact(value, digits);
    if (p < 1) anim.set(key, requestAnimationFrame(frame));
    else {
      el.dataset.v = String(target);
      el.textContent = formatCompact(target, digits);
    }
  };
  anim.set(key, requestAnimationFrame(frame));
}

function renderCans(cans) {
  const yard = qs('can-yard');
  const total = Math.max(0, cans);
  const visual = Math.min(MAX_CANS, Math.ceil(total - 1e-9) || 0);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < visual; i += 1) {
    const remaining = total - i;
    const fill = remaining >= 1 ? 100 : Math.max(6, remaining * 100);
    const can = document.createElement('div');
    can.className = 'can';
    can.style.setProperty('--fill', `${fill}%`);
    can.style.animationDelay = `${Math.min(i, 24) * 18}ms`;
    can.innerHTML = '<span class="handle"></span><span class="body"><span class="water"></span></span>';
    frag.append(can);
  }
  if (total > MAX_CANS) {
    const more = document.createElement('div');
    more.className = 'can more';
    more.textContent = `+${formatCompact(total - MAX_CANS, 1)} more`;
    frag.append(more);
  }
  yard.replaceChildren(frag);
  const whole = Math.floor(total);
  const partial = total - whole;
  qs('can-caption').textContent = total === 0
    ? 'No water in this day yet — raise a control in the lab.'
    : `${formatNumber(total, 1)} twenty-liter cans: ${whole} full${partial > 0.02 ? ` and one ${formatNumber(partial * 100, 0)}% full` : ''}.`;
}

function renderBreakdown(day) {
  const root = qs('breakdown');
  const max = Math.max(...day.breakdown.map((r) => r.gallons), 0.01);
  const frag = document.createDocumentFragment();
  for (const row of day.breakdown) {
    const item = document.createElement('div');
    item.className = 'break-row';
    const bar = document.createElement('div');
    bar.className = `bar ${row.key}`;
    bar.innerHTML = '<span></span>';
    bar.style.setProperty('--w', String(row.gallons / max));
    const name = document.createElement('b');
    name.textContent = row.label;
    const val = document.createElement('em');
    val.textContent = `${formatNumber(row.gallons, 1)} gal`;
    item.append(name, bar, val);
    frag.append(item);
  }
  root.replaceChildren(frag);

  const vsFamily = day.gallons / EPA_FAMILY_GALLONS;
  const vsPerson = day.perPersonGallons / USGS_GPCD;
  qs('benchmark').textContent = `This day is ${formatNumber(vsFamily, 2)}× EPA WaterSense’s “more than 300 gallons” family benchmark, and ${formatNumber(vsPerson, 2)}× the USGS 82 gallons-per-person domestic average.`;
}

function renderLadder() {
  const root = qs('jmp-ladder');
  if (root.dataset.ready) return;
  const frag = document.createDocumentFragment();
  const safe = document.createElement('div');
  safe.className = 'rung safe';
  safe.innerHTML = `<div><div class="name">${JMP_2024.safelyManaged.label}</div><div class="meta">${JMP_2024.safelyManaged.definition}</div></div>
    <div class="track"><i style="--w:${JMP_2024.safelyManaged.percent}%;--tone:var(--aqua)"></i></div>
    <div class="count">${JMP_2024.safelyManaged.peopleBillions} billion<br>${JMP_2024.safelyManaged.percent}%</div>`;
  frag.append(safe);
  const max = Math.max(...JMP_2024.ladder.map((r) => r.peopleMillions));
  const tones = ['#7dd3c7', '#f3c14a', '#e0893a', '#ff6b4a'];
  JMP_2024.ladder.forEach((rung, i) => {
    const el = document.createElement('div');
    el.className = 'rung';
    const people = rung.peopleMillions >= 1000
      ? `${formatNumber(rung.peopleMillions / 1000, 1)} billion`
      : `${rung.peopleMillions} million`;
    el.innerHTML = `<div><div class="name">${rung.label}</div><div class="meta">${rung.definition}</div></div>
      <div class="track"><i style="--w:${(rung.peopleMillions / max) * 100}%;--tone:${tones[i]}"></i></div>
      <div class="count">${people}</div>`;
    frag.append(el);
  });
  root.replaceChildren(frag);
  root.dataset.ready = '1';
  qs('jmp-caption').textContent = `${JMP_2024.report}. The four rungs without safely managed service sum to 2.095 billion people; JMP headlines this as 2.1 billion.`;
}

function showPanel(mode) {
  qs('volume-panel').classList.toggle('hidden', mode !== 'volume');
  qs('enduse-panel').classList.toggle('hidden', mode !== 'enduse');
  qs('fixture-panel').classList.toggle('hidden', mode !== 'fixtures');
}

function fillEnduseSliders() {
  const root = qs('enduse-sliders');
  if (root.dataset.ready) return;
  const frag = document.createDocumentFragment();
  for (const key of END_USE_KEYS) {
    const label = document.createElement('label');
    label.className = 'ctrl';
    const max = key === 'outdoor' ? 400 : 80;
    label.innerHTML = `<span>${END_USE_LABELS[key]} <em id="eu-${key}-val"></em></span>
      <input id="eu-${key}" type="range" min="0" max="${max}" step="0.1" data-enduse="${key}">`;
    frag.append(label);
  }
  root.replaceChildren(frag);
  root.dataset.ready = '1';
  root.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      if (!view.household.endUses) view.household.endUses = {};
      view.household.mode = 'enduse';
      view.household.endUses[input.dataset.enduse] = Number(input.value);
      view.presetId = matchPreset(view.household);
      cueTick();
      render();
    });
  });
}

function syncInputs() {
  const hh = view.household;
  if (hh.mode === 'volume') {
    qs('people-vol').value = hh.people;
    qs('people-vol-val').textContent = labelPeople(hh.people);
    qs('liters-per-person').value = hh.litersPerPerson;
    qs('lppd-val').textContent = `${formatNumber(hh.litersPerPerson, 0)} L`;
  } else if (hh.mode === 'enduse') {
    fillEnduseSliders();
    qs('people-end').value = hh.people;
    qs('people-end-val').textContent = labelPeople(hh.people);
    for (const key of END_USE_KEYS) {
      const input = document.getElementById(`eu-${key}`);
      const val = document.getElementById(`eu-${key}-val`);
      if (input && val) {
        input.value = hh.endUses?.[key] ?? 0;
        val.textContent = `${formatNumber(hh.endUses?.[key] ?? 0, 1)} gal`;
      }
    }
  } else {
    for (const [id, key, valId, fmt] of FIXTURE_BINDINGS) {
      const input = qs(id);
      input.value = hh[key];
      qs(valId).textContent = fmt(Number(input.value));
    }
  }
  qs('round-trip').value = view.carry.roundTripMinutes;
  qs('round-trip-val').textContent = `${view.carry.roundTripMinutes} min`;
  qs('cpt-1').checked = view.carry.cansPerTrip === 1;
  qs('cpt-2').checked = view.carry.cansPerTrip === 2;
  const fairOn = view.fairLiters != null;
  qs('fair-liters').value = fairOn ? view.fairLiters : 200;
  qs('fair-val').textContent = fairOn ? `${formatNumber(view.fairLiters, 0)} L` : 'off — no cap';
  document.querySelectorAll('[data-fair]').forEach((btn) => {
    btn.classList.toggle('active', fairOn && Number(btn.dataset.fair) === view.fairLiters);
  });
}

function renderMute() {
  const btn = qs('mute-toggle');
  const muted = isMuted();
  btn.setAttribute('aria-pressed', String(muted));
  btn.textContent = muted ? 'Sound off' : 'Sound on';
  btn.setAttribute('aria-label', muted ? 'Sound is off. Click to enable cues.' : 'Sound is on. Click to mute cues.');
}

function render() {
  const day = currentHousehold();
  const carry = carryModel(day.liters, view.carry);
  const band = whoQuantityBand(day.perPersonLiters);
  const preset = findPreset(view.presetId);

  animateText(qs('metric-cans'), day.cans, 1);
  qs('metric-volume').textContent = `${formatCompact(day.liters, 1)} liters · ${formatCompact(day.gallons, 1)} gallons`;
  qs('metric-kg').textContent = formatCompact(day.kg, 1);
  qs('metric-hours').textContent = formatDuration(carry.hours);
  const tripWord = view.carry.cansPerTrip === 1 ? '1 can' : '2 cans';
  qs('metric-hours-label').textContent = `if carried ${tripWord} at a time, ${view.carry.roundTripMinutes}-min trips`;
  qs('metric-per-person').textContent = `${formatCompact(day.perPersonLiters, 1)} L`;
  qs('metric-per-person-label').textContent = `per person · ${formatNumber(band.ratioToIntermediate, 1)}× WHO’s 50 L intermediate quantity`;
  qs('who-band-label').textContent = band.label;
  qs('who-band-blurb').textContent = `This volume matches WHO’s “${band.label.toLowerCase()}” band (about ${band.typicalLiters === 100 ? '100–200' : band.typicalLiters} L/person). A chosen budget is not the same as a community’s access.`;

  renderCans(day.cans);
  renderBreakdown(day);
  renderLadder();
  showPanel(day.mode);
  syncInputs();
  renderPresets();
  renderMute();

  const banner = preset
    ? `${preset.title}. ${preset.hint}.`
    : 'Custom day — totals update as you edit.';
  qs('mode-banner').textContent = banner;

  qs('carry-trips').textContent = formatNumber(carry.exactTrips, 1);
  qs('carry-time').textContent = formatDuration(carry.hours);
  qs('carry-kg-trip').textContent = `${carry.kgPerTrip} kg`;
  qs('gender-note').textContent = `In 2022, ${JMP_GENDER_2022.offPremisesPeopleBillions} billion people lived in households without water on the premises. Women and girls aged 15+ were primarily responsible for collection in 7 out of 10 of those households (${JMP_GENDER_2022.report}).`;

  const capped = fairDay(day);
  const fairEl = qs('fair-result');
  if (!capped) {
    fairEl.textContent = `No cap. This household uses ${formatCompact(day.perPersonLiters, 1)} liters per person — ${formatNumber(day.perPersonLiters / WHO_INTERMEDIATE_LITERS, 1)}× WHO’s 50-liter intermediate quantity.`;
  } else if (capped.unchanged) {
    fairEl.textContent = `Already at or under ${view.fairLiters} L/person. The can wall would not shrink.`;
  } else {
    const fairCarry = carryModel(capped.liters, view.carry);
    fairEl.textContent = `A ${view.fairLiters} L cap would shrink this day from ${formatNumber(day.cans, 1)} cans (${formatDuration(carry.hours)} of walking) to ${formatNumber(capped.cans, 1)} cans (${formatDuration(fairCarry.hours)}).`;
  }

  const hash = encodeState(view);
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

function cueTick() {
  const t = Date.now();
  if (t - tickLock < 90) return;
  tickLock = t;
  playTick();
}

function bind() {
  qs('mute-toggle').addEventListener('click', () => {
    setMuted(!isMuted());
    if (!isMuted()) playDrip();
    renderMute();
  });
  qs('share-btn').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}${encodeState(view)}`;
    try {
      await navigator.clipboard.writeText(url);
      qs('copy-status').textContent = 'Share link copied.';
      playSuccess();
    } catch {
      qs('copy-status').textContent = 'Copy the URL in the address bar to share this day.';
    }
    setTimeout(() => { qs('copy-status').textContent = ''; }, 2400);
  });
  qs('top-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  qs('people-vol').addEventListener('input', (e) => {
    view.household.people = Number(e.target.value);
    view.presetId = matchPreset(view.household);
    cueTick();
    render();
  });
  qs('liters-per-person').addEventListener('input', (e) => {
    view.household.litersPerPerson = Number(e.target.value);
    view.presetId = matchPreset(view.household);
    cueTick();
    render();
  });
  qs('people-end').addEventListener('input', (e) => {
    view.household.people = Number(e.target.value);
    view.presetId = matchPreset(view.household);
    cueTick();
    render();
  });

  for (const [id, key] of FIXTURE_BINDINGS) {
    qs(id).addEventListener('input', (e) => {
      view.household.mode = 'fixtures';
      view.household[key] = Number(e.target.value);
      view.presetId = matchPreset(view.household);
      cueTick();
      render();
    });
  }

  qs('round-trip').addEventListener('input', (e) => {
    view.carry.roundTripMinutes = clamp(Number(e.target.value), 5, 90);
    cueTick();
    render();
  });
  document.querySelectorAll('input[name="cans-per-trip"]').forEach((input) => {
    input.addEventListener('change', () => {
      view.carry.cansPerTrip = Number(input.value) === 2 ? 2 : 1;
      playWhoosh();
      render();
    });
  });

  qs('fair-liters').addEventListener('input', (e) => {
    const value = Number(e.target.value);
    view.fairLiters = value >= 200 ? null : value;
    cueTick();
    render();
  });
  document.querySelectorAll('[data-fair]').forEach((btn) => {
    btn.addEventListener('click', () => {
      view.fairLiters = Number(btn.dataset.fair);
      playWhoosh();
      render();
    });
  });
  qs('fair-clear').addEventListener('click', () => {
    view.fairLiters = null;
    playTick();
    render();
  });

  window.addEventListener('hashchange', () => {
    const next = decodeState(location.hash);
    Object.assign(view, next);
    view.household = next.household;
    view.carry = next.carry;
    render();
  });
}

bind();
fillEnduseSliders();
render();
