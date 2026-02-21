import React from 'react';
import TemplateGrowthChartSVG from '../chart/TemplateGrowthChartSVG';

function displayNumber(value, decimals = 1) {
  return typeof value === 'number' ? value.toFixed(decimals) : '—';
}

function dateTimeText() {
  const now = new Date();
  return now.toLocaleString();
}

function PrintView({
  patient,
  dataset,
  measurements,
  mphCm,
  chartTheme = {},
  clinicName = 'Clinic',
  appName = 'Growth Chart App',
  datasetId = '',
}) {
  return (
    <section className={`print-area space-y-3 rounded-lg border p-4 ${chartTheme.wrapperClassName || 'border-zinc-300 bg-white'}`}>
      <header className="print-header rounded-md border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">Patient Growth Chart</h2>
        <div className="grid gap-x-4 gap-y-1 md:grid-cols-3">
          <p><span className="font-medium">Name:</span> {patient.name || 'Unnamed Patient'}</p>
          <p><span className="font-medium">Sex:</span> {patient.sex}</p>
          <p><span className="font-medium">DOB:</span> {patient.dobISO}</p>
          <p><span className="font-medium">Mother Height:</span> {displayNumber(patient.motherHeightCm)} cm</p>
          <p><span className="font-medium">Father Height:</span> {displayNumber(patient.fatherHeightCm)} cm</p>
          <p><span className="font-medium">MPH:</span> {displayNumber(mphCm)} cm</p>
        </div>
      </header>

      <div className="print-chart rounded-lg border border-zinc-300 bg-white p-2">
        <TemplateGrowthChartSVG
          dataset={dataset}
          sex={patient.sex}
          measurements={measurements}
          dobISO={patient.dobISO}
          mphCm={mphCm}
          showLabels={false}
          showMphLine
          connectPoints
          className="h-auto w-full"
        />
      </div>

      <footer className="print-footer border-t border-zinc-300 pt-2 text-xs text-zinc-600">
        {clinicName} | {appName} | Generated {dateTimeText()} | Dataset: {datasetId || dataset?.id || 'Unknown'}
      </footer>
    </section>
  );
}

export default PrintView;
