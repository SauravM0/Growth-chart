import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import CombinedIapChart from '../chart/combined/CombinedIapChart';

const PARAMS = [
  'titleBarX', 'titleBarY', 'titleBarW', 'titleBarH',
  'mainPlotX', 'mainPlotY', 'mainPlotW', 'mainPlotH',
  'bmiInsetX', 'bmiInsetY', 'bmiInsetW', 'bmiInsetH',
  'mphTableX', 'mphTableY', 'mphTableW', 'mphTableH',
  'footerX', 'footerY', 'footerW', 'footerH',
  'xMinorStepYears', 'xMajorStepYears', 'yMinorStep', 'yMajorStep',
];

function parseOverrides(searchParams) {
  const out = {};
  for (const key of PARAMS) {
    const raw = searchParams.get(key);
    if (raw === null) {
      continue;
    }
    const value = Number(raw);
    if (Number.isFinite(value)) {
      out[key] = value;
    }
  }
  return out;
}

function CombinedCalibrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sex = searchParams.get('sex') === 'M' ? 'M' : 'F';
  const debug = searchParams.get('debug') === '1';

  const specOverrides = useMemo(() => parseOverrides(searchParams), [searchParams]);

  const snippet = useMemo(() => {
    const entries = Object.entries(specOverrides);
    if (entries.length === 0) {
      return '// No query overrides applied.';
    }
    return entries
      .map(([key, value]) => `${key}: ${value},`)
      .join('\n');
  }, [specOverrides]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === '' || Number.isNaN(Number(value))) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900">Combined Chart Calibration</h1>
      <p className="text-sm text-zinc-700">
        Background image is forced ON here. Adjust query values to align SVG blocks and copy finalized values into
        <code className="mx-1 rounded bg-zinc-100 px-1 py-0.5">src/chart/combined/spec.ts</code>.
      </p>

      <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
        <aside className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center gap-2">
            <label className="text-sm">Sex</label>
            <select
              value={sex}
              className="rounded border border-zinc-300 px-2 py-1 text-sm"
              onChange={(event) => updateParam('sex', event.target.value)}
            >
              <option value="M">Boys</option>
              <option value="F">Girls</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={debug}
              onChange={(event) => updateParam('debug', event.target.checked ? 1 : '')}
            />
            Show debug boxes
          </label>

          <div className="grid grid-cols-2 gap-2">
            {PARAMS.map((key) => (
              <label key={key} className="text-xs text-zinc-700">
                {key}
                <input
                  type="number"
                  step="0.1"
                  value={searchParams.get(key) || ''}
                  onChange={(event) => updateParam(key, event.target.value)}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs"
                />
              </label>
            ))}
          </div>
        </aside>

        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-200 p-2">
            <div className="mx-auto w-full max-w-[1100px]">
              <CombinedIapChart
                sex={sex}
                calibrationImageVisible
                specOverrides={specOverrides}
                className="w-full"
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <h2 className="text-sm font-semibold text-zinc-900">Copy Into spec.ts</h2>
            <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-zinc-800">{snippet}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CombinedCalibrationPage;
