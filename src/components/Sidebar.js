import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { listPatients } from '../services/patientService';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select } from './ui/select';

const RECENT_PATIENTS_KEY = 'growth.recentPatients';

function Sidebar() {
  const [allPatients, setAllPatients] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sexFilter, setSexFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [recentPatientIds, setRecentPatientIds] = useState([]);

  const loadPatients = useCallback(async () => {
    const [allRows, filteredRows] = await Promise.all([
      listPatients(),
      listPatients({
        searchQuery,
        sex: sexFilter,
        ageGroup: ageGroupFilter,
      }),
    ]);
    setAllPatients(Array.isArray(allRows) ? allRows : []);
    setPatients(Array.isArray(filteredRows) ? filteredRows : []);
  }, [searchQuery, sexFilter, ageGroupFilter]);

  const loadRecentPatients = () => {
    let parsed = [];
    try {
      const raw = window.localStorage.getItem(RECENT_PATIENTS_KEY);
      parsed = raw ? JSON.parse(raw) : [];
    } catch (error) {
      parsed = [];
    }
    setRecentPatientIds(Array.isArray(parsed) ? parsed : []);
  };

  useEffect(() => {
    loadPatients();
    loadRecentPatients();

    const onPatientsUpdated = () => {
      loadPatients();
    };
    const onRecentPatientsUpdated = () => {
      loadRecentPatients();
    };

    window.addEventListener('patients-updated', onPatientsUpdated);
    window.addEventListener('recent-patients-updated', onRecentPatientsUpdated);
    return () => {
      window.removeEventListener('patients-updated', onPatientsUpdated);
      window.removeEventListener('recent-patients-updated', onRecentPatientsUpdated);
    };
  }, [loadPatients]);

  const recentPatients = useMemo(() => {
    if (!recentPatientIds.length) {
      return [];
    }
    const patientById = new Map(allPatients.map((patient) => [patient.id, patient]));
    return recentPatientIds.map((id) => patientById.get(id)).filter(Boolean).slice(0, 6);
  }, [allPatients, recentPatientIds]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-zinc-200 bg-white p-4">
      <div className="mb-5">
        <Link to="/patients" className="text-lg font-semibold text-zinc-900">
          Growth Chart Clinic
        </Link>
        <p className="mt-1 text-xs text-zinc-500">Patient quick navigation</p>
      </div>

      <div className="mb-2">
        <Input
          placeholder="Search patients (fuzzy)"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="h-9"
        />
      </div>

      <div className="mb-4 grid gap-2">
        <Select
          value={sexFilter}
          onChange={(event) => setSexFilter(event.target.value)}
          className="h-9"
        >
          <option value="all">All sexes</option>
          <option value="F">Girls</option>
          <option value="M">Boys</option>
        </Select>

        <Select
          value={ageGroupFilter}
          onChange={(event) => setAgeGroupFilter(event.target.value)}
          className="h-9"
        >
          <option value="all">All age groups</option>
          <option value="0-2">0-2 years</option>
          <option value="2-5">2-5 years</option>
          <option value="5-10">5-10 years</option>
          <option value="10-18">10-18 years</option>
        </Select>
      </div>

      <Link
        to="/patients"
        className="mb-4 block w-full rounded-md border border-black bg-black px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-900"
      >
        Add Patient
      </Link>

      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Patients</h3>
          <Badge>{patients.length}</Badge>
        </div>
        <div className="max-h-[38vh] space-y-1 overflow-y-auto">
          {patients.length === 0 && <p className="px-1 text-sm text-zinc-500">No patients yet</p>}

          {patients.slice(0, 12).map((patient) => (
            <NavLink
              key={patient.id}
              to={`/patients/${patient.id}`}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-black text-white' : 'text-zinc-700 hover:bg-zinc-100'
                }`
              }
            >
              {patient.name || 'Unnamed Patient'}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="mt-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2">
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Recently Opened
        </h3>
        <div className="space-y-1">
          {recentPatients.length === 0 && <p className="px-1 text-sm text-zinc-500">No recent patients</p>}

          {recentPatients.map((patient) => (
            <NavLink
              key={`recent-${patient.id}`}
              to={`/patients/${patient.id}`}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-black text-white' : 'text-zinc-700 hover:bg-zinc-100'
                }`
              }
            >
              {patient.name || 'Unnamed Patient'}
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
