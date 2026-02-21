import React, { useEffect, useId, useMemo, useState } from 'react';
import { prepareMeasurementPoints } from './points';

const DEFAULT_TEMPLATE_DIMENSIONS = {
  width: 2480,
  height: 3508,
};

const TEMPLATE_GRID_BOUNDS = {
  M: {
    GRID_LEFT: 220,
    GRID_RIGHT: 2020,
    GRID_TOP: 360,
    GRID_BOTTOM: 3120,
    yMin: 0,
    yMax: 195,
  },
  F: {
    GRID_LEFT: 220,
    GRID_RIGHT: 2020,
    GRID_TOP: 360,
    GRID_BOTTOM: 3120,
    yMin: 0,
    yMax: 175,
  },
};

const AGE_MIN = 0;
const AGE_MAX = 18;

function getTemplateSrc(sex) {
  return sex === 'M' ? '/charts/boys_0_18.png' : '/charts/girls_0_18.png';
}

function isValidTemplateImage(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return false;
  }
  const isLargeEnough = width >= 1000 && height >= 1400;
  const isPortrait = height > width * 1.2;
  return isLargeEnough && isPortrait;
}

function toSexKey(dataset, sex) {
  if (dataset?.sex === 'M' || sex === 'M') {
    return 'M';
  }
  return 'F';
}

function mapAgeToX(ageYears, bounds) {
  return bounds.GRID_LEFT + ((ageYears - AGE_MIN) / (AGE_MAX - AGE_MIN)) * (bounds.GRID_RIGHT - bounds.GRID_LEFT);
}

function mapValueToY(value, bounds) {
  return bounds.GRID_BOTTOM - ((value - bounds.yMin) / (bounds.yMax - bounds.yMin)) * (bounds.GRID_BOTTOM - bounds.GRID_TOP);
}

function pointsToPolyline(points, bounds, key) {
  const mapped = points.map((point) => `${mapAgeToX(point.ageYears, bounds)},${mapValueToY(point[key], bounds)}`);
  return mapped.length > 1 ? mapped.join(' ') : '';
}

