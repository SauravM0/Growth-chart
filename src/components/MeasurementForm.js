import React, { useState } from 'react';
import { validateMeasurementInput } from '../utils/validate';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

function getTodayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function toNullableNumber(value) {
  if (value === '') {
    return null;
  }

  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function MeasurementForm({ patientDobISO, onSubmit }) {
  const [values, setValues] = useState({
    dateISO: getTodayISO(),
    heightCm: '',
    weightKg: '',
    astUPerL: '',
    altUPerL: '',
    platelets10e9PerL: '',
    creatinineMgDl: '',
  });
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [submitError, setSubmitError] = useState('');

  const buildValidation = (nextValues) => {
    const payload = {
      dateISO: nextValues.dateISO,
      heightCm: toNullableNumber(nextValues.heightCm),
      weightKg: toNullableNumber(nextValues.weightKg),
      astUPerL: toNullableNumber(nextValues.astUPerL),
      altUPerL: toNullableNumber(nextValues.altUPerL),
      platelets10e9PerL: toNullableNumber(nextValues.platelets10e9PerL),
      creatinineMgDl: toNullableNumber(nextValues.creatinineMgDl),
    };

    const validation = validateMeasurementInput(payload, patientDobISO);
    const nextErrors = {};
    const nextWarnings = {};

    for (const message of validation.errors) {
      if (message.toLowerCase().includes('date')) {
        nextErrors.dateISO = message;
      } else if (message.toLowerCase().includes('height')) {
        nextErrors.heightCm = message;
      } else if (message.toLowerCase().includes('weight')) {
        nextErrors.weightKg = message;
      } else if (message.toLowerCase().includes('ast')) {
        nextErrors.astUPerL = message;
      } else if (message.toLowerCase().includes('alt')) {
        nextErrors.altUPerL = message;
      } else if (message.toLowerCase().includes('platelet')) {
        nextErrors.platelets10e9PerL = message;
      } else if (message.toLowerCase().includes('creatinine')) {
        nextErrors.creatinineMgDl = message;
      }
    }

    for (const message of validation.warnings) {
      if (message.toLowerCase().includes('height')) {
        nextWarnings.heightCm = message;
      } else if (message.toLowerCase().includes('weight')) {
        nextWarnings.weightKg = message;
      } else if (message.toLowerCase().includes('ast')) {
        nextWarnings.astUPerL = message;
      } else if (message.toLowerCase().includes('alt')) {
        nextWarnings.altUPerL = message;
      } else if (message.toLowerCase().includes('platelet')) {
        nextWarnings.platelets10e9PerL = message;
      } else if (message.toLowerCase().includes('creatinine')) {
        nextWarnings.creatinineMgDl = message;
      }
    }

    return { payload, validation, nextErrors, nextWarnings };
  };

  const handleChange = (field) => (event) => {
    const nextValues = { ...values, [field]: event.target.value };
    setValues(nextValues);
    const { nextErrors, nextWarnings } = buildValidation(nextValues);
    setErrors(nextErrors);
    setWarnings(nextWarnings);
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { payload, validation, nextErrors, nextWarnings } = buildValidation(values);
    if (validation.errors.length > 0) {
      setErrors(nextErrors);
      setWarnings(nextWarnings);
      setSubmitError(validation.errors.join(' '));
      return;
    }

    setErrors({});
    setWarnings(nextWarnings);

    await onSubmit(payload);

    setValues({
      dateISO: getTodayISO(),
      heightCm: '',
      weightKg: '',
      astUPerL: '',
      altUPerL: '',
      platelets10e9PerL: '',
      creatinineMgDl: '',
    });
  };

  return (
    <Card className="border-zinc-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Add Measurement</CardTitle>
        <p className="text-xs text-zinc-500">Keyboard tip: Tab through fields, Enter submits.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>
          )}
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm text-zinc-700">
              Date
              <Input type="date" value={values.dateISO} onChange={handleChange('dateISO')} className="mt-1" autoFocus />
              {errors.dateISO && <span className="mt-1 block text-xs text-red-700">{errors.dateISO}</span>}
            </label>

            <label className="text-sm text-zinc-700">
              Height (cm)
              <Input type="number" step="0.1" value={values.heightCm} onChange={handleChange('heightCm')} className="mt-1" />
              {errors.heightCm && <span className="mt-1 block text-xs text-red-700">{errors.heightCm}</span>}
              {warnings.heightCm && <span className="mt-1 block text-xs text-red-700">{warnings.heightCm}</span>}
            </label>

            <label className="text-sm text-zinc-700">
              Weight (kg)
              <Input type="number" step="0.1" value={values.weightKg} onChange={handleChange('weightKg')} className="mt-1" />
              {errors.weightKg && <span className="mt-1 block text-xs text-red-700">{errors.weightKg}</span>}
              {warnings.weightKg && <span className="mt-1 block text-xs text-red-700">{warnings.weightKg}</span>}
            </label>

            <label className="text-sm text-zinc-700">
              AST (U/L)
              <Input type="number" step="0.1" value={values.astUPerL} onChange={handleChange('astUPerL')} className="mt-1" />
              {errors.astUPerL && <span className="mt-1 block text-xs text-red-700">{errors.astUPerL}</span>}
              {warnings.astUPerL && <span className="mt-1 block text-xs text-red-700">{warnings.astUPerL}</span>}
            </label>

            <label className="text-sm text-zinc-700">
              ALT (U/L)
              <Input type="number" step="0.1" value={values.altUPerL} onChange={handleChange('altUPerL')} className="mt-1" />
              {errors.altUPerL && <span className="mt-1 block text-xs text-red-700">{errors.altUPerL}</span>}
              {warnings.altUPerL && <span className="mt-1 block text-xs text-red-700">{warnings.altUPerL}</span>}
            </label>

            <label className="text-sm text-zinc-700">
              Platelets (x10^9/L)
              <Input
                type="number"
                step="0.1"
                value={values.platelets10e9PerL}
                onChange={handleChange('platelets10e9PerL')}
                className="mt-1"
              />
              {errors.platelets10e9PerL && <span className="mt-1 block text-xs text-red-700">{errors.platelets10e9PerL}</span>}
              {warnings.platelets10e9PerL && <span className="mt-1 block text-xs text-red-700">{warnings.platelets10e9PerL}</span>}
            </label>

            <label className="text-sm text-zinc-700">
              Creatinine (mg/dL)
              <Input
                type="number"
                step="0.01"
                value={values.creatinineMgDl}
                onChange={handleChange('creatinineMgDl')}
                className="mt-1"
              />
              {errors.creatinineMgDl && <span className="mt-1 block text-xs text-red-700">{errors.creatinineMgDl}</span>}
              {warnings.creatinineMgDl && <span className="mt-1 block text-xs text-red-700">{warnings.creatinineMgDl}</span>}
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">Add Measurement</Button>
            <span className="text-xs text-zinc-500">Values are validated before save.</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default MeasurementForm;
