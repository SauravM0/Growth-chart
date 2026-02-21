const CENTILE_BY_FATHER = {
  158: '3rd',
  163: '10th',
  168: '25th',
  173: '50th',
  178: '75th',
  182: '90th',
  187: '97th',
};

export function buildMphTableModel(spec) {
  const frameRect = {
    x: spec.mphTable.x,
    y: spec.mphTable.y,
    w: spec.mphTable.w,
    h: spec.mphTable.h,
  };

  const headerRect = {
    x: frameRect.x,
    y: frameRect.y,
    w: frameRect.w,
    h: 74,
  };

  const gridRect = {
    x: frameRect.x,
    y: headerRect.y + headerRect.h,
    w: frameRect.w,
    h: frameRect.h - headerRect.h,
  };

  const fatherX = gridRect.x + gridRect.w * 0.18;
  const centileX = gridRect.x + gridRect.w * 0.5;
  const motherX = gridRect.x + gridRect.w * 0.82;

  const dividerLeft = gridRect.x + gridRect.w * 0.34;
  const dividerRight = gridRect.x + gridRect.w * 0.66;

  const fatherStart = 150;
  const fatherEnd = 190;
  const rowCount = fatherEnd - fatherStart + 1;
  const rowHeight = gridRect.h / rowCount;

  const rows = [];
  for (let index = 0; index < rowCount; index += 1) {
    const fatherHeight = fatherStart + index;
    const motherHeight = fatherHeight - 13;
    rows.push({
      fatherHeight,
      motherHeight,
      centile: CENTILE_BY_FATHER[fatherHeight] || '',
      y: gridRect.y + (index + 0.5) * rowHeight,
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
