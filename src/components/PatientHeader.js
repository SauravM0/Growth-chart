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

function formatAgeYearsMonths(ageYears) {
  if (typeof ageYears !== 'number' || !Number.isFinite(ageYears) || ageYears < 0) {
    return '—';
  }
  const years = Math.floor(ageYears);
  const months = Math.round((ageYears - years) * 12);
  if (months === 12) {
    return `${years + 1}y 0m`;
  }
  return `${years}y ${months}m`;
}

function formatTargetRange(targetRange) {
  if (!targetRange || typeof targetRange.minCm !== 'number' || typeof targetRange.maxCm !== 'number') {
    return '—';
  }
  return `${targetRange.minCm.toFixed(1)} - ${targetRange.maxCm.toFixed(1)} cm`;
}

function centileLabel(centile) {
  if (typeof centile !== 'number' || !Number.isFinite(centile)) {
    return '—';
  }
  return `${centile.toFixed(1)}th`;
}

function centileRiskLabel(centile) {
  if (typeof centile !== 'number' || !Number.isFinite(centile)) {
    return '';
  }
  if (centile < 3) {
    return 'Below 3rd';
  }
  if (centile > 97) {
    return 'Above 97th';
  }
  if (centile < 10 || centile > 90) {
    return 'Watch';
  }
  return 'Expected range';
}

function centileRiskLevel(centile) {
  if (typeof centile !== 'number' || !Number.isFinite(centile)) {
    return 'neutral';
  }
  if (centile < 3 || centile > 97) {
    return 'high';
  }
  if (centile < 10 || centile > 90) {
    return 'watch';
  }
  return 'ok';
}

function PatientHeader({ patient, mphCm, analytics, snapshot }) {
  const targetRangeText =
    typeof mphCm === 'number' ? `${(mphCm - 8.5).toFixed(1)} - ${(mphCm + 8.5).toFixed(1)} cm` : '—';
  const snapshotMph = typeof snapshot?.mph === 'number' ? snapshot.mph : mphCm;
  const bmiHint = typeof snapshot?.bmi === 'number' ? '' : 'Add height/weight to compute BMI';
  const ageHint = snapshot?.latestMeasurement ? (snapshot?.ageYears == null ? 'Add DOB to compute age' : '') : 'Add a measurement to compute age';
  const centileHint = !snapshot?.latestMeasurement
    ? 'Add a measurement to estimate centile'
    : !patient?.dobISO
      ? 'Add DOB to estimate centile'
      : '';
  const bmiCentileHint = typeof snapshot?.estimatedCentiles?.bmi === 'number'
    ? centileRiskLabel(snapshot.estimatedCentiles.bmi)
    : (snapshot?.alerts || []).find((item) => item.toLowerCase().includes('bmi centile')) || 'BMI centile unavailable';

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
          <span className="font-medium">MPH:</span> {displayNumber(snapshotMph)} cm
        </p>
      </div>

      <div className="card-grid">
        <InfoCard
          label="Latest Age"
          value={formatAgeYearsMonths(snapshot?.ageYears)}
          hint={ageHint}
        />
        <InfoCard
          label="Height Centile"
          value={centileLabel(snapshot?.estimatedCentiles?.height)}
          statusLevel={centileRiskLevel(snapshot?.estimatedCentiles?.height)}
          hint={typeof snapshot?.estimatedCentiles?.height === 'number' ? centileRiskLabel(snapshot.estimatedCentiles.height) : centileHint}
        />
        <InfoCard
          label="Weight Centile"
          value={centileLabel(snapshot?.estimatedCentiles?.weight)}
          statusLevel={centileRiskLevel(snapshot?.estimatedCentiles?.weight)}
          hint={typeof snapshot?.estimatedCentiles?.weight === 'number' ? centileRiskLabel(snapshot.estimatedCentiles.weight) : centileHint}
        />
        <InfoCard label="BMI" value={displayNumber(snapshot?.bmi)} suffix=" kg/m²" hint={bmiHint} />
        <InfoCard
          label="BMI Centile"
          value={centileLabel(snapshot?.estimatedCentiles?.bmi)}
          statusLevel={centileRiskLevel(snapshot?.estimatedCentiles?.bmi)}
          hint={bmiCentileHint}
        />
        <InfoCard label="BSA" value={displayNumber(analytics?.bsaM2, 2)} suffix=" m²" />
        <InfoCard label="Height Velocity" value={displayNumber(analytics?.heightVelocity)} suffix=" cm/year" />
        <InfoCard label="Weight Velocity" value={displayNumber(analytics?.weightVelocity)} suffix=" kg/year" />
        <InfoCard
          label="Current vs MPH"
          value={displayNumber(analytics?.mphGapCm)}
          suffix=" cm"
          statusLevel={typeof analytics?.mphGapCm === 'number' && Math.abs(analytics.mphGapCm) > 15 ? 'high' : 'ok'}
        />
        <InfoCard label="MPH" value={displayNumber(snapshotMph)} suffix=" cm" hint={typeof snapshotMph === 'number' ? '' : 'Add mother and father heights'} />
        <InfoCard
          label="Projected Adult Height"
          value={displayNumber(analytics?.projectedAdultHeightCm)}
          suffix=" cm"
        />
        <InfoCard
          label="Target Height Range"
          value={formatTargetRange(snapshot?.targetRange) || targetRangeText}
          hint={snapshot?.targetRange ? '' : 'Needs MPH (mother + father heights)'}
        />
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
          value={snapshot?.latestMeasurement?.dateISO || analytics?.latest?.dateISO || '—'}
          statusLevel="neutral"
        />
      </div>
    </div>
  );
}

export default PatientHeader;