function TemplateOverlayChart({
  dataset,
  sex = '',
  measurements = [],
  dobISO = '',
  mphCm = null,
  showLabels = false,
  showMphLine = true,
  connectPoints = true,
  className = '',
  onTemplateValidityChange = null,
}) {
  const clipId = useId().replace(/:/g, '');
  const sexKey = toSexKey(dataset, sex);
  const bounds = TEMPLATE_GRID_BOUNDS[sexKey];
  const imagePath = getTemplateSrc(sexKey);

  const [dimensions, setDimensions] = useState(DEFAULT_TEMPLATE_DIMENSIONS);
  const [templateError, setTemplateError] = useState(false);
  const [templateErrorMessage, setTemplateErrorMessage] = useState('');

  useEffect(() => {
    let alive = true;

    async function verifyAndLoadTemplate() {
      try {
        const response = await fetch(imagePath, { cache: 'no-store' });
        if (!alive) {
          return;
        }
        if (!response.ok) {
          let fileListText = '';
          try {
            const indexResponse = await fetch('/charts/index.json', { cache: 'no-store' });
            if (indexResponse.ok) {
              const indexData = await indexResponse.json();
              if (Array.isArray(indexData?.files) && indexData.files.length > 0) {
                fileListText = ` | /charts files: ${indexData.files.join(', ')}`;
              }
            }
          } catch {
            // Optional file listing.
          }
          setTemplateError(true);
          setTemplateErrorMessage(`Missing chart image: ${imagePath}${fileListText}`);
          setDimensions(DEFAULT_TEMPLATE_DIMENSIONS);
          if (typeof onTemplateValidityChange === 'function') {
            onTemplateValidityChange(false);
          }
          return;
        }
      } catch {
        if (!alive) {
          return;
        }
        setTemplateError(true);
        setTemplateErrorMessage(`Missing chart image: ${imagePath}`);
        setDimensions(DEFAULT_TEMPLATE_DIMENSIONS);
        if (typeof onTemplateValidityChange === 'function') {
          onTemplateValidityChange(false);
        }
        return;
      }

      const img = new window.Image();
      img.onload = () => {
        if (!alive) {
          return;
        }
        const width = img.naturalWidth || DEFAULT_TEMPLATE_DIMENSIONS.width;
        const height = img.naturalHeight || DEFAULT_TEMPLATE_DIMENSIONS.height;
        if (!isValidTemplateImage(width, height)) {
          setDimensions(DEFAULT_TEMPLATE_DIMENSIONS);
          setTemplateError(true);
          setTemplateErrorMessage(
            `Invalid chart image: ${imagePath} (${width}x${height}). Replace with the real clinic template PNG.`
          );
          if (typeof onTemplateValidityChange === 'function') {
            onTemplateValidityChange(false);
          }
          return;
        }
        setDimensions({ width, height });
        setTemplateError(false);
        setTemplateErrorMessage('');
        if (typeof onTemplateValidityChange === 'function') {
          onTemplateValidityChange(true);
        }
      };
      img.onerror = () => {
        if (!alive) {
          return;
        }
        setTemplateError(true);
        setTemplateErrorMessage(`Missing chart image: ${imagePath}`);
        setDimensions(DEFAULT_TEMPLATE_DIMENSIONS);
        if (typeof onTemplateValidityChange === 'function') {
          onTemplateValidityChange(false);
        }
      };
      img.src = imagePath;
    }

    verifyAndLoadTemplate();

    return () => {
      alive = false;
    };
  }, [imagePath, onTemplateValidityChange]);

  const measurementPoints = useMemo(() => (dobISO ? prepareMeasurementPoints(measurements, dobISO) : []), [measurements, dobISO]);
  const heightPoints = useMemo(
    () => measurementPoints.filter((point) => Number.isFinite(point.heightCm)),
    [measurementPoints]
  );
  const weightPoints = useMemo(
    () => measurementPoints.filter((point) => Number.isFinite(point.weightKg)),
    [measurementPoints]
  );
  const heightPolyline = connectPoints ? pointsToPolyline(heightPoints, bounds, 'heightCm') : '';
  const weightPolyline = connectPoints ? pointsToPolyline(weightPoints, bounds, 'weightKg') : '';

  const mphY = typeof mphCm === 'number' ? mapValueToY(mphCm, bounds) : null;
  const mphInRange = typeof mphY === 'number' && mphY >= bounds.GRID_TOP && mphY <= bounds.GRID_BOTTOM;

  return (
    <svg
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      width="100%"
      height="auto"
      className={className}
      role="img"
      aria-label="Template growth chart"
      preserveAspectRatio="xMidYMid meet"
    >
      {!templateError && (
        <image
          href={imagePath}
          x="0"
          y="0"
          width={dimensions.width}
          height={dimensions.height}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      <defs>
        <clipPath id={clipId}>
          <rect
            x={bounds.GRID_LEFT}
            y={bounds.GRID_TOP}
            width={bounds.GRID_RIGHT - bounds.GRID_LEFT}
            height={bounds.GRID_BOTTOM - bounds.GRID_TOP}
          />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {connectPoints && heightPolyline && (
          <polyline
            points={heightPolyline}
            fill="none"
            stroke="#dc2626"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {connectPoints && weightPolyline && (
          <polyline
            points={weightPolyline}
            fill="none"
            stroke="#dc2626"
            strokeWidth="6"
            strokeOpacity="0.8"
            strokeDasharray="12 8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {heightPoints.map((point) => (
          <g key={`height-point-${point.id || `${point.dateISO}-${point.ageYears}`}`}>
            {Number.isFinite(point.heightCm) && (
              <>
                <circle
                  cx={mapAgeToX(point.ageYears, bounds)}
                  cy={mapValueToY(point.heightCm, bounds)}
                  r="8"
                  fill="#dc2626"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                {showLabels && (
                  <text
                    x={mapAgeToX(point.ageYears, bounds) + 10}
                    y={mapValueToY(point.heightCm, bounds) - 12}
                    fontSize="24"
                    fill="#991b1b"
                    fontWeight="600"
                  >
                    {`H ${point.ageYears.toFixed(1)}y`}
                  </text>
                )}
              </>
            )}
          </g>
        ))}
        {weightPoints.map((point) => (
          <g key={`weight-point-${point.id || `${point.dateISO}-${point.ageYears}`}`}>
            {Number.isFinite(point.weightKg) && (
              <>
                <circle
                  cx={mapAgeToX(point.ageYears, bounds)}
                  cy={mapValueToY(point.weightKg, bounds)}
                  r="8"
                  fill="#dc2626"
                  fillOpacity="0.9"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                {showLabels && (
                  <text
                    x={mapAgeToX(point.ageYears, bounds) + 14}
                    y={mapValueToY(point.weightKg, bounds) + 16}
                    fontSize="24"
                    fill="#991b1b"
                    fontWeight="600"
                  >
                    {`W ${point.ageYears.toFixed(1)}y`}
                  </text>
                )}
              </>
            )}
          </g>
        ))}

        {mphInRange && showMphLine && (
          <line
            x1={bounds.GRID_LEFT}
            y1={mphY}
            x2={bounds.GRID_RIGHT}
            y2={mphY}
            stroke="#16a34a"
            strokeWidth="5"
            strokeDasharray="18 10"
          />
        )}
      </g>

      {mphInRange && showMphLine && (
        <text
          x={bounds.GRID_RIGHT + 20}
          y={mphY - 10}
          fill="#166534"
          fontSize="28"
          fontWeight="700"
        >
          MPH ({mphCm.toFixed(1)} cm)
        </text>
      )}

      {templateError && (
        <text x="40" y="60" fill="#b91c1c" fontSize="32" fontWeight="700">
          {templateErrorMessage || `Missing chart image: ${imagePath}`}
        </text>
      )}
    </svg>
  );
}

export default TemplateOverlayChart;
