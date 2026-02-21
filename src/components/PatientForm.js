import React, { useState } from 'react';
import { validatePatientInput } from '../utils/validate';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';

function toNullableNumber(value) {
  if (value === '') {
    return null;
  }

  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function PatientForm({ initialValues, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [values, setValues] = useState({
    name: initialValues?.name || '',
    sex: initialValues?.sex || 'F',
    dobISO: initialValues?.dobISO || '',
    motherHeightCm:
      initialValues?.motherHeightCm === null || initialValues?.motherHeightCm === undefined
        ? ''
        : String(initialValues.motherHeightCm),
    fatherHeightCm:
      initialValues?.fatherHeightCm === null || initialValues?.fatherHeightCm === undefined
        ? ''
        : String(initialValues.fatherHeightCm),
    heightCm:
      initialValues?.heightCm === null || initialValues?.heightCm === undefined
        ? ''
        : String(initialValues.heightCm),
    weightKg:
      initialValues?.weightKg === null || initialValues?.weightKg === undefined
        ? ''
        : String(initialValues.weightKg),
  });
  const [errors, setErrors] = useState([]);

  const handleChange = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validation = validatePatientInput(values);
    if (validation.errors.length > 0) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);

    await onSubmit({
      name: values.name.trim(),
      sex: values.sex,
      dobISO: values.dobISO,
      motherHeightCm: toNullableNumber(values.motherHeightCm),
      fatherHeightCm: toNullableNumber(values.fatherHeightCm),
      heightCm: toNullableNumber(values.heightCm),
      weightKg: toNullableNumber(values.weightKg),
    });
  };

  return (
    <Card className="border-zinc-200">
      <CardHeader>
        <CardTitle>Patient Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">

          {errors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errors.join(' ')}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-zinc-700">
              Name
              <Input type="text" value={values.name} onChange={handleChange('name')} className="mt-1" />
            </label>

            <label className="text-sm text-zinc-700">
              Sex
              <Select value={values.sex} onChange={handleChange('sex')} className="mt-1">
                <option value="F">F</option>
                <option value="M">M</option>
              </Select>
            </label>

        <label className="text-sm text-zinc-700">
          Date of Birth *
          <Input
            type="date"
            value={values.dobISO}
            onChange={handleChange('dobISO')}
            className="mt-1"
          />
        </label>

        <label className="text-sm text-zinc-700">
          Mother Height (cm)
          <Input
            type="number"
            step="0.1"
            value={values.motherHeightCm}
            onChange={handleChange('motherHeightCm')}
            className="mt-1"
          />
        </label>

        <label className="text-sm text-zinc-700">
          Father Height (cm)
          <Input
            type="number"
            step="0.1"
            value={values.fatherHeightCm}
            onChange={handleChange('fatherHeightCm')}
            className="mt-1"
          />
        </label>

        <label className="text-sm text-zinc-700">
          Patient Height (cm)
          <Input
            type="number"
            step="0.1"
            value={values.heightCm}
            onChange={handleChange('heightCm')}
            className="mt-1"
          />
        </label>

        <label className="text-sm text-zinc-700">
          Patient Weight (kg)
          <Input
            type="number"
            step="0.1"
            value={values.weightKg}
            onChange={handleChange('weightKg')}
            className="mt-1"
          />
        </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit">{submitLabel}</Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default PatientForm;
