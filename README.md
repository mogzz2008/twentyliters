# Twenty Liters

**Your tap, measured in the can the world still carries.**

A 20-liter jerrycan is the container millions of people still carry when drinking water is not on the premises. Twenty Liters translates a household water day into cans, kilograms, and walking hours — using published figures from EPA WaterSense, USGS, the Water Research Foundation, WHO, and the WHO/UNICEF Joint Monitoring Programme.

This is a client-side web app built for the [Acodemic × KeebsforWater Global SDG Hackathon](https://hackathon-draft-32215.devpost.com/). There is no backend and no account. Every calculation runs in the browser. Share links encode the day in the URL hash.

**Live demo:** <https://mogzz2008.github.io/twentyliters/>

## Try it

Open the live app (or `npm run serve` after install) and click one of the one-click presets:

1. **Typical US home** — Water Research Foundation 2016 indoor end uses plus EPA’s national 30% outdoor share.
2. **Family of four** — a labeled fixture-by-fixture day (8-minute showers, 1.6 gpf toilets, 2.5 gpm heads).
3. **WaterSense retrofit** — the same habits with 2.0 gpm showerheads, 1.28 gpf toilets, and 1.5 gpm faucets.
4. **Campus dorm**, **arid-west yard**, and **drip + leaks**.
5. **50-liter day** and **20-liter day** — WHO quantity bands for four people.

Then open the water lab, change a slider, and watch the can wall, kilograms, and walking hours update immediately. In the carry lab, the default 30-minute round trip is the JMP threshold that separates “basic” from “limited” drinking-water service. That is a thought experiment, not a claim about any one community. The fair-share equalizer caps liters per person at 20, 50, or 100 so you can see the wall shrink. Copy a share link to send the exact day.

## What the math includes

- **Units:** 1 US gallon = 3.785411784 liters (NIST). One jerrycan = 20 liters. Water mass uses the 1 liter ≈ 1 kilogram convention.
- **US household use:** EPA WaterSense (average family more than 300 gallons/day; 70% indoor / 30% outdoor nationally, outdoor “as much as 60 percent” in arid regions) and USGS 2015 (82 gallons per person per day at home).
- **Fixture rates:** federal-standard and WaterSense figures for showerheads (2.5 / 2.0 gpm), toilets (1.6 / 1.28 gpf), and bathroom faucets (2.2 / 1.5 gpm).
- **Leaks:** EPA’s published “more than 3,000 gallons per year” at one drip per second, scaled linearly with drip rate.
- **End-use mix:** Water Research Foundation, *Residential End Uses of Water, Version 2* (2016) — 138 gallons indoor per household per day (component sum 137.7).
- **Quantity bands:** Howard & Bartram, WHO 2003 (about 5, 20, 50, and 100–200 liters per person per day).
- **Global ladder:** WHO/UNICEF JMP 2000–2024 report (August 2025) — 74% safely managed; 2.1 billion people still without, including 106 million using surface water.
- **Gender:** JMP 2023 analysis — women and girls aged 15+ collected water in 7 out of 10 households without water on premises.

Twenty Liters is an educational comparison, **not a utility bill, engineering study, or a statement about any named community’s actual walk**.

## Stack

- Static HTML, CSS, and ES modules. No framework, no build step, no tracking.
- Pure unit, household, and carry engines in `public/js/core/`, covered by `npm test`.
- GitHub Pages via GitHub Actions (lint + unit tests, then deploy `public/`).
- Subtle Web Audio cues with a mute toggle (sound starts off).

## Develop

```bash
npm ci
npm test
npm run lint
npm run serve          # http://127.0.0.1:8080
npm run qa:browser     # headless Chrome E2E, including a mobile viewport
npm run check
```

Requires Chrome at `/usr/bin/google-chrome` (or set `CHROME`) for the browser suite.

## License

MIT. Display fonts are Fraunces, Sora, and IBM Plex Mono, each under the SIL Open Font License (see `public/fonts/`).
