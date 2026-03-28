import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AssessmentShellPage from '@pages/assessments/AssessmentShellPage';
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

import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';
import ProtectedLayout from '../layouts/ProtectedLayout';
import PublicLayout from '../layouts/PublicLayout';

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

        {/* Protected area with layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route path="/assessments" element={<AssessmentsPage />} />

            {/* Assessment shell with nested tab routes */}
            <Route path="/assessments/:assessmentId" element={<AssessmentShellPage />}>
              <Route index element={<Navigate to="submissions" replace />} />
              <Route path="submissions" element={<SubmissionsTabPage />} />
              <Route path="questions" element={<QuestionsTabPage />} />
              <Route path="rules" element={<RulesTabPage />} />
            </Route>

            <Route path="/results/:assessmentId" element={<ResultsShellPage />} />
            <Route path="/results/:assessmentId/:studentId" element={<GradedSubmissionDetailPage />} />
            <Route path="/results/:assessmentId/canvas" element={<CanvasPushPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;