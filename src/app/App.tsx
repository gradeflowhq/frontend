import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AssessmentMembersPage from '@pages/assessments/AssessmentMembersPage';
import AssessmentOverviewPage from '@pages/assessments/AssessmentOverviewPage';
import AssessmentSettingsPage from '@pages/assessments/AssessmentSettingsPage';
import AssessmentsPage from '@pages/assessments/AssessmentsPage';
import QuestionsTabPage from '@pages/assessments/QuestionsTabPage';
import RulesTabPage from '@pages/assessments/RulesTabPage';
import SubmissionsTabPage from '@pages/assessments/SubmissionsTabPage';
import LandingPage from '@pages/LandingPage';
import LoginPage from '@pages/LoginPage';
import RegisterPage from '@pages/RegisterPage';
import CanvasPushPage from '@pages/results/CanvasPushPage';
import GradedSubmissionDetailPage from '@pages/results/GradedSubmissionDetailPage';
import ResultsShellPage from '@pages/results/ResultsShellPage';

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
            {/* Assessment list */}
            <Route path="/assessments" element={<AssessmentsPage />} />

            {/* Assessment workspace — all sub-routes share AssessmentShell */}
            <Route path="/assessments/:assessmentId" element={<AssessmentShell />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AssessmentOverviewPage />} />
              <Route path="submissions" element={<SubmissionsTabPage />} />
              <Route path="questions" element={<QuestionsTabPage />} />
              <Route path="rules" element={<RulesTabPage />} />
              <Route path="results" element={<ResultsShellPage />} />
              <Route path="results/:studentId" element={<GradedSubmissionDetailPage />} />
              <Route path="publish" element={<CanvasPushPage />} />
              <Route path="members" element={<AssessmentMembersPage />} />
              <Route path="settings" element={<AssessmentSettingsPage />} />
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