import { createBrowserRouter, Navigate, Outlet } from 'react-router';

import MainLayout from '../components/layout/MainLayout';
import { getStoredUser } from '../services/authApi';
import LandingPage from '../pages/LandingPage';

// Auth pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import GoogleCallbackPage from '../pages/auth/GoogleCallbackPage';

// Common pages
import ProfilePage from '../pages/common/ProfilePage';
import SettingsPage from '../pages/common/SettingsPage';
import NotificationsPage from '../pages/common/NotificationsPage';
import NotFoundPage from '../pages/common/NotFoundPage';
import RouteErrorPage from '../pages/common/RouteErrorPage';
import PaymentReturnPage from '../pages/common/PaymentReturnPage';

// Mangaka pages
import DashboardPage from '../pages/mangaka/DashboardPage';
import SeriesListPage from '../pages/mangaka/SeriesListPage';
import CreateSeriesPage from '../pages/mangaka/CreateSeriesPage';
import EditSeriesPage from '../pages/mangaka/EditSeriesPage';
import SeriesDetailPage from '../pages/mangaka/SeriesDetailPage';
import ChapterListPage from '../pages/mangaka/ChapterListPage';
import CreateChapterPage from '../pages/mangaka/CreateChapterPage';
import ChapterDetailPage from '../pages/mangaka/ChapterDetailPage';
import WorkspacePage from '../pages/mangaka/WorkspacePage';
import TaskManagementPage from '../pages/mangaka/TaskManagementPage';
import TaskReviewPage from '../pages/mangaka/TaskReviewPage';
import SeriesRankingPage from '../pages/mangaka/SeriesRankingPage';
import SubmissionHistoryPage from '../pages/mangaka/SubmissionHistoryPage';
import RankingOverviewPage from '../pages/mangaka/RankingOverviewPage';
import ChaptersOverviewPage from '../pages/mangaka/ChaptersOverviewPage';
import AssistantsPage from '../pages/mangaka/AssistantsPage';
import SeriesReaderPage from '../pages/mangaka/SeriesReaderPage';

// Assistant pages
import AssistantDashboardPage from '../pages/assistant/AssistantDashboardPage';
import MyTasksPage from '../pages/assistant/MyTasksPage';
import TaskDetailPage from '../pages/assistant/TaskDetailPage';
import SubmitResultPage from '../pages/assistant/SubmitResultPage';
import RevisionTasksPage from '../pages/assistant/RevisionTasksPage';
import ApprovedTasksPage from '../pages/assistant/ApprovedTasksPage';
import IncomePage from '../pages/assistant/IncomePage';
import WorkCalendarPage from '../pages/assistant/WorkCalendarPage';
import StudioInvitationsPage from '../pages/assistant/StudioInvitationsPage';

// Editor pages
import EditorDashboardPage from '../pages/editor/EditorDashboardPage';
import AssignedSeriesPage from '../pages/editor/AssignedSeriesPage';
import ChapterReviewsPage from '../pages/editor/ChapterReviewsPage';
import RankingWatchPage from '../pages/editor/RankingWatchPage';
import SeriesDefensePage from '../pages/editor/SeriesDefensePage';
import ChapterReviewPage from '../pages/editor/ChapterReviewPage';
import EditorStudioPage from '../pages/editor/EditorStudioPage';

// Admin pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import UserManagementPage from '../pages/admin/UserManagementPage';
import CreateUserPage from '../pages/admin/CreateUserPage';
import UserDetailPage from '../pages/admin/UserDetailPage';
import EditUserPage from '../pages/admin/EditUserPage';
import RoleManagementPage from '../pages/admin/RoleManagementPage';
import SystemActivityPage from '../pages/admin/SystemActivityPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';
import AdminSeriesPage from '../pages/admin/AdminSeriesPage';
import AdminPayrollPage from '../pages/admin/AdminPayrollPage';
import AdminTaskPricingPage from '../pages/admin/AdminTaskPricingPage';

