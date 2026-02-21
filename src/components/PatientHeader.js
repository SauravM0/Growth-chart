import React from 'react';
import { formatRiskClass } from '../utils/growthAnalytics';

function displayNumber(value, decimals = 1) {
  return typeof value === 'number' ? value.toFixed(decimals) : '—';
}

function InfoCard({ label, value, statusLevel = 'neutral', suffix = '', hint = '' }) {
  return (
    <div className="rounded-md border border-zinc-300 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${formatRiskClass(statusLevel)}`}>
        {value}
        {suffix}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

function PatientHeader({ patient, mphCm, analytics }) {
  const targetRangeText =
    typeof mphCm === 'number' ? `${(mphCm - 8.5).toFixed(1)} - ${(mphCm + 8.5).toFixed(1)} cm` : '—';

  return (
    <div className="mb-6 space-y-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">{patient.name || 'Unnamed Patient'}</h1>
        <p className="text-sm text-zinc-700">DOB: {patient.dobISO} | Sex: {patient.sex}</p>
      </div>

      <div className="grid gap-2 text-sm text-zinc-700 md:grid-cols-3">
        <p>
          <span className="font-medium">Patient Height:</span> {displayNumber(patient.heightCm)} cm
        </p>
        <p>
          <span className="font-medium">Patient Weight:</span> {displayNumber(patient.weightKg)} kg
        </p>
        <p>
          <span className="font-medium">Mother Height:</span> {displayNumber(patient.motherHeightCm)} cm
        </p>
        <p>
          <span className="font-medium">Father Height:</span> {displayNumber(patient.fatherHeightCm)} cm
        </p>
        <p>
          <span className="font-medium">MPH:</span> {displayNumber(mphCm)} cm
        </p>
      </div>

      <div className="card-grid">
        <InfoCard
          label="Latest Age"
          value={displayNumber(analytics?.latestAgeYears, 2)}
          suffix=" years"
        />
        <InfoCard
          label="Height Centile"
          value={displayNumber(analytics?.heightCentile)}
          suffix="th"
          statusLevel={analytics?.heightRisk?.level}
        />
        <InfoCard
          label="Weight Centile"
          value={displayNumber(analytics?.weightCentile)}
          suffix="th"
          statusLevel={analytics?.weightRisk?.level}
        />
        <InfoCard label="BMI" value={displayNumber(analytics?.bmi)} suffix=" kg/m²" />
        <InfoCard label="BSA" value={displayNumber(analytics?.bsaM2, 2)} suffix=" m²" />
        <InfoCard label="Height Velocity" value={displayNumber(analytics?.heightVelocity)} suffix=" cm/year" />
        <InfoCard label="Weight Velocity" value={displayNumber(analytics?.weightVelocity)} suffix=" kg/year" />
        <InfoCard
          label="Current vs MPH"
          value={displayNumber(analytics?.mphGapCm)}
          suffix=" cm"
          statusLevel={typeof analytics?.mphGapCm === 'number' && Math.abs(analytics.mphGapCm) > 15 ? 'high' : 'ok'}
        />
        <InfoCard label="MPH" value={displayNumber(mphCm)} suffix=" cm" />
        <InfoCard
          label="Projected Adult Height"
          value={displayNumber(analytics?.projectedAdultHeightCm)}
          suffix=" cm"
        />
        <InfoCard label="Target Height Range" value={targetRangeText} />
        <InfoCard
          label="FIB-4"
          value={displayNumber(analytics?.fib4, 2)}
          statusLevel={analytics?.fib4Risk?.level}
          hint={analytics?.fib4 ? analytics?.fib4Risk?.label || '' : 'Needs AST, ALT, Platelets'}
        />
        <InfoCard
          label="eGFR"
          value={displayNumber(analytics?.egfr, 1)}
          suffix=" mL/min/1.73m²"
          statusLevel={analytics?.egfrRisk?.level}
          hint={
            analytics?.egfr
              ? `${analytics?.egfrMethod || ''} ${analytics?.egfrRisk?.label || ''}`.trim()
              : 'Needs Creatinine + Height'
          }
        />
        <InfoCard
          label="Latest Measurement"
          value={analytics?.latest?.dateISO || '—'}
          statusLevel="neutral"
        />
      </div>
    </div>
  );
}

export default PatientHeader;
