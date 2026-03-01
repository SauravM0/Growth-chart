import fs from 'node:fs';
import path from 'node:path';
import { CENTILES, type GrowthCurve, type GrowthMetric, type GrowthPoint, type GrowthSex } from './schema';

export type Who2006Row = {
  ageMonths: number;
  centile3: number;
  centile10: number;
  centile25: number;
  centile50: number;
  centile75: number;
  centile90: number;
  centile97: number;
};

export const WHO_2006_FILES: Record<GrowthSex, Record<GrowthMetric, string>> = {
  boys: {
    height_cm: 'boys_height_0_5.csv',
    weight_kg: 'boys_weight_0_5.csv',
  },
  girls: {
    height_cm: 'girls_height_0_5.csv',
    weight_kg: 'girls_weight_0_5.csv',
  },
};

const CENTILE_COLUMN_MAP: Record<number, keyof Who2006Row> = {
  3: 'centile3',
  10: 'centile10',
  25: 'centile25',
  50: 'centile50',
  75: 'centile75',
  90: 'centile90',
  97: 'centile97',
};

function parseCsvLine(line: string): string[] {
  return line.split(',').map((item) => item.trim());
}

export function parseWho2006Csv(csvText: string): Who2006Row[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0]);
  const expectedHeader = [
    'ageMonths',
    'centile3',
    'centile10',
    'centile25',
    'centile50',
    'centile75',
    'centile90',
    'centile97',
  ];

  if (header.join('|') !== expectedHeader.join('|')) {
    throw new Error(`WHO CSV header mismatch. Expected ${expectedHeader.join(', ')}, found ${header.join(', ')}`);
  }

  const rows: Who2006Row[] = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length !== expectedHeader.length) {
      throw new Error(`WHO CSV row has ${cols.length} columns, expected ${expectedHeader.length}: '${line}'`);
    }

    const row: Who2006Row = {
      ageMonths: Number(cols[0]),
      centile3: Number(cols[1]),
      centile10: Number(cols[2]),
      centile25: Number(cols[3]),
      centile50: Number(cols[4]),
      centile75: Number(cols[5]),
      centile90: Number(cols[6]),
      centile97: Number(cols[7]),
    };

    if (Object.values(row).some((value) => !Number.isFinite(value))) {
      throw new Error(`WHO CSV row contains non-numeric value: '${line}'`);
    }

    rows.push(row);
  }

  return rows;
}

export function ageMonthsToYears(ageMonths: number): number {
  return Number((ageMonths / 12).toFixed(10));
}

export function whoRowsToCanonicalCurves(rows: Who2006Row[], sex: GrowthSex, metric: GrowthMetric): GrowthCurve[] {
  return CENTILES.map((centile) => {
    const columnName = CENTILE_COLUMN_MAP[centile];
    const points: GrowthPoint[] = rows.map((row) => ({
      ageYears: ageMonthsToYears(row.ageMonths),
      value: row[columnName],
    }));

    return {
      sex,
      metric,
      centile,
      points,
    };
  });
}

export function loadWho2006Curves(whoDir: string): GrowthCurve[] {
  const curves: GrowthCurve[] = [];

  for (const sex of ['boys', 'girls'] as const) {
    for (const metric of ['height_cm', 'weight_kg'] as const) {
      const fileName = WHO_2006_FILES[sex][metric];
      const csvPath = path.resolve(whoDir, fileName);
      const csvText = fs.readFileSync(csvPath, 'utf8');
      const rows = parseWho2006Csv(csvText);
      curves.push(...whoRowsToCanonicalCurves(rows, sex, metric));
    }
  }

  return curves;
}
