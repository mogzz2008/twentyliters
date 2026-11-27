/**
 * WHO domestic-water quantity bands from Howard & Bartram,
 * "Domestic Water Quantity, Service Level and Health" (WHO, 2003).
 *
 * These bands describe typical quantities associated with levels of access.
 * A household that *chooses* to use 20 L/person is not the same as a household
 * limited to basic access. The UI always phrases this as a quantity comparison.
 */
export const WHO_BANDS = [
  {
    id: 'no-access',
    label: 'Very low / no access',
    maxLiters: 5,
    typicalLiters: 5,
    blurb: 'WHO associates very low quantities (often around 5 liters per person per day) with no or very distant access, where even consumption is hard to assure.',
  },
  {
    id: 'basic',
    label: 'Basic-access quantity',
    maxLiters: 20,
    typicalLiters: 20,
    blurb: 'About 20 liters per person per day is the typical quantity WHO links to basic access — generally a source within about 1 km or a 30-minute round trip.',
  },
  {
    id: 'intermediate',
    label: 'Intermediate quantity',
    maxLiters: 50,
    typicalLiters: 50,
    blurb: 'About 50 liters per person per day is the typical quantity WHO links to intermediate access, such as a single tap on the plot, where consumption and basic hygiene can be assured.',
  },
  {
    id: 'optimal',
    label: 'Optimal quantity',
    maxLiters: Infinity,
    typicalLiters: 100,
    blurb: 'WHO describes 100–200 liters per person per day as the typical quantity when water is piped with multiple taps and all domestic needs can be met.',
  },
];

export const WHO_BASIC_LITERS = 20;
export const WHO_INTERMEDIATE_LITERS = 50;
export const WHO_OPTIMAL_LITERS = 100;

/** JMP “basic” drinking-water threshold: collection round trip of 30 minutes or less. */
export const JMP_BASIC_ROUND_TRIP_MINUTES = 30;

/**
 * Classify a liters-per-person-per-day figure into a WHO quantity band.
 * Values are compared inclusively at the band's typical ceiling
 * (5, 20, 50, then 100+).
 */
export function whoQuantityBand(litersPerPersonPerDay) {
  const n = Number(litersPerPersonPerDay);
  if (!Number.isFinite(n) || n < 0) {
    return { ...WHO_BANDS[0], liters: n, ratioToBasic: 0, ratioToIntermediate: 0 };
  }
  let band = WHO_BANDS[WHO_BANDS.length - 1];
  if (n <= 5) band = WHO_BANDS[0];
  else if (n <= 20) band = WHO_BANDS[1];
  else if (n <= 50) band = WHO_BANDS[2];
  else band = WHO_BANDS[3];
  return {
    ...band,
    liters: n,
    ratioToBasic: n / WHO_BASIC_LITERS,
    ratioToIntermediate: n / WHO_INTERMEDIATE_LITERS,
  };
}

/**
 * WHO/UNICEF JMP drinking-water service ladder, 2024 estimates
 * (Progress on household drinking water, sanitation and hygiene 2000–2024,
 * published August 2025).
 *
 * Component counts sum to 2.095 billion; JMP headlines this as 2.1 billion
 * people without safely managed drinking water.
 */
export const JMP_2024 = {
  year: 2024,
  report: 'WHO/UNICEF JMP, Progress on household drinking water, sanitation and hygiene 2000–2024 (August 2025)',
  worldPopulationBillions: 8.2,
  safelyManaged: {
    id: 'safely-managed',
    label: 'Safely managed',
    peopleBillions: 6.0,
    percent: 74,
    definition: 'Drinking water from an improved source that is accessible on premises, available when needed, and free from faecal and priority chemical contamination.',
  },
  lackingSafelyManagedBillions: 2.1,
  ladder: [
    {
      id: 'basic',
      label: 'Basic',
      peopleMillions: 1400,
      definition: 'Improved source, with a collection round trip of 30 minutes or less, including queuing.',
    },
    {
      id: 'limited',
      label: 'Limited',
      peopleMillions: 287,
      definition: 'Improved source, but the collection round trip exceeds 30 minutes, including queuing.',
    },
    {
      id: 'unimproved',
      label: 'Unimproved',
      peopleMillions: 302,
      definition: 'Unprotected dug well or unprotected spring.',
    },
    {
      id: 'surface',
      label: 'Surface water',
      peopleMillions: 106,
      definition: 'Drinking water taken directly from a river, dam, lake, pond, stream, canal, or irrigation canal.',
    },
  ],
};

export function jmpLackingComponentsMillions() {
  return JMP_2024.ladder.reduce((sum, rung) => sum + rung.peopleMillions, 0);
}

/**
 * WHO/UNICEF JMP 2023 gender analysis (data through 2022):
 * 1.8 billion people lived in households without water on premises,
 * and women and girls aged 15+ were primarily responsible for collection
 * in 7 out of 10 of those households.
 */
export const JMP_GENDER_2022 = {
  offPremisesPeopleBillions: 1.8,
  womenAndGirlsShare: 0.7,
  report: 'WHO/UNICEF JMP, Progress on household drinking water, sanitation and hygiene 2000–2022: special focus on gender (July 2023)',
};
