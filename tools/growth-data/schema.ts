export const SEXES = ['boys', 'girls'] as const;
export const METRICS = ['height_cm', 'weight_kg'] as const;
export const CENTILES = [3, 10, 25, 50, 75, 90, 97] as const;

export type GrowthSex = (typeof SEXES)[number];
export type GrowthMetric = (typeof METRICS)[number];
export type GrowthCentile = (typeof CENTILES)[number];

export type GrowthPoint = {
  ageYears: number;
  value: number;
};

export type GrowthCurve = {
  sex: GrowthSex;
  metric: GrowthMetric;
  centile: GrowthCentile;
  points: GrowthPoint[];
};

export type CanonicalGrowthDataset = {
  curves: GrowthCurve[];
};

export function isGrowthSex(value: unknown): value is GrowthSex {
  return typeof value === 'string' && (SEXES as readonly string[]).includes(value);
}

export function isGrowthMetric(value: unknown): value is GrowthMetric {
  return typeof value === 'string' && (METRICS as readonly string[]).includes(value);
}

export function isGrowthCentile(value: unknown): value is GrowthCentile {
  return typeof value === 'number' && (CENTILES as readonly number[]).includes(value);
}
