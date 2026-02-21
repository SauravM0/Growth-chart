import React, { useMemo, useState } from 'react';
import {
  calculateCkdEpi2021Egfr,
  calculateFib4Index,
  calculateSchwartzEgfr,
} from '../utils/clinicalCalculators';
import { computeAgeYears, computeBMI, computeBSA, computeVelocity } from '../utils/derived';
import { validateMeasurementInput } from '../utils/validate';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

function displayNumber(value) {
  return typeof value === 'number' ? value.toFixed(1) : '-';
}

function displayNumberPrecise(value, decimals = 2) {
  return typeof value === 'number' ? value.toFixed(decimals) : '-';
}

function displayWithUnit(value, unit, decimals = 1) {
  return typeof value === 'number' ? `${value.toFixed(decimals)} ${unit}` : '-';
}

function toNullableNumber(value) {
  if (value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function getTrendArrow(value, prevValue) {
  if (typeof value !== 'number' || typeof prevValue !== 'number') {
    return '';
  }
  if (value > prevValue) {
    return '↑';
  }
  if (value < prevValue) {
    return '↓';
  }
  return '';
}

function MeasurementsTable({ measurements, patientDobISO, patientSex, onDelete, onSave }) {
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState({
    dateISO: '',
    heightCm: '',
    weightKg: '',
    astUPerL: '',
    altUPerL: '',
    platelets10e9PerL: '',
    creatinineMgDl: '',
  });
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const sortedMeasurements = useMemo(
    () => [...measurements].sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.createdAt - b.createdAt),
    [measurements]
  );

  if (measurements.length === 0) {
    return <p className="text-sm text-zinc-600">No measurements yet.</p>;
  }

  const startEditing = (measurement) => {
    setEditingId(measurement.id);
    setDraft({
      dateISO: measurement.dateISO || '',
      heightCm: measurement.heightCm ?? '',
      weightKg: measurement.weightKg ?? '',
      astUPerL: measurement.astUPerL ?? '',
      altUPerL: measurement.altUPerL ?? '',
      platelets10e9PerL: measurement.platelets10e9PerL ?? '',
      creatinineMgDl: measurement.creatinineMgDl ?? '',
    });
    setError('');
    setWarning('');
  };

  const cancelEditing = () => {
    setEditingId('');
    setError('');
    setWarning('');
  };

  const handleSave = async () => {
    const payload = {
      dateISO: draft.dateISO,
      heightCm: toNullableNumber(draft.heightCm),
      weightKg: toNullableNumber(draft.weightKg),
      astUPerL: toNullableNumber(draft.astUPerL),
      altUPerL: toNullableNumber(draft.altUPerL),
      platelets10e9PerL: toNullableNumber(draft.platelets10e9PerL),
      creatinineMgDl: toNullableNumber(draft.creatinineMgDl),
    };
    const validation = validateMeasurementInput(payload, patientDobISO);
    if (validation.errors.length) {
      setError(validation.errors.join(' '));
      setWarning(validation.warnings.join(' '));
      return;
    }
    setError('');
    setWarning(validation.warnings.join(' '));
    await onSave(editingId, payload);
    cancelEditing();
  };

  const handleEditorKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Age (years)</TableHead>
            <TableHead>Height (cm)</TableHead>
            <TableHead>Weight (kg)</TableHead>
            <TableHead>BMI</TableHead>
            <TableHead>BSA (m²)</TableHead>
            <TableHead>Height Velocity</TableHead>
            <TableHead>AST</TableHead>
            <TableHead>ALT</TableHead>
            <TableHead>Platelets</TableHead>
            <TableHead>Creatinine</TableHead>
            <TableHead>FIB-4</TableHead>
            <TableHead>eGFR</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMeasurements.map((measurement, index) => {
            const prevMeasurement = index > 0 ? sortedMeasurements[index - 1] : null;
            const isEditing = editingId === measurement.id;
            const heightTrend = getTrendArrow(measurement.heightCm, prevMeasurement?.heightCm);
            const weightTrend = getTrendArrow(measurement.weightKg, prevMeasurement?.weightKg);
            const ageYears = computeAgeYears(patientDobISO, measurement.dateISO);
            const bmiValue = computeBMI(measurement.heightCm, measurement.weightKg);
            const bsaValue = computeBSA(measurement.heightCm, measurement.weightKg);
            const heightVelocity = prevMeasurement ? computeVelocity(prevMeasurement, measurement) : null;
            const fib4Value = calculateFib4Index(ageYears, measurement.astUPerL, measurement.altUPerL, measurement.platelets10e9PerL);
            const egfrValue =
              calculateCkdEpi2021Egfr(ageYears, patientSex, measurement.creatinineMgDl) ??
              calculateSchwartzEgfr(ageYears, measurement.heightCm, measurement.creatinineMgDl);

            return (
              <TableRow key={measurement.id} className={isEditing ? 'bg-zinc-50/70' : ''}>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={draft.dateISO}
                      onChange={(event) => setDraft((prev) => ({ ...prev, dateISO: event.target.value }))}
                      onKeyDown={handleEditorKeyDown}
                      className="h-8 min-w-36"
                    />
                  ) : (
                    measurement.dateISO
                  )}
                </TableCell>
                <TableCell>{displayNumber(ageYears)}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.heightCm}
                      onChange={(event) => setDraft((prev) => ({ ...prev, heightCm: event.target.value }))}
                      onKeyDown={handleEditorKeyDown}
                      className="h-8 w-24"
                    />
                  ) : (
                    `${displayNumber(measurement.heightCm)} ${heightTrend}`
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.weightKg}
                      onChange={(event) => setDraft((prev) => ({ ...prev, weightKg: event.target.value }))}
                      onKeyDown={handleEditorKeyDown}
                      className="h-8 w-24"
                    />
                  ) : (
                    `${displayNumber(measurement.weightKg)} ${weightTrend}`
                  )}
                </TableCell>
                <TableCell>{displayNumber(bmiValue)}</TableCell>
                <TableCell>{displayNumberPrecise(bsaValue)}</TableCell>
                <TableCell>{displayWithUnit(heightVelocity, 'cm/year')}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.astUPerL}
                      onChange={(event) => setDraft((prev) => ({ ...prev, astUPerL: event.target.value }))}
                      onKeyDown={handleEditorKeyDown}
                      className="h-8 w-24"
                    />
                  ) : (
                    displayNumber(measurement.astUPerL)
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.altUPerL}
                      onChange={(event) => setDraft((prev) => ({ ...prev, altUPerL: event.target.value }))}
                      onKeyDown={handleEditorKeyDown}
                      className="h-8 w-24"
                    />
                  ) : (
                    displayNumber(measurement.altUPerL)
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.platelets10e9PerL}
                      onChange={(event) => setDraft((prev) => ({ ...prev, platelets10e9PerL: event.target.value }))}
                      onKeyDown={handleEditorKeyDown}
                      className="h-8 w-28"
                    />
                  ) : (
                    displayNumber(measurement.platelets10e9PerL)
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.creatinineMgDl}
                      onChange={(event) => setDraft((prev) => ({ ...prev, creatinineMgDl: event.target.value }))}
                      onKeyDown={handleEditorKeyDown}
                      className="h-8 w-24"
                    />
                  ) : (
                    displayNumberPrecise(measurement.creatinineMgDl)
                  )}
                </TableCell>
                <TableCell>{displayNumberPrecise(fib4Value)}</TableCell>
                <TableCell>{displayNumberPrecise(egfrValue, 1)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={handleSave} title="Enter">
                          Save
                        </Button>
                        <Button size="sm" variant="secondary" onClick={cancelEditing} title="Esc">
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => startEditing(measurement)}>
                        Edit Row
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => onDelete(measurement.id)}>
                      Delete
                    </Button>
                  </div>
                  {isEditing && error && <p className="mt-1 text-xs text-red-700">{error}</p>}
                  {isEditing && warning && <p className="mt-1 text-xs text-red-700">{warning}</p>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default MeasurementsTable;
