import { type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { getLoggedInUser } from '../../data/mockData';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function MainLayout() {
  const user = getLoggedInUser();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopbarWrapper />
        <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function TopbarWrapper() {
  const { title, breadcrumb } = usePageMeta();
  return <Topbar title={title} breadcrumb={breadcrumb} />;
}
