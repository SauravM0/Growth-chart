import React, { useEffect, useMemo } from 'react';
import { applyCombinedSpecOverrides, computeAutoExtendedAxisYMax, resolveCombinedSpec } from './spec';
import { buildGridModel } from './renderGrid';
import { buildCurvesModel } from './renderCurves';
import { buildBmiInsetModel } from './renderBmiInset';
import { buildMphTableModel } from './renderMphTable';
import { explainMeasurementExclusions, prepareMeasurementPoints } from '../points';
import { evaluateMeasurementAgainstCurves } from './centileUtils';
import boysCombinedCurves from '../../data/combined/boys_combined_curves.json';
import girlsCombinedCurves from '../../data/combined/girls_combined_curves.json';

function isDebugOverlayEnabled() {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search || '');
  return params.get('debug') === '1';
}

function DebugRect({ name, rect, stroke }) {
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeDasharray="16 10"
      />
      <text x={rect.x + 8} y={rect.y + 28} fontSize="24" fontWeight="700" fill={stroke}>
        {`${name}: x=${rect.x}, y=${rect.y}, w=${rect.w}, h=${rect.h}`}
      </text>
    </g>
  );
}

function mapAgeToPlotX(ageYears, spec) {
  const { xMin, xMax } = spec.axis;
  const rect = spec.mainPlot;
  if (xMax <= xMin) {
    return rect.x;
  }
  return rect.x + ((ageYears - xMin) / (xMax - xMin)) * rect.w;
}

function mapValueToPlotY(value, spec) {
  const { yMin, yMax } = spec.axis;
  const rect = spec.mainPlot;
  if (yMax <= yMin) {
    return rect.y + rect.h;
  }
  return rect.y + rect.h - ((value - yMin) / (yMax - yMin)) * rect.h;
}

function pointsToPath(points, key, spec) {
  const mapped = points
    .filter((point) => Number.isFinite(point.ageYears) && Number.isFinite(point[key]))
    .map((point) => `${mapAgeToPlotX(point.ageYears, spec).toFixed(2)},${mapValueToPlotY(point[key], spec).toFixed(2)}`);

  if (mapped.length < 2) {
    return '';
  }

  return `M${mapped[0]} ${mapped.slice(1).map((point) => `L${point}`).join(' ')}`;
}

function formatMeasurementLabel(point, value, unit, stats) {
  const ageText = Number.isFinite(point?.ageYears) ? `${point.ageYears.toFixed(1)}y` : 'age ?';
  const valueText = Number.isFinite(value) ? `${value.toFixed(1)} ${unit}` : `? ${unit}`;
  const centileText = Number.isFinite(stats?.interpolatedCentile)
    ? `${stats.isApproxCentile ? '~' : ''}P${stats.interpolatedCentile.toFixed(1)}`
    : 'P?';
  const zScoreText = Number.isFinite(stats?.zScore)
    ? ` | Z ${stats.zScore >= 0 ? '+' : ''}${stats.zScore.toFixed(2)}`
    : '';
  return `${ageText} | ${valueText} | ${centileText}${zScoreText}`;
}

