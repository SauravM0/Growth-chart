import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CombinedIapChart from '../chart/combined/CombinedIapChart';
import CombinedPrintSheet from '../components/CombinedPrintSheet';
import MeasurementForm from '../components/MeasurementForm';
import MeasurementsTable from '../components/MeasurementsTable';
import PatientHeader from '../components/PatientHeader';
import PinSettingsPanel from '../components/PinSettingsPanel';
import PrintView from '../components/PrintView';
import TabsBar from '../components/TabsBar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Tooltip } from '../components/ui/tooltip';
import { getChartThemeForSex, getDatasetForSex } from '../data/datasets';
import {
  createMeasurement,
  deleteMeasurementById,
  exportMeasurementsCsv,
  listMeasurementsByPatient,
  updateMeasurementById,
} from '../services/measurementService';
import {
  exportFullBackup,
  exportPatientBackup,
  getPatientById,
  importBackupJson,
} from '../services/patientService';
import { getAppSetting, setAppSetting } from '../services/settingsService';
import { computeMPH, computeWarnings } from '../utils/derived';
import { getPatientAnalytics } from '../utils/growthAnalytics';

const RECENT_PATIENTS_KEY = 'growth.recentPatients';
const NOTES_PREFIX = 'patient.notes.';
const COMBINED_IAP_MODE = 'combined-iap';
const VIEW_MODES = new Set([COMBINED_IAP_MODE]);

function downloadFile(filename, content, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadJson(filename, data) {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json');
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-black" />
    </label>
  );
}