// Board pages
import BoardDashboardPage from '../pages/board/BoardDashboardPage';
import BoardSubmissionsPage from '../pages/board/BoardSubmissionsPage';
import SubmissionDetailPage from '../pages/board/SubmissionDetailPage';
import BoardApprovedSeriesPage from '../pages/board/BoardApprovedSeriesPage';
import ApprovedSeriesDetailPage from '../pages/board/ApprovedSeriesDetailPage';
import PublishingSchedulePage from '../pages/board/PublishingSchedulePage';
import ScheduleSeriesDetailPage from '../pages/board/ScheduleSeriesDetailPage';
import VoteInputPage from '../pages/board/VoteInputPage';
import BoardRankingPage from '../pages/board/BoardRankingPage';
import SeriesDecisionPage from '../pages/board/SeriesDecisionPage';
import SeriesDecisionDetailPage from '../pages/board/SeriesDecisionDetailPage';
import BoardReportsPage from '../pages/board/BoardReportsPage';

function RootRedirect() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hasSupabaseAuthHash =
    hashParams.has('access_token') ||
    hashParams.has('refresh_token') ||
    hashParams.has('error');

  if (hasSupabaseAuthHash) return <GoogleCallbackPage />;

  const user = getStoredUser();
  if (!user) return <LandingPage />;

  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'assistant') return <Navigate to="/assistant/dashboard" replace />;
  if (user.role === 'editor') return <Navigate to="/editor/dashboard" replace />;
  if (user.role === 'board') return <Navigate to="/board/dashboard" replace />;
  return <Navigate to="/mangaka/dashboard" replace />;
}

function roleHome(role: string): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'assistant') return '/assistant/dashboard';
  if (role === 'editor') return '/editor/dashboard';
  if (role === 'board') return '/board/dashboard';
  return '/mangaka/dashboard';
}

function RoleOnlyRoutes({ allow }: { allow: Array<'mangaka' | 'assistant' | 'editor' | 'board' | 'admin'> }) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <Outlet />;
}

function BoardOnlyRoutes() {
  return <RoleOnlyRoutes allow={['board']} />;
}