function CombinedIapChart({
  sex = '',
  measurements = [],
  dobISO = '',
  showValues = false,
  mphCm = null,
  showMphCentileOverlay = false,
  specOverrides = null,
  className = '',
  onDiagnostics = null,
}) {
  const baseSpec = useMemo(() => resolveCombinedSpec(sex), [sex]);
  const spec = useMemo(
    () => applyCombinedSpecOverrides(baseSpec, specOverrides || undefined),
    [baseSpec, specOverrides]
  );
  const debugEnabled = isDebugOverlayEnabled();
  const extractedCurves = sex === 'M' ? boysCombinedCurves : girlsCombinedCurves;
  const metricCurves = useMemo(
    () => ({
      height: extractedCurves?.height || {},
      weight: extractedCurves?.weight || {},
    }),
    [extractedCurves]
  );
  const lmsCurves = useMemo(
    () => ({
      height: extractedCurves?.lms?.height || extractedCurves?.heightLms || null,
      weight: extractedCurves?.lms?.weight || extractedCurves?.weightLms || null,
    }),
    [extractedCurves]
  );
  const measurementPoints = useMemo(
    () => (dobISO ? prepareMeasurementPoints(measurements, dobISO) : []),
    [measurements, dobISO]
  );
  const effectiveAxisYMax = useMemo(
    () => computeAutoExtendedAxisYMax(spec.axis, measurementPoints),
    [spec.axis, measurementPoints]
  );
  const effectiveSpec = useMemo(() => {
    if (!Number.isFinite(effectiveAxisYMax) || effectiveAxisYMax === spec.axis.yMax) {
      return spec;
    }
    return {
      ...spec,
      axis: {
        ...spec.axis,
        yMax: effectiveAxisYMax,
      },
    };
  }, [spec, effectiveAxisYMax]);
  const axisAutoExtended = effectiveSpec.axis.yMax > spec.axis.yMax;
  const grid = useMemo(() => buildGridModel(effectiveSpec), [effectiveSpec]);
  const curves = useMemo(
    () => buildCurvesModel(effectiveSpec, extractedCurves, sex),
    [effectiveSpec, extractedCurves, sex]
  );
  const bmiInset = useMemo(() => buildBmiInsetModel(effectiveSpec, sex), [effectiveSpec, sex]);
  const mphTable = useMemo(() => buildMphTableModel(effectiveSpec), [effectiveSpec]);
  const plotDiagnostics = useMemo(
    () => {
      const diagnostics = explainMeasurementExclusions(measurements, dobISO, effectiveSpec.axis);
      return {
        ...diagnostics,
        axisAutoExtended,
        defaultAxisYMax: spec.axis.yMax,
        effectiveAxisYMax: effectiveSpec.axis.yMax,
      };
    },
    [measurements, dobISO, effectiveSpec.axis, axisAutoExtended, spec.axis.yMax]
  );
  useEffect(() => {
    if (typeof onDiagnostics === 'function') {
      onDiagnostics(plotDiagnostics);
    }
  }, [onDiagnostics, plotDiagnostics]);
  const heightPoints = useMemo(
    () =>
      measurementPoints.filter(
        (point) =>
          Number.isFinite(point.heightCm) &&
          point.heightCm >= effectiveSpec.axis.yMin &&
          point.heightCm <= effectiveSpec.axis.yMax
      ),
    [measurementPoints, effectiveSpec.axis.yMax, effectiveSpec.axis.yMin]
  );
  const weightPoints = useMemo(
    () =>
      measurementPoints.filter(
        (point) =>
          Number.isFinite(point.weightKg) &&
          point.weightKg >= effectiveSpec.axis.yMin &&
          point.weightKg <= effectiveSpec.axis.yMax
      ),
    [measurementPoints, effectiveSpec.axis.yMax, effectiveSpec.axis.yMin]
  );
  const heightPath = useMemo(() => pointsToPath(heightPoints, 'heightCm', effectiveSpec), [heightPoints, effectiveSpec]);
  const weightPath = useMemo(() => pointsToPath(weightPoints, 'weightKg', effectiveSpec), [weightPoints, effectiveSpec]);
  const mphOverlay = useMemo(() => {
    if (!showMphCentileOverlay || !Number.isFinite(mphCm)) {
      return null;
    }
    const inRange = mphCm >= effectiveSpec.axis.yMin && mphCm <= effectiveSpec.axis.yMax;
    if (!inRange) {
      return null;
    }

    const stats = evaluateMeasurementAgainstCurves({
      ageYears: effectiveSpec.axis.xMax,
      value: mphCm,
      metricCurves: metricCurves.height,
      lms: lmsCurves.height,
    });

    return {
      y: mapValueToPlotY(mphCm, effectiveSpec),
      label: `MPH ${mphCm.toFixed(1)} cm | ${Number.isFinite(stats.interpolatedCentile) ? `~P${stats.interpolatedCentile.toFixed(1)}` : 'P?'}`,
    };
  }, [showMphCentileOverlay, mphCm, effectiveSpec, metricCurves.height, lmsCurves.height]);
  const titleText = sex === 'M'
    ? 'WHO 2006 & IAP 2015 combined Boys Charts 0-18 Years'
    : 'WHO 2006 & IAP 2015 combined Girls Charts 0-18 Years';

  return (
    <svg
      viewBox={`0 0 ${spec.canvas.width} ${spec.canvas.height}`}
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Combined IAP chart"
      className={className}
    >
      <rect x="0" y="0" width={spec.canvas.width} height={spec.canvas.height} fill={spec.backgroundColor} />
      <g id="title-bar">
        <rect
          x={spec.titleBar.x}
          y={spec.titleBar.y}
          width={spec.titleBar.w}
          height={spec.titleBar.h}
          fill="#ffffff"
          stroke="#111827"
          strokeWidth="2"
        />
        <text
          x={spec.titleBar.x + spec.titleBar.w / 2}
          y={spec.titleBar.y + spec.titleBar.h / 2 + 14}
          textAnchor="middle"
          fontSize="58"
          fontWeight="700"
          fill="#111827"
        >
          {titleText}
        </text>
      </g>

      <g id="main-plot-placeholder">
        <rect
          x={grid.rect.x}
          y={grid.rect.y}
          width={grid.rect.w}
          height={grid.rect.h}
          fill="#fbf6e7"
          stroke={spec.gridStyle.majorStroke}
          strokeWidth={spec.gridStyle.majorStrokeWidth}
        />

        {grid.xMinorLines.map((line) => (
          <line
            key={`x-minor-${line.value}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={spec.gridStyle.minorStroke}
            strokeWidth={spec.gridStyle.minorStrokeWidth}
          />
        ))}
        {grid.yMinorLines.map((line) => (
          <line
            key={`y-minor-${line.value}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={spec.gridStyle.minorStroke}
            strokeWidth={spec.gridStyle.minorStrokeWidth}
          />
        ))}
        {grid.xMajorLines.map((line) => (
          <line
            key={`x-major-${line.value}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={spec.gridStyle.majorStroke}
            strokeWidth={spec.gridStyle.majorStrokeWidth}
          />
        ))}
        {grid.yMajorLines.map((line) => (
          <line
            key={`y-major-${line.value}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={spec.gridStyle.majorStroke}
            strokeWidth={spec.gridStyle.majorStrokeWidth}
          />
        ))}

        {curves.strokes.map((stroke) => (
          <path
            key={`curve-${stroke.id}`}
            d={stroke.path}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {heightPath && (
          <path
            d={heightPath}
            fill="none"
            stroke="#1f2937"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {weightPath && (
          <path
            d={weightPath}
            fill="none"
            stroke="#1f2937"
            strokeWidth="1.4"
            strokeOpacity="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {mphOverlay && (
          <>
            <line
              x1={grid.rect.x}
              y1={mphOverlay.y}
              x2={grid.rect.x + grid.rect.w}
              y2={mphOverlay.y}
              stroke="#166534"
              strokeWidth="1.6"
              strokeDasharray="7 5"
              strokeOpacity="0.85"
            />
            <text
              x={grid.rect.x + grid.rect.w - 10}
              y={mphOverlay.y - 6}
              textAnchor="end"
              fontSize="11"
              fontWeight="700"
              fill="#166534"
            >
              {mphOverlay.label}
            </text>
          </>
        )}

        {heightPoints.map((point) => {
          const x = mapAgeToPlotX(point.ageYears, effectiveSpec);
          const y = mapValueToPlotY(point.heightCm, effectiveSpec);
          const stats = evaluateMeasurementAgainstCurves({
            ageYears: point.ageYears,
            value: point.heightCm,
            metricCurves: metricCurves.height,
            lms: lmsCurves.height,
          });
          return (
            <g key={`height-marker-${point.id || `${point.dateISO}-${point.ageYears}`}`}>
              <circle
                cx={x}
                cy={y}
                r="5.3"
                fill="#111111"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
              {showValues && (
                <text
                  x={x + 7}
                  y={y - 7}
                  textAnchor="start"
                  fontSize="11"
                  fontWeight="600"
                  fill="#111111"
                >
                  {formatMeasurementLabel(point, point.heightCm, 'cm', stats)}
                </text>
              )}
            </g>
          );
        })}

        {weightPoints.map((point) => {
          const x = mapAgeToPlotX(point.ageYears, effectiveSpec);
          const y = mapValueToPlotY(point.weightKg, effectiveSpec);
          const stats = evaluateMeasurementAgainstCurves({
            ageYears: point.ageYears,
            value: point.weightKg,
            metricCurves: metricCurves.weight,
            lms: lmsCurves.weight,
          });
          return (
            <g key={`weight-marker-${point.id || `${point.dateISO}-${point.ageYears}`}`}>
              <circle
                cx={x}
                cy={y}
                r="4.8"
                fill="#ffffff"
                stroke="#111111"
                strokeWidth="1.7"
              />
              {showValues && (
                <text
                  x={x + 7}
                  y={y + 12}
                  textAnchor="start"
                  fontSize="11"
                  fontWeight="600"
                  fill="#111111"
                >
                  {formatMeasurementLabel(point, point.weightKg, 'kg', stats)}
                </text>
              )}
            </g>
          );
        })}

        {grid.xMajorLabels.map((label) => (
          <text
            key={`x-label-${label.value}`}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            fontSize="26"
            fill="#4b5563"
            fontWeight="600"
          >
            {label.value}
          </text>
        ))}

        {grid.yMajorLabels.map((label) => (
          <text
            key={`y-label-${label.value}`}
            x={label.x}
            y={label.y}
            textAnchor="end"
            fontSize="20"
            fill="#4b5563"
            fontWeight="600"
          >
            {label.value}
          </text>
        ))}

        <text
          x={grid.rect.x + grid.rect.w / 2}
          y={grid.rect.y + grid.rect.h + 94}
          textAnchor="middle"
          fontSize="38"
          fontWeight="700"
          fill="#374151"
        >
          Age in Years
        </text>
        <text
          x={grid.rect.x + grid.rect.w / 2}
          y={grid.rect.y + grid.rect.h + 128}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="#4b5563"
        >
          For clinical support; interpret with clinical context; confirm with source references.
        </text>
        <text
          x={grid.rect.x - 150}
          y={grid.rect.y + grid.rect.h / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${grid.rect.x - 150} ${grid.rect.y + grid.rect.h / 2})`}
          fontSize="32"
          fontWeight="700"
          fill="#374151"
        >
          Height in CM and Weight in KG
        </text>

        {curves.heightLabels.map((label) => (
          <text
            key={`height-centile-label-${label.centile}`}
            x={label.x}
            y={label.y}
            fontSize="28"
            fontWeight="700"
            textAnchor="start"
            fill={label.centile === '3' ? '#dc2626' : '#111111'}
          >
            {label.centile}
          </text>
        ))}

        {curves.weightLabels.map((label) => (
          <text
            key={`weight-centile-label-${label.centile}`}
            x={label.x}
            y={label.y}
            fontSize="28"
            fontWeight="700"
            textAnchor="start"
            fill="#111111"
          >
            {label.centile}
          </text>
        ))}

        {curves.shortLineCallout && (
          <text
            x={curves.shortLineCallout.x}
            y={curves.shortLineCallout.y}
            fontSize="24"
            fontWeight="700"
            textAnchor="start"
            fill="#dc2626"
          >
            {curves.shortLineCallout.text}
          </text>
        )}
      </g>
      <g id="bmi-inset-placeholder">
        <rect
          x={bmiInset.frameRect.x}
          y={bmiInset.frameRect.y}
          width={bmiInset.frameRect.w}
          height={bmiInset.frameRect.h}
          fill="#ffffff"
          stroke="#111111"
          strokeWidth="2.2"
        />
        <text
          x={bmiInset.frameRect.x + bmiInset.frameRect.w / 2}
          y={bmiInset.frameRect.y + 34}
          textAnchor="middle"
          fontSize="17"
          fontWeight="700"
          fill="#111111"
        >
          {bmiInset.title}
        </text>

        <rect
          x={bmiInset.plotRect.x}
          y={bmiInset.plotRect.y}
          width={bmiInset.plotRect.w}
          height={bmiInset.plotRect.h}
          fill="#fffdf4"
          stroke="#8b8564"
          strokeWidth="1.2"
        />

        {bmiInset.xTicks.map((tick) => (
          <g key={`bmi-x-${tick.value}`}>
            <line
              x1={tick.x}
              y1={bmiInset.plotRect.y}
              x2={tick.x}
              y2={bmiInset.plotRect.y + bmiInset.plotRect.h}
              stroke="#d4ccab"
              strokeWidth="1"
            />
            <text
              x={tick.x}
              y={bmiInset.plotRect.y + bmiInset.plotRect.h + 16}
              textAnchor="middle"
              fontSize="12"
              fill="#374151"
              fontWeight="600"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {bmiInset.yTicks.map((tick) => (
          <g key={`bmi-y-${tick.value}`}>
            <line
              x1={bmiInset.plotRect.x}
              y1={tick.y}
              x2={bmiInset.plotRect.x + bmiInset.plotRect.w}
              y2={tick.y}
              stroke="#d4ccab"
              strokeWidth="1"
            />
            <text
              x={bmiInset.plotRect.x - 8}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="12"
              fill="#374151"
              fontWeight="600"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {bmiInset.curves.map((curve) => (
          <g key={`bmi-curve-${curve.key}`}>
            <path
              d={curve.path}
              fill="none"
              stroke={curve.color}
              strokeWidth={curve.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x={curve.labelX}
              y={curve.labelY}
              textAnchor="start"
              fontSize="13"
              fontWeight="700"
              fill={curve.color}
            >
              {curve.key}
            </text>
          </g>
        ))}

        <text
          x={bmiInset.plotRect.x + bmiInset.plotRect.w / 2}
          y={bmiInset.plotRect.y + bmiInset.plotRect.h + 34}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#111111"
        >
          {bmiInset.xLabel}
        </text>
        <text
          x={bmiInset.plotRect.x - 46}
          y={bmiInset.plotRect.y + bmiInset.plotRect.h / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${bmiInset.plotRect.x - 46} ${bmiInset.plotRect.y + bmiInset.plotRect.h / 2})`}
          fontSize="13"
          fontWeight="700"
          fill="#111111"
        >
          {bmiInset.yLabel}
        </text>

        {bmiInset.legend.map((line, index) => (
          <text
            key={`bmi-legend-${line}`}
            x={bmiInset.frameRect.x + 14}
            y={bmiInset.frameRect.y + bmiInset.frameRect.h - 36 + index * 14}
            textAnchor="start"
            fontSize="11.5"
            fontWeight="600"
            fill="#111111"
          >
            {line}
          </text>
        ))}
      </g>
      <g id="mph-table-placeholder">
        <rect
          x={mphTable.frameRect.x}
          y={mphTable.frameRect.y}
          width={mphTable.frameRect.w}
          height={mphTable.frameRect.h}
          fill="#ffffff"
          stroke="#111111"
          strokeWidth="2"
        />

        <rect
          x={mphTable.headerRect.x}
          y={mphTable.headerRect.y}
          width={mphTable.headerRect.w}
          height={mphTable.headerRect.h}
          fill="#ffffff"
          stroke="#111111"
          strokeWidth="1.6"
        />
        <text
          x={mphTable.headerRect.x + mphTable.headerRect.w / 2}
          y={mphTable.headerRect.y + 32}
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill="#111111"
        >
          {mphTable.title}
        </text>

        <text
          x={mphTable.columns.fatherX}
          y={mphTable.gridRect.y + 24}
          textAnchor="middle"
          fontSize="13.5"
          fontWeight="700"
          fill="#111111"
        >
          Father&apos;s Height
        </text>
        <text
          x={mphTable.columns.centileX}
          y={mphTable.gridRect.y + 24}
          textAnchor="middle"
          fontSize="13.5"
          fontWeight="700"
          fill="#111111"
        >
          MPH Centile
        </text>
        <text
          x={mphTable.columns.motherX}
          y={mphTable.gridRect.y + 24}
          textAnchor="middle"
          fontSize="13.5"
          fontWeight="700"
          fill="#111111"
        >
          Mother&apos;s Height
        </text>

        {mphTable.columnDividers.map((xValue) => (
          <line
            key={`mph-divider-${xValue}`}
            x1={xValue}
            y1={mphTable.gridRect.y}
            x2={xValue}
            y2={mphTable.gridRect.y + mphTable.gridRect.h}
            stroke="#111111"
            strokeWidth="1.2"
          />
        ))}

        {mphTable.rows.map((row, index) => (
          <line
            key={`mph-row-line-${row.fatherHeight}`}
            x1={mphTable.gridRect.x}
            y1={mphTable.gridRect.y + index * (mphTable.gridRect.h / mphTable.rows.length)}
            x2={mphTable.gridRect.x + mphTable.gridRect.w}
            y2={mphTable.gridRect.y + index * (mphTable.gridRect.h / mphTable.rows.length)}
            stroke="#b9b39a"
            strokeWidth="0.75"
          />
        ))}
        <line
          x1={mphTable.gridRect.x}
          y1={mphTable.gridRect.y + mphTable.gridRect.h}
          x2={mphTable.gridRect.x + mphTable.gridRect.w}
          y2={mphTable.gridRect.y + mphTable.gridRect.h}
          stroke="#111111"
          strokeWidth="1.2"
        />

        {mphTable.rows.map((row) => (
          <g key={`mph-row-${row.fatherHeight}`}>
            <text
              x={mphTable.columns.fatherX}
              y={row.y + 4}
              textAnchor="middle"
              fontSize="11.2"
              fontWeight="600"
              fill="#111111"
            >
              {row.fatherHeight}
            </text>
            {row.centile && (
              <text
                x={mphTable.columns.centileX}
                y={row.y + 4}
                textAnchor="middle"
                fontSize="11.2"
                fontWeight="700"
                fill="#111111"
              >
                {row.centile}
              </text>
            )}
            <text
              x={mphTable.columns.motherX}
              y={row.y + 4}
              textAnchor="middle"
              fontSize="11.2"
              fontWeight="600"
              fill="#111111"
            >
              {row.motherHeight}
            </text>
          </g>
        ))}
      </g>
      <g id="footer-placeholder">
        <text
          x={spec.footer.x}
          y={spec.footer.y + 34}
          textAnchor="start"
          fontSize="12"
          fontWeight="500"
          fill="#111111"
        >
          Modified from: 1. WHO MGRS (Multicentre Growth Reference Study) 2006.
        </text>
        <text
          x={spec.footer.x}
          y={spec.footer.y + 54}
          textAnchor="start"
          fontSize="12"
          fontWeight="500"
          fill="#111111"
        >
          2. Revised IAP Growth Charts for Height, Weight and Body Mass Index for 5 to 18 year old Indian Children.
        </text>
        <text
          x={spec.footer.x}
          y={spec.footer.y + 74}
          textAnchor="start"
          fontSize="12"
          fontWeight="500"
          fill="#111111"
        >
          V. Khadilkar et al, from Indian Academy of Pediatrics, Growth Chart Committee, Indian Pediatrics, Jan 2015, Vol 52
        </text>
        <text
          x={spec.footer.x}
          y={spec.footer.y + 94}
          textAnchor="start"
          fontSize="12"
          fontWeight="500"
          fill="#111111"
        >
          3. Khadilkar V, Lohiya N, Chiplonkar S, Khadilkar A. Body Mass Index Quick Screening Tool for IAP 2015 Growth Charts
        </text>
        <text
          x={spec.footer.x}
          y={spec.footer.y + 114}
          textAnchor="start"
          fontSize="12"
          fontWeight="500"
          fill="#111111"
        >
          [published online ahead of print, 2020 Jun 12]. Indian Pediatr. 2020;S097475591600197.
        </text>
      </g>

      {debugEnabled && (
        <g id="debug-overlay">
          <DebugRect name="titleBar" rect={spec.titleBar} stroke="#1d4ed8" />
          <DebugRect name="mainPlot" rect={spec.mainPlot} stroke="#dc2626" />
          <DebugRect name="bmiInset" rect={spec.bmiInset} stroke="#7c3aed" />
          <DebugRect name="mphTable" rect={spec.mphTable} stroke="#059669" />
          <DebugRect name="footer" rect={spec.footer} stroke="#ea580c" />
        </g>
      )}
    </svg>
  );
}

export default CombinedIapChart;