function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const importInputRef = useRef(null);

  const [patient, setPatient] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showCombinedValues, setShowCombinedValues] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [notes, setNotes] = useState('');
  const [auditWarning, setAuditWarning] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [patientRow, measurementRows] = await Promise.all([
        getPatientById(id),
        listMeasurementsByPatient(id),
      ]);
      setPatient(patientRow || null);
      setMeasurements(measurementRows);
      setError('');
    } catch (err) {
      setError('Failed to load patient details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!patient) {
      return;
    }

    let active = true;

    const loadChartSettings = async () => {
      const savedNotes = await getAppSetting(`${NOTES_PREFIX}${id}`, '');

      if (!active) {
        return;
      }

      setNotes(savedNotes || '');
    };

    loadChartSettings();

    return () => {
      active = false;
    };
  }, [patient, id]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    let parsed = [];
    try {
      const raw = window.localStorage.getItem(RECENT_PATIENTS_KEY);
      parsed = raw ? JSON.parse(raw) : [];
    } catch (_error) {
      parsed = [];
    }
    const existing = Array.isArray(parsed) ? parsed.filter((item) => item !== id) : [];
    const next = [id, ...existing].slice(0, 8);
    window.localStorage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('recent-patients-updated'));
  }, [id]);

  const refreshMeasurements = async () => {
    const measurementRows = await listMeasurementsByPatient(id);
    setMeasurements(measurementRows);
  };

  const handleAddMeasurement = async (payload) => {
    const result = await createMeasurement(id, payload, patient?.dobISO || '');
    setAuditWarning(result.warnings?.join(' ') || '');
    await refreshMeasurements();
  };

  const handleSaveMeasurement = async (measurementId, payload) => {
    const result = await updateMeasurementById(measurementId, payload, patient?.dobISO || '');
    setAuditWarning(result?.warnings?.join(' ') || '');
    await refreshMeasurements();
  };

  const handleDeleteMeasurement = async (measurementId) => {
    await deleteMeasurementById(measurementId);
    await refreshMeasurements();
  };

  const handleSaveNotes = async () => {
    await setAppSetting(`${NOTES_PREFIX}${id}`, notes);
  };

  const handleExport = async (event) => {
    const format = event.target.value;
    if (!format) {
      return;
    }

    if (format === 'json-patient') {
      const payload = await exportPatientBackup(id);
      downloadJson(`${patient?.name || 'patient'}-backup.json`, payload);
    }

    if (format === 'json-full') {
      const payload = await exportFullBackup();
      downloadJson(`growth-clinic-full-backup.json`, payload);
    }

    if (format === 'csv') {
      const csv = await exportMeasurementsCsv(id);
      downloadFile(`${patient?.name || 'patient'}-measurements.csv`, csv, 'text/csv;charset=utf-8');
    }

    if (format === 'pdf') {
      window.alert('PDF export is not yet implemented. Use Print for now.');
    }

    event.target.value = '';
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      await importBackupJson(text);
      await loadData();
      window.dispatchEvent(new Event('patients-updated'));
      setAuditWarning('Import completed successfully.');
    } catch (_error) {
      setAuditWarning('Import failed. Check JSON format and schema.');
    } finally {
      event.target.value = '';
    }
  };

  const handleLock = () => {
    window.dispatchEvent(new Event('pin-lock'));
  };

  const handlePrintA4 = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handlePinChanged = () => {
    window.dispatchEvent(new Event('pin-updated'));
  };

  const mphCm = useMemo(
    () => computeMPH(patient?.sex, patient?.motherHeightCm, patient?.fatherHeightCm),
    [patient?.sex, patient?.motherHeightCm, patient?.fatherHeightCm]
  );
  const derivedWarnings = useMemo(
    () => computeWarnings(patient || {}, measurements),
    [patient, measurements]
  );

  const selectedDataset = useMemo(() => getDatasetForSex(patient?.sex), [patient?.sex]);
  const chartTheme = useMemo(() => getChartThemeForSex(patient?.sex), [patient?.sex]);
  const analytics = useMemo(
    () =>
      getPatientAnalytics({
        patient,
        measurements,
        dataset: selectedDataset,
        mphCm,
      }),
    [patient, measurements, selectedDataset, mphCm]
  );

  const combinedIapLabel = patient?.sex === 'M'
    ? 'Boys 0–18 Combined (WHO2006+IAP2015)'
    : 'Girls 0–18 Combined (WHO2006+IAP2015)';
  const isCombinedIapMode = VIEW_MODES.has(COMBINED_IAP_MODE);

  const topBar = (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isOnline ? 'success' : 'warning'}>{isOnline ? 'Online' : 'Offline'}</Badge>
        <Badge>Dataset: {selectedDataset?.label || 'None'} ({patient?.sex === 'M' ? 'Boys' : 'Girls'})</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip text="Preview patient handout before printing">
          <Button type="button" variant="secondary" onClick={() => setShowPrintPreview((prev) => !prev)}>
            {showPrintPreview ? 'Hide Print Preview' : 'Print Preview'}
          </Button>
        </Tooltip>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          Print
        </Button>
        <Select
          onChange={handleExport}
          defaultValue=""
          className="w-auto min-w-40"
        >
          <option value="">Export</option>
          <option value="json-patient">JSON (patient)</option>
          <option value="json-full">JSON (full backup)</option>
          <option value="csv">CSV (measurements)</option>
          <option value="pdf">PDF (later)</option>
        </Select>
        <Button type="button" variant="secondary" onClick={handleImportClick}>
          Import JSON
        </Button>
        <Input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleLock}
          aria-label="Lock with PIN"
          title="Lock with PIN"
        >
          Lock
        </Button>
      </div>
    </div>
  );

  const tabs = {
    Measurements: (
      <div className="space-y-4">
        {auditWarning && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {auditWarning}
          </div>
        )}
        <MeasurementForm patientDobISO={patient?.dobISO || ''} onSubmit={handleAddMeasurement} />
        <MeasurementsTable
          measurements={measurements}
          patientDobISO={patient?.dobISO || ''}
          patientSex={patient?.sex || 'F'}
          onDelete={handleDeleteMeasurement}
          onSave={handleSaveMeasurement}
        />
      </div>
    ),
    Charts: (
      <div className="space-y-4">
        <div className="no-print space-y-2">
          <p className="text-sm font-medium text-zinc-800">{combinedIapLabel}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full max-w-xs">
              <ToggleRow
                label="Show values"
                checked={showCombinedValues}
                onChange={(event) => setShowCombinedValues(event.target.checked)}
              />
            </div>
            <Button type="button" variant="secondary" onClick={handlePrintA4}>
              Print A4
            </Button>
            <Button type="button" variant="secondary" onClick={handleDownloadPdf}>
              Download PDF
            </Button>
          </div>
        </div>

        <div className={`w-full rounded-lg border p-2 ${chartTheme.wrapperClassName}`}>
          <div className="chart-stage mx-auto w-full">
            <CombinedIapChart
              sex={patient?.sex}
              measurements={measurements}
              dobISO={patient?.dobISO}
              showValues={showCombinedValues}
              className="w-full"
            />
          </div>
        </div>
      </div>
    ),
    Notes: (
      <div className="space-y-4">
        <label className="block text-sm text-zinc-700">
          Clinical notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={handleSaveNotes}
            rows={8}
            placeholder="Optional notes..."
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 focus:border-black focus:ring-2 focus:ring-emerald-700/20"
          />
        </label>
        <Button type="button" onClick={handleSaveNotes}>
          Save Notes
        </Button>
      </div>
    ),
    Settings: (
      <div className="space-y-4">
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700">
            <p>This build uses Custom Datasets provided by the clinic/organization.</p>
            <p>Clinical validation is the responsibility of the deploying organization.</p>
            <a
              href="/THIRD_PARTY_NOTICES.md"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              View third-party notices
            </a>
          </CardContent>
        </Card>
        <PinSettingsPanel onPinChanged={handlePinChanged} />
      </div>
    ),
  };

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading patient...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (!patient) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Patient Not Found</h1>
        <p className="text-sm text-zinc-600">This patient may have been deleted.</p>
        <Button type="button" onClick={() => navigate('/patients')}>
          Back to Patients
        </Button>
      </section>
    );
  }

  return (
    <section>
      {topBar}
      <PatientHeader patient={patient} mphCm={mphCm} analytics={analytics} />
      <section className="no-print mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
        <h3 className="text-sm font-semibold text-amber-900">Warnings</h3>
        {derivedWarnings.length === 0 ? (
          <p className="mt-1 text-sm text-amber-800">No data quality warnings.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {derivedWarnings.map((warning) => (
              <li key={`${warning.code}-${warning.measurementIds.join('-')}`}>{warning.message}</li>
            ))}
          </ul>
        )}
      </section>
      <TabsBar
        tabs={['Measurements', 'Charts', 'Notes', 'Settings']}
        defaultTab="Measurements"
        panels={tabs}
      />
      {showPrintPreview && (
        <div className="no-print mt-4">
          {isCombinedIapMode ? (
            <CombinedPrintSheet
              sex={patient?.sex}
              measurements={measurements}
              dobISO={patient?.dobISO}
            />
          ) : (
            <PrintView
              patient={patient}
              dataset={selectedDataset}
              measurements={measurements}
              mphCm={mphCm}
              chartTheme={chartTheme}
              warnings={derivedWarnings}
              clinicName="Growth Clinic"
              appName="Growth Chart App"
              datasetId={selectedDataset?.id}
            />
          )}
        </div>
      )}
      <div className="print-only mt-4">
        {isCombinedIapMode ? (
          <CombinedPrintSheet
            sex={patient?.sex}
            measurements={measurements}
            dobISO={patient?.dobISO}
          />
        ) : (
          <PrintView
            patient={patient}
            dataset={selectedDataset}
            measurements={measurements}
            mphCm={mphCm}
            chartTheme={chartTheme}
            warnings={derivedWarnings}
            clinicName="Growth Clinic"
            appName="Growth Chart App"
            datasetId={selectedDataset?.id}
          />
        )}
      </div>
    </section>
  );
}

export default PatientDetailPage;
