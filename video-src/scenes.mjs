// Narrated demo script. Each scene is a list of voice segments; `act` runs when that segment starts.
// Independent `clicks` fire on wall-clock time and never block captions.
// Captions and on-screen UI must match the spoken numbers exactly.
// TTS avoids "jerrycans" (heard as "jerrykins"), bare "WHO", "Cap that" (heard as "Kept that"),
// and bare "JMP" (risk of "jump").
export const VOICE = 'en-US-AndrewNeural';
export const RATE = '+6%';

export const scenes = [
  {
    id: 'title',
    segs: [
      {
        text: 'This is Twenty Liters.',
        act: async () => {},
      },
      {
        text: 'Your tap, measured in the can the world still carries.',
        act: async () => {},
      },
    ],
  },
  {
    id: 'hook',
    segs: [
      {
        text: 'Open a typical U.S. home, and the day is one hundred ninety-seven gallons.',
        act: async (h) => {
          await h.hideTitle();
          await h.caption('Typical US home · 197 gallons');
          await h.waitForCans(36, 39);
          await h.scrollTo('html', 0, 400);
        },
      },
      {
        text: 'That is thirty-seven point three twenty-liter jerry cans, and seven hundred forty-five kilograms of water.',
        act: async (h) => {
          await h.caption('37.3 cans · 745 kg');
          await h.hover('#metric-cans');
        },
      },
      {
        text: 'Carry it one can at a time, on a thirty-minute round trip, and the walk takes eighteen hours and thirty-eight minutes.',
        act: async (h) => {
          await h.caption('18 hours and 38 minutes of walking · 30-min trips');
          await h.scrollTo('#can-yard', -80, 800);
          await h.hover('#metric-hours');
        },
      },
    ],
  },
  {
    id: 'why',
    clicks: [
      // Pre-select campus dorm in the closing beat so the next scene opens on 8.5 cans.
      { at: 12.4, sel: '[data-preset="dorm"]', cans: [8, 9.2] },
    ],
    segs: [
      {
        text: 'Twenty Liters is a clean-water equalizer for Sustainable Development Goal Six.',
        act: async (h) => {
          await h.caption('SDG 6 · Clean water and sanitation');
          await h.scrollTo('.eyebrow', -12, 600);
        },
      },
      {
        text: 'Every figure comes from E.P.A. WaterSense, the U.S. Geological Survey, the Water Research Foundation, the World Health Organization, or UNICEF.',
        act: async (h) => {
          await h.caption('Cited figures only. Nothing invented.');
        },
      },
    ],
  },
  {
    id: 'presets',
    segs: [
      {
        text: 'Click a preset, and the wall rebuilds. A campus dorm is eight and a half cans — one student, no lawn.',
        act: async (h) => {
          await h.caption('Campus dorm · 8.5 cans');
          await h.scrollTo('.hero-board', -28, 500);
          await h.hover('[data-preset="dorm"]');
        },
      },
      {
        text: 'A World Health Organization twenty-liter day for four people is four cans. One jerry can each.',
        act: async (h) => {
          await h.caption('20 L each · 4.0 cans');
          await h.fastClick('[data-preset="who-20"]');
          await h.waitForCans(3.9, 4.2);
          await h.scrollTo('.hero-board', -28, 500);
        },
      },
      {
        text: 'An arid-west yard, using E.P.A.’s sixty percent outdoor share, jumps to sixty-five point two cans.',
        act: async (h) => {
          await h.caption('Arid-west yard · 65.2 cans');
          await h.fastClick('[data-preset="arid-west"]');
          await h.waitForCans(64, 67);
          await h.scrollTo('.hero-board', -28, 700);
        },
      },
    ],
  },
  {
    id: 'lab',
    // Load the family and scroll to the fixture lab BEFORE this clip starts
    // so 0:59–1:03 in the final cut is mid-drag, with the live totals on screen.
    prepare: async (h) => {
      await h.loadPreset('family-standard', 44, 47);
      await h.eval(() => {
        const panel = document.getElementById('fixture-panel');
        if (panel?.classList.contains('hidden')) throw new Error('fixture panel still hidden');
        panel.scrollIntoView({ block: 'start', behavior: 'instant' });
        window.scrollBy(0, -18);
        document.getElementById('live-strip')?.removeAttribute('hidden');
      });
    },
    segs: [
      {
        text: 'The fixture lab uses labeled E.P.A. rates. Change a shower, a toilet, or a dripping faucet, and the wall updates immediately.',
        act: async (h) => {
          await h.caption('Change a fixture — the can total updates immediately');
          await h.sleep(280);
          await h.slideRange('#shower-min', 4, 1500);
          await h.slideRange('#shower-gpm', 1.5, 1400);
          await h.slideRange('#toilet-gpf', 1.28, 1600);
        },
      },
      {
        text: 'The same family, with WaterSense fixtures, uses less water without changing their habits.',
        act: async (h) => {
          await h.loadPreset('family-standard', 44, 47);
          await h.caption('WaterSense retrofit · same habits, fewer cans');
          await h.loadPreset('watersense', 37, 41);
          await h.scrollTo('.hero-board', -28, 600);
        },
      },
    ],
  },
  {
    id: 'carry',
    segs: [
      {
        text: 'The carry lab is a thought experiment. Thirty minutes is how the Joint Monitoring Programme separates basic from limited drinking-water service — not a claim about any one village.',
        act: async (h) => {
          await h.fastClick('[data-preset="arid-west"]');
          await h.waitForCans(64, 67);
          await h.caption('Arid-west yard · 30-minute collection threshold');
          await h.scrollTo('#carry-card', -20, 800);
          await h.hover('#carry-time');
        },
      },
      {
        text: 'Now limit this household to fifty liters per person, and sixty-five point two cans shrink to six point two — three hours and eight minutes of walking.',
        act: async (h) => {
          await h.caption('65.2 cans → 6.2 cans · 3 hours and 8 minutes');
          await h.fastClick('[data-fair="50"]');
          await h.waitForText('#fair-result', '6.2');
          await h.scrollTo('#fair', -12, 500);
        },
      },
    ],
  },
  {
    id: 'world',
    segs: [
      {
        text: 'In twenty twenty-four, one in four people — two point one billion — still did not have safely managed drinking water.',
        act: async (h) => {
          await h.caption('2024 · 2.1 billion without safely managed water');
          await h.scrollTo('#world', -8, 900);
        },
      },
      {
        text: 'One hundred six million still drank from rivers, lakes, and streams.',
        act: async (h) => {
          await h.caption('106 million using surface water');
          await h.centerInView('#jmp-ladder .rung:last-child', 130);
        },
      },
    ],
  },
  {
    id: 'end',
    segs: [
      {
        text: 'Every number is cited. Nothing is invented. Twenty Liters runs in your browser.',
        act: async (h) => {
          await h.endCard();
        },
      },
    ],
  },
];
