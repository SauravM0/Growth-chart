import fs from 'node:fs';
import path from 'node:path';
import { CENTILES } from '../schema';
import { ageMonthsToYears, WHO_2006_FILES, type Who2006Row } from '../who2006';

type RenderablePoint = { ageYears: number; valueY: number };
type RenderableDataset = {
  height: Record<string, RenderablePoint[]>;
  weight: Record<string, RenderablePoint[]>;
};

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const whoDir = path.resolve(repoRoot, 'tools/growth-data/sources/who2006');

const sourceBySex = {
  boys: path.resolve(repoRoot, 'src/data/combined/boys_combined_curves.json'),
  girls: path.resolve(repoRoot, 'src/data/combined/girls_combined_curves.json'),
} as const;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function valueAtAge(points: RenderablePoint[], targetAgeYears: number): number {
  if (targetAgeYears <= points[0].ageYears) {
    return points[0].valueY;
  }

  const last = points[points.length - 1];
  if (targetAgeYears >= last.ageYears) {
    return last.valueY;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];

    if (targetAgeYears >= left.ageYears && targetAgeYears <= right.ageYears) {
      const span = right.ageYears - left.ageYears;
      if (span <= 0) {
        return left.valueY;
      }
      const t = (targetAgeYears - left.ageYears) / span;
      return left.valueY + t * (right.valueY - left.valueY);
    }
  }

  return last.valueY;
}

function makeRows(dataset: RenderableDataset, metricKey: 'height' | 'weight'): Who2006Row[] {
  const rows: Who2006Row[] = [];
  for (let ageMonths = 0; ageMonths <= 60; ageMonths += 1) {
    const ageYears = ageMonthsToYears(ageMonths);
    const row = {
      ageMonths,
      centile3: 0,
      centile10: 0,
      centile25: 0,
      centile50: 0,
      centile75: 0,
      centile90: 0,
      centile97: 0,
    };

    for (const centile of CENTILES) {
      const points = (dataset[metricKey] || {})[String(centile)] || [];
      if (!points.length) {
        continue;
      }
      const value = Number(valueAtAge(points, ageYears).toFixed(4));
      (row as Record<string, number>)[`centile${centile}`] = value;
    }

    rows.push(row);
  }

  return rows;
}

function toCsv(rows: Who2006Row[]): string {
  const header = 'ageMonths,centile3,centile10,centile25,centile50,centile75,centile90,centile97';
  const lines = rows.map((row) =>
    [
      row.ageMonths,
      row.centile3,
      row.centile10,
      row.centile25,
      row.centile50,
      row.centile75,
      row.centile90,
      row.centile97,
    ].join(',')
  );

  return `${header}\n${lines.join('\n')}\n`;
}

function writeWhoSourceFiles(sex: 'boys' | 'girls', metric: 'height_cm' | 'weight_kg', rows: Who2006Row[]): void {
  const baseName = WHO_2006_FILES[sex][metric].replace(/\.csv$/, '');
  const csvPath = path.resolve(whoDir, `${baseName}.csv`);
  const jsonPath = path.resolve(whoDir, `${baseName}.json`);

  fs.writeFileSync(csvPath, toCsv(rows));
  fs.writeFileSync(jsonPath, `${JSON.stringify(rows, null, 2)}\n`);
}

function run(): void {
  fs.mkdirSync(whoDir, { recursive: true });

  for (const sex of ['boys', 'girls'] as const) {
    const source = readJson<RenderableDataset>(sourceBySex[sex]);
    const heightRows = makeRows(source, 'height');
    const weightRows = makeRows(source, 'weight');

    writeWhoSourceFiles(sex, 'height_cm', heightRows);
    writeWhoSourceFiles(sex, 'weight_kg', weightRows);
  }

  console.log(`WHO 2006 source scaffolding written to ${whoDir}`);
}

run();
