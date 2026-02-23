import type { CombinedIapSpec, Rect } from './spec';

export type MphRow = {
  fatherHeight: number;
  motherHeight: number;
  centile: string;
  y: number;
};

export type MphTableModel = {
  frameRect: Rect;
  headerRect: Rect;
  gridRect: Rect;
  title: string;
  columns: {
    fatherX: number;
    centileX: number;
    motherX: number;
  };
  columnDividers: number[];
  rows: MphRow[];
};

const CENTILE_BY_FATHER: Record<number, string> = {
  158: '3rd',
  163: '10th',
  168: '25th',
  173: '50th',
  178: '75th',
  182: '90th',
  187: '97th',
};

const PAD_X = 10;
const PAD_Y = 8;
const HEADER_H = 68;
const BASELINE = 4;
const SVG_TEXT_Y_OFFSET = 4;

export function buildMphTableModel(spec: CombinedIapSpec): MphTableModel {
  const frameRect: Rect = {
    x: spec.mphTable.x,
    y: spec.mphTable.y,
    w: spec.mphTable.w,
    h: spec.mphTable.h,
  };

  const headerRect: Rect = {
    x: frameRect.x + PAD_X,
    y: frameRect.y + PAD_Y,
    w: frameRect.w - PAD_X * 2,
    h: HEADER_H,
  };

  const gridRect: Rect = {
    x: frameRect.x + PAD_X,
    y: headerRect.y + headerRect.h + PAD_Y,
    w: frameRect.w - PAD_X * 2,
    h: frameRect.h - headerRect.h - PAD_Y * 3,
  };

  const fatherX = gridRect.x + gridRect.w * 0.22;
  const centileX = gridRect.x + gridRect.w * 0.52;
  const motherX = gridRect.x + gridRect.w * 0.82;

  const dividerLeft = gridRect.x + gridRect.w * 0.38;
  const dividerRight = gridRect.x + gridRect.w * 0.66;

  const fatherStart = 150;
  const fatherEnd = 190;
  const rowCount = fatherEnd - fatherStart + 1;
  const rowHeight = gridRect.h / rowCount;

  const rows: MphRow[] = [];
  for (let index = 0; index < rowCount; index += 1) {
    const fatherHeight = fatherStart + index;
    const motherHeight = fatherHeight - 13;
    rows.push({
      fatherHeight,
      motherHeight,
      centile: CENTILE_BY_FATHER[fatherHeight] || '',
      y: gridRect.y + (index + 1) * rowHeight - BASELINE - SVG_TEXT_Y_OFFSET,
    });
  }

  return {
    frameRect,
    headerRect,
    gridRect,
    title: 'MPH Percentile Calculator',
    columns: { fatherX, centileX, motherX },
    columnDividers: [dividerLeft, dividerRight],
    rows,
  };
}
