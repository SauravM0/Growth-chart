import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';

function getCurveValueExtent(curves) {
  const values = Object.values(curves).flat().map((point) => point.v);
  return extent(values);
}

function roundDown(value, step) {
  return Math.floor(value / step) * step;
}

function roundUp(value, step) {
  return Math.ceil(value / step) * step;
}

export function createChartScales({ dataset, width = 1000, left = 60, right = 140 }) {
  const plotRight = width - right;

  const xScale = scaleLinear()
    .domain([dataset.ageMinYears, dataset.ageMaxYears])
    .range([left, plotRight]);

  const [heightMinRaw, heightMaxRaw] = getCurveValueExtent(dataset.height.curves);
  const [weightMinRaw, weightMaxRaw] = getCurveValueExtent(dataset.weight.curves);

  const yHeightMin = roundDown(heightMinRaw - 4, 5);
  const yHeightMax = roundUp(heightMaxRaw + 4, 5);

  const yWeightMin = Math.max(0, roundDown(weightMinRaw - 2, 1));
  const yWeightMax = roundUp(weightMaxRaw + 2, 1);

  const yHeightScale = scaleLinear().domain([yHeightMin, yHeightMax]).range([340, 60]);
  const yWeightScale = scaleLinear().domain([yWeightMin, yWeightMax]).range([660, 390]);

  return {
    width,
    height: 700,
    left,
    right,
    plotRight,
    xScale,
    yHeightScale,
    yWeightScale,
    yHeightMin,
    yHeightMax,
    yWeightMin,
    yWeightMax,
    heightPlotTop: 60,
    heightPlotBottom: 340,
    weightPlotTop: 390,
    weightPlotBottom: 660,
  };
}
