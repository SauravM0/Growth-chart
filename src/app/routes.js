import React from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import AppShell from './AppShell';
import PatientsPage from '../pages/PatientsPage';
import PatientDetailPage from '../pages/PatientDetailPage';
import CombinedVisualPage from '../pages/CombinedVisualPage';

const router = createBrowserRouter([
  { path: '/visual/combined', element: <CombinedVisualPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/patients" replace /> },
      { path: 'patients', element: <PatientsPage /> },
      { path: 'patients/:id', element: <PatientDetailPage /> },
    ],
  },
]);

export default router;
