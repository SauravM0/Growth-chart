import React, { useId } from 'react';
import { scaleLinear } from 'd3-scale';
import { listDatasets } from '../data/datasets';
import { getCurvePath, getCentileStyle } from './curves';
import { layoutRightLabels } from './labelLayout';
import { getPointsPath, prepareMeasurementPoints } from './points';

function findDatasetFallback() {
  const datasets = listDatasets();
  return datasets[0] || null;
}

function getSeriesExtent(curves) {
  const values = Object.values(curves || {})
    .flat()
    .map((point) => point.v)
    .filter((value) => typeof value === 'number');
  if (values.length === 0) {
    return [0, 1];
  }
  return [Math.min(...values), Math.max(...values)];
}

function roundDown(value, step) {
  return Math.floor(value / step) * step;
}

function roundUp(value, step) {
  return Math.ceil(value / step) * step;
}

function buildGridValues(min, max, step) {
  const values = [];
  for (let value = min; value <= max + 0.0001; value += step) {
    values.push(Number(value.toFixed(2)));
  }
  return values;
}

function getCurveEndValue(section, centile) {
  const points = section?.curves?.[String(centile)] || [];
  if (points.length === 0) {
    return null;
  }
  return points[points.length - 1].v;
}

function getRightMphMarkerPath(x, y) {
  return `M ${x} ${y} l -10 -6 l 0 12 z`;
}

function centileLabelPriority(centile) {
  if (centile === 50) {
    return 150;
  }
  if (centile === 3 || centile === 97) {
    return 140;
  }
  return 60;
}

