import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { assessmentsListRoute } from '@pages/assessments/list/route';
import { assessmentWorkspaceChildRoutes } from '@pages/assessments/workspace/routes';
import { landingRoute } from '@pages/landing/route';
import { userSettingsRoute } from '@pages/settings/route';

import AppLayout from '../layouts/AppLayout';
import AssessmentShell from '../layouts/AssessmentShell';
import AuthCallback from './routes/AuthCallback';
import ProtectedRoute from './routes/ProtectedRoute';

const router = createBrowserRouter([
  /* Landing page — accessible to everyone */
  landingRoute,

  /* OIDC callback — navigates to /assessments once auth completes */
  { path: '/auth/callback', element: <AuthCallback /> },

  /* Protected area with sidebar layout */
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          userSettingsRoute,
          assessmentsListRoute,

          /* Assessment workspace */
          {
            path: '/assessments/:assessmentId',
            element: <AssessmentShell />,
            children: assessmentWorkspaceChildRoutes,
          },
        ],
      },
    ],
  },

  /* Fallback */
  { path: '*', element: <Navigate to="/" replace /> },
]);

const App: React.FC = () => <RouterProvider router={router} />;

export default App;
