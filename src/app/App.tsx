import { Center, Loader } from '@mantine/core';
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
const AssessmentsPage = lazy(() => import('@pages/assessments/list/AssessmentsPage'));
const MembersPage = lazy(() => import('@pages/assessments/workspace/MembersPage'));
const OverviewPage = lazy(() => import('@pages/assessments/workspace/OverviewPage'));
const QuestionsPage = lazy(() => import('@pages/assessments/workspace/QuestionsPage'));
const RulesPage = lazy(() => import('@pages/assessments/workspace/RulesPage'));
const SettingsPage = lazy(() => import('@pages/assessments/workspace/SettingsPage'));
const SubmissionsPage = lazy(() => import('@pages/assessments/workspace/SubmissionsPage'));
const LoginPage = lazy(() => import('@pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'));
const LandingPage = lazy(() => import('@pages/landing/LandingPage'));
const CanvasPushPage = lazy(() => import('@pages/results/CanvasPushPage'));
const GroupViewPage = lazy(() => import('@pages/results/GroupViewPage'));
const StatisticsPage = lazy(() => import('@pages/results/StatisticsPage'));
const StudentsPage = lazy(() => import('@pages/results/StudentsPage'));
const SubmissionDetailPage = lazy(() => import('@pages/results/SubmissionDetailPage'));
const UserSettingsPage = lazy(() => import('@pages/settings/UserSettingsPage'));

import AppLayout from '../layouts/AppLayout';
import AssessmentShell from '../layouts/AssessmentShell';
import PublicLayout from '../layouts/PublicLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';

const PageFallback: React.FC = () => (
  <Center style={{ minHeight: '60vh' }}>
    <Loader color="blue" />
  </Center>
);

const router = createBrowserRouter([
  /* Landing page — accessible to everyone */
  { path: '/', element: <LandingPage /> },

  /* Public-only routes (redirect if already logged in) */
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
    ],
  },

  /* Protected area with sidebar layout */
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/settings', element: <UserSettingsPage /> },
          { path: '/assessments', element: <AssessmentsPage /> },

          /* Assessment workspace */
          {
            path: '/assessments/:assessmentId',
            element: <AssessmentShell />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: 'overview', element: <OverviewPage /> },
              { path: 'submissions', element: <SubmissionsPage /> },
              { path: 'questions', element: <QuestionsPage /> },
              { path: 'rules', element: <RulesPage /> },

              /* Results — nested under results/ */
              {
                path: 'results',
                children: [
                  { index: true, element: <Navigate to="statistics" replace /> },
                  { path: 'statistics', element: <StatisticsPage /> },
                  { path: 'students', element: <StudentsPage /> },
                  { path: 'students/:studentId', element: <SubmissionDetailPage /> },
                  { path: 'groups', element: <GroupViewPage /> },
                ],
              },

              { path: 'publish', element: <CanvasPushPage /> },
              { path: 'members', element: <MembersPage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  /* Fallback */
  { path: '*', element: <Navigate to="/" replace /> },
]);

const App: React.FC = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
};

export default App;