export const router = createBrowserRouter([
  // Root: landing page for guests, dashboard redirect for logged-in users
  { path: '/', element: <RootRedirect /> },

  // Auth routes (no layout)
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/auth/google/callback', element: <GoogleCallbackPage /> },

  // Protected routes with MainLayout
  {
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      // Common
      { path: '/profile', element: <ProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/payment-return', element: <PaymentReturnPage /> },

      // Mangaka
      {
        element: <RoleOnlyRoutes allow={['mangaka']} />,
        children: [
          { path: '/mangaka/dashboard', element: <DashboardPage /> },
          { path: '/mangaka/series', element: <SeriesListPage /> },
          { path: '/mangaka/series/create', element: <CreateSeriesPage /> },
          { path: '/mangaka/series/:seriesId/edit', element: <EditSeriesPage /> },
          { path: '/mangaka/series/:seriesId', element: <SeriesDetailPage /> },
          { path: '/mangaka/series/:seriesId/read', element: <SeriesReaderPage /> },
          { path: '/mangaka/series/:seriesId/chapters', element: <ChapterListPage /> },
          { path: '/mangaka/series/:seriesId/chapters/create', element: <CreateChapterPage /> },
          { path: '/mangaka/series/:seriesId/ranking', element: <SeriesRankingPage /> },
          { path: '/mangaka/chapters', element: <ChaptersOverviewPage /> },
          { path: '/mangaka/chapters/:chapterId', element: <ChapterDetailPage /> },
          { path: '/mangaka/pages/:pageId/workspace', element: <WorkspacePage /> },
          { path: '/mangaka/tasks', element: <TaskManagementPage /> },
          { path: '/mangaka/tasks/:taskId/review', element: <TaskReviewPage /> },
          { path: '/mangaka/assistants', element: <AssistantsPage /> },
          { path: '/mangaka/submissions', element: <SubmissionHistoryPage /> },
          { path: '/mangaka/ranking', element: <RankingOverviewPage /> },
        ],
      },

      // Assistant
      {
        element: <RoleOnlyRoutes allow={['assistant']} />,
        children: [
          { path: '/assistant/dashboard', element: <AssistantDashboardPage /> },
          { path: '/assistant/tasks', element: <MyTasksPage /> },
          { path: '/assistant/tasks/:taskId', element: <TaskDetailPage /> },
          { path: '/assistant/tasks/:taskId/submit', element: <SubmitResultPage /> },
          { path: '/assistant/revisions', element: <RevisionTasksPage /> },
          { path: '/assistant/approved', element: <ApprovedTasksPage /> },
          { path: '/assistant/income', element: <IncomePage /> },
          { path: '/assistant/calendar', element: <WorkCalendarPage /> },
          { path: '/assistant/invitations', element: <StudioInvitationsPage /> },
        ],
      },

      // Editor
      {
        element: <RoleOnlyRoutes allow={['editor']} />,
        children: [
          { path: '/editor/dashboard', element: <EditorDashboardPage /> },
          { path: '/editor/series', element: <AssignedSeriesPage /> },
          { path: '/editor/studio', element: <EditorStudioPage /> },
          { path: '/editor/series/:seriesId', element: <SeriesDetailPage /> },
          { path: '/editor/reviews', element: <ChapterReviewsPage /> },
          { path: '/editor/chapters/:chapterId/review', element: <ChapterReviewPage /> },
          { path: '/editor/ranking-watch', element: <RankingWatchPage /> },
          { path: '/editor/series-defense', element: <SeriesDefensePage /> },
        ],
      },

      // Admin
      {
        element: <RoleOnlyRoutes allow={['admin']} />,
        children: [
          { path: '/admin/dashboard', element: <AdminDashboardPage /> },
          { path: '/admin/users', element: <UserManagementPage /> },
          { path: '/admin/users/create', element: <CreateUserPage /> },
          { path: '/admin/users/:userId', element: <UserDetailPage /> },
          { path: '/admin/users/:userId/edit', element: <EditUserPage /> },
          { path: '/admin/series', element: <AdminSeriesPage /> },
          { path: '/admin/roles', element: <RoleManagementPage /> },
          { path: '/admin/activity', element: <SystemActivityPage /> },
          { path: '/admin/payroll', element: <AdminPayrollPage /> },
          { path: '/admin/task-pricing', element: <AdminTaskPricingPage /> },
          { path: '/admin/settings', element: <AdminSettingsPage /> },
        ],
      },

      // Board
      {
        element: <BoardOnlyRoutes />,
        children: [
          { path: '/board/dashboard', element: <BoardDashboardPage /> },
          { path: '/board/submissions', element: <BoardSubmissionsPage /> },
          { path: '/board/submissions/:submissionId', element: <SubmissionDetailPage /> },
          { path: '/board/approved-series', element: <BoardApprovedSeriesPage /> },
          { path: '/board/approved-series/:seriesId', element: <ApprovedSeriesDetailPage /> },
          { path: '/board/approved-series/:seriesId/chapters', element: <ChapterListPage /> },
          { path: '/board/approved-series/:seriesId/read', element: <SeriesReaderPage /> },
          { path: '/board/chapters/:chapterId', element: <ChapterDetailPage /> },
          { path: '/board/publishing-schedule', element: <PublishingSchedulePage /> },
          { path: '/board/publishing-schedule/:seriesId', element: <ScheduleSeriesDetailPage /> },
          { path: '/board/vote-input', element: <VoteInputPage /> },
          { path: '/board/rankings', element: <BoardRankingPage /> },
          { path: '/board/series-decisions', element: <SeriesDecisionPage /> },
          { path: '/board/series-decisions/:decisionId', element: <SeriesDecisionDetailPage /> },
          { path: '/board/reports', element: <BoardReportsPage /> },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
