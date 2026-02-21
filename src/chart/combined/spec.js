export const CALIBRATION_MODE = (process.env.REACT_APP_CALIBRATION_MODE || '').trim().toLowerCase() === 'true';

const BASE_LAYOUT = {
  canvas: { width: 2480, height: 3508 },
  titleBar: { x: 80, y: 84, w: 2320, h: 208 },
  mainPlot: { x: 220, y: 360, w: 1800, h: 2760 },
  bmiInset: { x: 240, y: 390, w: 520, h: 520 },
  mphTable: { x: 2060, y: 360, w: 340, h: 1760 },
  footer: { x: 120, y: 3208, w: 2240, h: 220 },
  axis: {
    xMin: 0,
    xMax: 18,
    yMin: 0,
    yMax: 195,
    xMajorStepYears: 1,
    xMinorStepYears: 0.1,
    yMajorStep: 5,
    yMinorStep: 1,
  },
  gridStyle: {
    minorStroke: '#d9d2b0',
    majorStroke: '#9a9169',
    minorStrokeWidth: 1.1,
    majorStrokeWidth: 1.9,
  },
};

export const COMBINED_IAP_TEMPLATE = {
  M: {
    ...BASE_LAYOUT,
    imagePath: '/charts/boys_0_18.png',
    backgroundColor: '#dbeeff',
  },
  F: {
    ...BASE_LAYOUT,
    imagePath: '/charts/girls_0_18.png',
    backgroundColor: '#ffe1ec',
    axis: {
      ...BASE_LAYOUT.axis,
      yMax: 175,
    },
  },
};

export function resolveCombinedSpec(sex) {
  if (sex === 'M') {
    return COMBINED_IAP_TEMPLATE.M;
  }
  return COMBINED_IAP_TEMPLATE.F;
}

function finiteOr(current, next) {
  return Number.isFinite(next) ? Number(next) : current;
}

export function applyCombinedSpecOverrides(base, overrides) {
  if (!overrides) {
    return base;
  }

  return {
    ...base,
    titleBar: {
      x: finiteOr(base.titleBar.x, overrides.titleBarX),
      y: finiteOr(base.titleBar.y, overrides.titleBarY),
      w: finiteOr(base.titleBar.w, overrides.titleBarW),
      h: finiteOr(base.titleBar.h, overrides.titleBarH),
    },
    mainPlot: {
      x: finiteOr(base.mainPlot.x, overrides.mainPlotX),
      y: finiteOr(base.mainPlot.y, overrides.mainPlotY),
      w: finiteOr(base.mainPlot.w, overrides.mainPlotW),
      h: finiteOr(base.mainPlot.h, overrides.mainPlotH),
    },
    bmiInset: {
      x: finiteOr(base.bmiInset.x, overrides.bmiInsetX),
      y: finiteOr(base.bmiInset.y, overrides.bmiInsetY),
      w: finiteOr(base.bmiInset.w, overrides.bmiInsetW),
      h: finiteOr(base.bmiInset.h, overrides.bmiInsetH),
    },
    mphTable: {
      x: finiteOr(base.mphTable.x, overrides.mphTableX),
      y: finiteOr(base.mphTable.y, overrides.mphTableY),
      w: finiteOr(base.mphTable.w, overrides.mphTableW),
      h: finiteOr(base.mphTable.h, overrides.mphTableH),
    },
    footer: {
      x: finiteOr(base.footer.x, overrides.footerX),
      y: finiteOr(base.footer.y, overrides.footerY),
      w: finiteOr(base.footer.w, overrides.footerW),
      h: finiteOr(base.footer.h, overrides.footerH),
    },
    axis: {
      ...base.axis,
      xMinorStepYears: finiteOr(base.axis.xMinorStepYears, overrides.xMinorStepYears),
      xMajorStepYears: finiteOr(base.axis.xMajorStepYears, overrides.xMajorStepYears),
      yMinorStep: finiteOr(base.axis.yMinorStep, overrides.yMinorStep),
      yMajorStep: finiteOr(base.axis.yMajorStep, overrides.yMajorStep),
    },
  };
}
