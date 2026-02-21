import demoGirls from './demo_girls_0_18_curves.json';
import demoBoys from './demo_boys_0_18_curves.json';

const DATASETS = [demoGirls, demoBoys];

export function listDatasets() {
  return DATASETS;
}

export function getDatasetById(datasetId) {
  return DATASETS.find((dataset) => dataset.id === datasetId) || null;
}

export function getDefaultDatasetIdForSex(sex) {
  if (sex === 'M') {
    return 'demo-boys-0-18';
  }
  return 'demo-girls-0-18';
}

export function getDatasetForSex(sex) {
  const id = getDefaultDatasetIdForSex(sex);
  return getDatasetById(id);
}

export function getChartThemeForSex(sex) {
  if (sex === 'M') {
    return {
      wrapperClassName: 'border-sky-200 bg-sky-50',
      canvasFill: '#f1f7ff',
      panelFill: '#f8fbff',
      panelStroke: '#bfdbfe',
    };
  }

  return {
    wrapperClassName: 'border-pink-200 bg-pink-50',
    canvasFill: '#fff4f8',
    panelFill: '#fff8fb',
    panelStroke: '#fbcfe8',
  };
}