function GrowthChartSVG({
  dataset,
  measurements = [],
  dobISO = '',
  mphCm = null,
  showMphLine = true,
  showLabels = false,
  connectPoints = true,
  theme = {},
  className = '',
}) {
  const activeDataset = dataset || findDatasetFallback();
  const clipIdPrefix = useId().replace(/:/g, '');

  if (!activeDataset) {
    return <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">No chart data available.</div>;
  }

  const colors = {
    canvasFill: theme.canvasFill || '#ffffff',
    panelFill: theme.panelFill || '#fafafa',
    panelStroke: theme.panelStroke || '#d4d4d4',
  };
  const width = 1080;
  const height = 760;
  const left = 62;
  const plotRight = 790;
  const rightPanelX = plotRight + 56;
  const rightPanelWidth = width - rightPanelX - 18;
  const topTitleY = 34;

  const heightRect = { top: 94, bottom: 346 };
  const weightRect = { top: 384, bottom: 636 };
  const ageAxisY = weightRect.bottom;

  const xScale = scaleLinear().domain([0, 18]).range([left, plotRight]);
  const [heightMinRaw, heightMaxRaw] = getSeriesExtent(activeDataset.height?.curves || {});
  const [weightMinRaw, weightMaxRaw] = getSeriesExtent(activeDataset.weight?.curves || {});
  const yHeightMin = roundDown(heightMinRaw - 2, 5);
  const yHeightMax = roundUp(heightMaxRaw + 2, 5);
  const yWeightMin = Math.max(0, roundDown(weightMinRaw - 1, 5));
  const yWeightMax = roundUp(weightMaxRaw + 1, 5);
  const yHeightScale = scaleLinear().domain([yHeightMin, yHeightMax]).range([heightRect.bottom, heightRect.top]);
  const yWeightScale = scaleLinear().domain([yWeightMin, yWeightMax]).range([weightRect.bottom, weightRect.top]);

  const verticalGridAges = buildGridValues(0, 18, 0.5);
  const heightGridValues = buildGridValues(yHeightMin, yHeightMax, 1);
  const weightGridValues = buildGridValues(yWeightMin, yWeightMax, 1);
  const rightGutterCentiles = [97, 90, 75, 50, 25, 10, 3];
  const measurementPoints = dobISO ? prepareMeasurementPoints(measurements, dobISO) : [];
  const heightPoints = measurementPoints.filter((point) => Number.isFinite(point.heightCm));
  const weightPoints = measurementPoints.filter((point) => Number.isFinite(point.weightKg));
  const heightPath = connectPoints ? getPointsPath(heightPoints, xScale, yHeightScale, 'heightCm') : '';
  const weightPath = connectPoints ? getPointsPath(weightPoints, xScale, yWeightScale, 'weightKg') : '';
  const mphY = typeof mphCm === 'number' ? yHeightScale(mphCm) : null;
  const mphInRange =
    typeof mphY === 'number' &&
    mphY >= heightRect.top &&
    mphY <= heightRect.bottom;
  const heightClipId = `${clipIdPrefix}-clip-height`;
  const weightClipId = `${clipIdPrefix}-clip-weight`;
  const heightGutterItems = [
    ...rightGutterCentiles
      .map((centile) => {
        const endHeight = getCurveEndValue(activeDataset.height, centile);
        if (typeof endHeight !== 'number') {
          return null;
        }
        return {
          key: `h-right-label-${centile}`,
          y: yHeightScale(endHeight) + 4,
          text: String(centile),
          fill: '#334155',
          fontWeight: centile === 50 ? 700 : 500,
          fontSize: 11,
          priority: centileLabelPriority(centile),
        };
      })
      .filter(Boolean),
    ...(mphInRange
      ? [
          {
            key: 'h-right-label-mph',
            y: mphY - 8,
            text: `MPH (${mphCm.toFixed(1)} cm)`,
            fill: '#047857',
            fontWeight: 600,
            fontSize: 12,
            priority: 200,
            marker: true,
          },
        ]
      : []),
  ];
  const heightGutterLayout = layoutRightLabels(heightGutterItems, 12, heightRect.top + 10, heightRect.bottom - 8);

  const weightGutterItems = rightGutterCentiles
    .map((centile) => {
      const endWeight = getCurveEndValue(activeDataset.weight, centile);
      if (typeof endWeight !== 'number') {
        return null;
      }
      return {
        key: `w-right-label-${centile}`,
        y: yWeightScale(endWeight) + 4,
        text: String(centile),
        fill: '#334155',
        fontWeight: centile === 50 ? 700 : 500,
        fontSize: 11,
        priority: centileLabelPriority(centile),
      };
    })
    .filter(Boolean);
  const weightGutterLayout = layoutRightLabels(weightGutterItems, 12, weightRect.top + 10, weightRect.bottom - 8);
  const shortLabelY = yHeightScale(getCurveEndValue(activeDataset.height, 3));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="auto"
      className={className}
      role="img"
      aria-label="Growth chart"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width={width} height={height} fill={colors.canvasFill} />
      <defs>
        <clipPath id={heightClipId}>
          <rect x={left} y={heightRect.top} width={plotRight - left} height={heightRect.bottom - heightRect.top} />
        </clipPath>
        <clipPath id={weightClipId}>
          <rect x={left} y={weightRect.top} width={plotRight - left} height={weightRect.bottom - weightRect.top} />
        </clipPath>
      </defs>

      <text x={left} y={topTitleY} fontSize="24" fill="#111827" fontWeight="700">
        Height and Weight Centile Chart
      </text>

      <rect
        x={left}
        y={heightRect.top}
        width={plotRight - left}
        height={heightRect.bottom - heightRect.top}
        fill={colors.panelFill}
        stroke={colors.panelStroke}
      />
      <rect
        x={left}
        y={weightRect.top}
        width={plotRight - left}
        height={weightRect.bottom - weightRect.top}
        fill={colors.panelFill}
        stroke={colors.panelStroke}
      />

      <g clipPath={`url(#${heightClipId})`}>
        {verticalGridAges.map((age) => (
          <line
            key={`x-h-${age}`}
            x1={xScale(age)}
            y1={heightRect.top}
            x2={xScale(age)}
            y2={heightRect.bottom}
            stroke={Number.isInteger(age) ? '#475569' : '#cbd5e1'}
            strokeWidth={Number.isInteger(age) ? 1.1 : 0.5}
          />
        ))}
        {heightGridValues.map((value) => (
          <line
            key={`y-h-${value}`}
            x1={left}
            y1={yHeightScale(value)}
            x2={plotRight}
            y2={yHeightScale(value)}
            stroke={value % 5 === 0 ? '#475569' : '#cbd5e1'}
            strokeWidth={value % 5 === 0 ? 1.1 : 0.5}
          />
        ))}
        {(activeDataset.height?.centiles || []).map((centile) => {
          const curve = activeDataset.height?.curves?.[String(centile)] || [];
          const style = getCentileStyle(centile);
          return (
            <path
              key={`height-centile-${centile}`}
              d={getCurvePath(curve, xScale, yHeightScale)}
              fill="none"
              stroke="#1f2937"
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.dashArray}
              opacity={style.opacity}
            />
          );
        })}
        {mphInRange && showMphLine && (
          <line
            x1={left}
            y1={mphY}
            x2={plotRight}
            y2={mphY}
            stroke="#047857"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
        )}
        {heightPath && <path d={heightPath} fill="none" stroke="#dc2626" strokeWidth="2.1" />}
        {heightPoints.map((point) => (
          <g key={`height-point-${point.id || `${point.dateISO}-${point.ageYears}`}`}>
            {Number.isFinite(point.heightCm) && (
              <>
                <circle
                  cx={xScale(point.ageYears)}
                  cy={yHeightScale(point.heightCm)}
                  r="3.8"
                  fill="#dc2626"
                />
                {showLabels && (
                  <text
                    x={xScale(point.ageYears) + 6}
                    y={yHeightScale(point.heightCm) - 6}
                    fontSize="10"
                    fill="#991b1b"
                  >
                    {`H ${point.ageYears.toFixed(1)}y`}
                  </text>
                )}
              </>
            )}
          </g>
        ))}
      </g>

      <g clipPath={`url(#${weightClipId})`}>
        {verticalGridAges.map((age) => (
          <line
            key={`x-w-${age}`}
            x1={xScale(age)}
            y1={weightRect.top}
            x2={xScale(age)}
            y2={weightRect.bottom}
            stroke={Number.isInteger(age) ? '#475569' : '#cbd5e1'}
            strokeWidth={Number.isInteger(age) ? 1.1 : 0.5}
          />
        ))}
        {weightGridValues.map((value) => (
          <line
            key={`y-w-${value}`}
            x1={left}
            y1={yWeightScale(value)}
            x2={plotRight}
            y2={yWeightScale(value)}
            stroke={value % 5 === 0 ? '#475569' : '#cbd5e1'}
            strokeWidth={value % 5 === 0 ? 1.1 : 0.5}
          />
        ))}
        {(activeDataset.weight?.centiles || []).map((centile) => {
          const curve = activeDataset.weight?.curves?.[String(centile)] || [];
          const style = getCentileStyle(centile);
          return (
            <path
              key={`weight-centile-${centile}`}
              d={getCurvePath(curve, xScale, yWeightScale)}
              fill="none"
              stroke="#1f2937"
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.dashArray}
              opacity={style.opacity}
            />
          );
        })}
        {weightPath && <path d={weightPath} fill="none" stroke="#dc2626" strokeWidth="2.1" />}
        {weightPoints.map((point) => (
          <g key={`weight-point-${point.id || `${point.dateISO}-${point.ageYears}`}`}>
            {Number.isFinite(point.weightKg) && (
              <>
                <circle
                  cx={xScale(point.ageYears)}
                  cy={yWeightScale(point.weightKg)}
                  r="3.8"
                  fill="#dc2626"
                />
                {showLabels && (
                  <text
                    x={xScale(point.ageYears) + 8}
                    y={yWeightScale(point.weightKg) + 12}
                    fontSize="10"
                    fill="#991b1b"
                  >
                    {`W ${point.ageYears.toFixed(1)}y`}
                  </text>
                )}
              </>
            )}
          </g>
        ))}
      </g>

      {heightGutterLayout
        .filter((item) => item.visible)
        .map((item) => (
          <g key={item.key}>
            {item.marker && <path d={getRightMphMarkerPath(plotRight + 34, item.y - 3)} fill="#047857" />}
            <text
              x={plotRight + 38}
              y={item.y}
              fontSize={item.fontSize}
              fill={item.fill}
              fontWeight={item.fontWeight}
            >
              {item.text}
            </text>
          </g>
        ))}

      {weightGutterLayout
        .filter((item) => item.visible)
        .map((item) => (
          <text
            key={item.key}
            x={plotRight + 38}
            y={item.y}
            fontSize={item.fontSize}
            fill={item.fill}
            fontWeight={item.fontWeight}
          >
            {item.text}
          </text>
        ))}

      {typeof shortLabelY === 'number' && shortLabelY >= heightRect.top + 10 && shortLabelY <= heightRect.bottom - 6 && (
        <g>
          <rect
            x={plotRight - 230}
            y={Math.max(heightRect.top + 6, shortLabelY - 18)}
            width={220}
            height={18}
            fill="#ffffff"
            opacity="0.9"
            stroke="#fecaca"
          />
          <text
            x={plotRight - 12}
            y={Math.max(heightRect.top + 19, shortLabelY - 5)}
            textAnchor="end"
            fontSize="11"
            fill="#7f1d1d"
            fontWeight="600"
          >
            3 (Short below this line)
          </text>
        </g>
      )}

      <rect
        x={rightPanelX}
        y={heightRect.top}
        width={rightPanelWidth}
        height={148}
        fill="#ffffff"
        stroke="#94a3b8"
        strokeDasharray="4 3"
      />
      <text x={rightPanelX + 10} y={heightRect.top + 22} fontSize="12" fill="#475569" fontWeight="600">
        Inset Box Area (Reserved)
      </text>

      <rect
        x={rightPanelX}
        y={heightRect.top + 164}
        width={rightPanelWidth}
        height={weightRect.bottom - (heightRect.top + 164)}
        fill="#ffffff"
        stroke="#94a3b8"
        strokeDasharray="4 3"
      />
      <text x={rightPanelX + 10} y={heightRect.top + 186} fontSize="12" fill="#475569" fontWeight="600">
        MPH Lookup Table (Reserved)
      </text>

      <text x={left - 46} y={(heightRect.top + heightRect.bottom) / 2} fontSize="12" fill="#111827" fontWeight="600">
        Height (cm)
      </text>
      <text x={left - 46} y={(weightRect.top + weightRect.bottom) / 2} fontSize="12" fill="#111827" fontWeight="600">
        Weight (kg)
      </text>

      {buildGridValues(0, 18, 1).map((age) => (
        <g key={`age-label-${age}`}>
          <line
            x1={xScale(age)}
            y1={ageAxisY}
            x2={xScale(age)}
            y2={ageAxisY + 6}
            stroke="#111827"
            strokeWidth="1"
          />
          <text x={xScale(age)} y={ageAxisY + 22} fontSize="11" textAnchor="middle" fill="#111827">
            {age}
          </text>
        </g>
      ))}

      <text x={(left + plotRight) / 2} y={height - 20} textAnchor="middle" fontSize="13" fill="#111827" fontWeight="600">
        Age in Years (0-18)
      </text>
      <text x={plotRight + 8} y={heightRect.top - 8} fontSize="11" fill="#111827" fontWeight="600">
        Centiles
      </text>
      <text x={plotRight + 8} y={weightRect.top - 8} fontSize="11" fill="#111827" fontWeight="600">
        Centiles
      </text>
    </svg>
  );
}

export default GrowthChartSVG;
