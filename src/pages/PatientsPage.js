import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PatientForm from '../components/PatientForm';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tooltip } from '../components/ui/tooltip';
import { createPatient, deletePatientById, listPatients, updatePatientById } from '../services/patientService';

const RECENT_PATIENTS_KEY = 'growth.recentPatients';

function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sexFilter, setSexFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [recentPatients, setRecentPatients] = useState([]);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingDeletePatientId, setPendingDeletePatientId] = useState('');
  const [error, setError] = useState('');

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const [rows, recentRows] = await Promise.all([
        listPatients({ searchQuery, sex: sexFilter, ageGroup: ageGroupFilter }),
        listPatients(),
      ]);
      setPatients(rows);
      let recentIds = [];
      try {
        const raw = window.localStorage.getItem(RECENT_PATIENTS_KEY);
        recentIds = raw ? JSON.parse(raw) : [];
      } catch (_error) {
        recentIds = [];
      }
      const byId = new Map(recentRows.map((row) => [row.id, row]));
      const recent = (Array.isArray(recentIds) ? recentIds : []).map((id) => byId.get(id)).filter(Boolean).slice(0, 6);
      setRecentPatients(recent);
      setError('');
    } catch (err) {
      setError('Failed to load patients.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sexFilter, ageGroupFilter]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const emitPatientsChanged = () => {
    window.dispatchEvent(new Event('patients-updated'));
  };

  const handleCreate = async (payload) => {
    await createPatient(payload);
    setShowAddForm(false);
    await loadPatients();
    emitPatientsChanged();
  };

  const handleUpdate = async (payload) => {
    if (!editingPatient) {
      return;
    }

    await updatePatientById(editingPatient.id, payload);
    setEditingPatient(null);
    await loadPatients();
    emitPatientsChanged();
  };

  const handleDelete = async (id) => {
    await deletePatientById(id);
    await loadPatients();
    emitPatientsChanged();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Patients</h1>
        <Button
          type="button"
          onClick={() => {
            setEditingPatient(null);
            setShowAddForm((prev) => !prev);
          }}
        >
          {showAddForm ? 'Close' : 'Add Patient'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find Patients</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <label className="block text-sm text-zinc-700">
            Search
            <Input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by patient name"
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-zinc-700">
            Sex
            <Select value={sexFilter} onChange={(event) => setSexFilter(event.target.value)} className="mt-1">
              <option value="all">All</option>
              <option value="F">Girls</option>
              <option value="M">Boys</option>
            </Select>
          </label>
          <label className="block text-sm text-zinc-700">
            Age Group
            <Select value={ageGroupFilter} onChange={(event) => setAgeGroupFilter(event.target.value)} className="mt-1">
              <option value="all">All</option>
              <option value="0-2">0-2 years</option>
              <option value="2-5">2-5 years</option>
              <option value="5-10">5-10 years</option>
              <option value="10-18">10-18 years</option>
            </Select>
          </label>
        </CardContent>
      </Card>

      {recentPatients.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Patients</CardTitle>
            <Badge>{recentPatients.length}</Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {recentPatients.map((patient) => (
              <Tooltip key={`recent-${patient.id}`} text="Open recently viewed patient">
                <Link
                  to={`/patients/${patient.id}`}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
                >
                  {patient.name || 'Unnamed Patient'}
                </Link>
              </Tooltip>
            ))}
          </CardContent>
        </Card>
      )}

      {showAddForm && !editingPatient && (
        <PatientForm onSubmit={handleCreate} onCancel={() => setShowAddForm(false)} submitLabel="Create Patient" />
      )}

      {editingPatient && (
        <PatientForm
          initialValues={editingPatient}
          onSubmit={handleUpdate}
          onCancel={() => setEditingPatient(null)}
          submitLabel="Save Changes"
        />
      )}

      {loading && <p className="text-sm text-zinc-600">Loading patients...</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sex</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-4 text-zinc-600">
                    No patients found.
                  </TableCell>
                </TableRow>
              )}

              {patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>{patient.name || 'Unnamed Patient'}</TableCell>
                  <TableCell>{patient.sex}</TableCell>
                  <TableCell>{patient.dobISO}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Tooltip text="Open full patient record">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-800 hover:bg-zinc-50"
                        >
                          Open
                        </Link>
                      </Tooltip>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingPatient(patient);
                        }}
                      >
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => setPendingDeletePatientId(patient.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(pendingDeletePatientId)} onOpenChange={(open) => !open && setPendingDeletePatientId('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient?</DialogTitle>
            <DialogDescription>This will remove the patient and all measurements from offline storage.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingDeletePatientId('')}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await handleDelete(pendingDeletePatientId);
                setPendingDeletePatientId('');
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default PatientsPage;
