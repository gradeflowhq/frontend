import { Center, Loader } from '@mantine/core';
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Landing page — accessible to everyone */}
          <Route path="/" element={<LandingPage />} />

          {/* Public-only routes (redirect to /assessments if already logged in) */}
          <Route element={<PublicOnlyRoute />}>
            <Route element={<PublicLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
          </Route>

          {/* Protected area with sidebar layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* User settings */}
              <Route path="/settings" element={<UserSettingsPage />} />

              {/* Assessment list */}
              <Route path="/assessments" element={<AssessmentsPage />} />

              {/* Assessment workspace — all sub-routes share AssessmentShell */}
              <Route path="/assessments/:assessmentId" element={<AssessmentShell />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<OverviewPage />} />
                <Route path="submissions" element={<SubmissionsPage />} />
                <Route path="questions" element={<QuestionsPage />} />
                <Route path="rules" element={<RulesPage />} />

                {/* Results — nested under results/ parent */}
                <Route path="results">
                  <Route index element={<Navigate to="statistics" replace />} />
                  <Route path="statistics" element={<StatisticsPage />} />
                  <Route path="statistics/:studentId" element={<SubmissionDetailPage />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="students/:studentId" element={<SubmissionDetailPage />} />
                  <Route path="groups" element={<GroupViewPage />} />
                </Route>

                <Route path="publish" element={<CanvasPushPage />} />
                <Route path="members" element={<MembersPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
