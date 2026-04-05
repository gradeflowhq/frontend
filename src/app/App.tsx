import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AssessmentsPage from '@pages/assessments/list/AssessmentsPage';
import MembersPage from '@pages/assessments/workspace/MembersPage';
import OverviewPage from '@pages/assessments/workspace/OverviewPage';
import QuestionsPage from '@pages/assessments/workspace/QuestionsPage';
import RulesPage from '@pages/assessments/workspace/RulesPage';
import SettingsPage from '@pages/assessments/workspace/SettingsPage';
import SubmissionsPage from '@pages/assessments/workspace/SubmissionsPage';
import LoginPage from '@pages/auth/LoginPage';
import RegisterPage from '@pages/auth/RegisterPage';
import LandingPage from '@pages/landing/LandingPage';
import CanvasPushPage from '@pages/results/CanvasPushPage';
import ResultsPage from '@pages/results/ResultsPage';
import SubmissionDetailPage from '@pages/results/SubmissionDetailPage';
import UserSettingsPage from '@pages/settings/UserSettingsPage';

import AppLayout from '../layouts/AppLayout';
import PublicLayout from '../layouts/PublicLayout';
import AssessmentShell from './routes/AssessmentShell';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';

const App: React.FC = () => {
  return (
    <BrowserRouter>
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
              <Route path="results" element={<ResultsPage />} />
              <Route path="results/:studentId" element={<SubmissionDetailPage />} />
              <Route path="publish" element={<CanvasPushPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;