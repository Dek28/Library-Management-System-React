import { useEffect, useState } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/** Derives the topbar title from the matched route's handle. */
function useRouteTitle() {
  const matches = useMatches();
  const withTitle = [...matches].reverse().find((match) => match.handle?.title);
  return withTitle?.handle?.title || 'Dashboard';
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = useRouteTitle();

  // Navigating on mobile should close the drawer and return to the top.
  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${title} · ULMS`;
  }, [title]);

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main-content"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-lg bg-action px-3 py-2 text-sm font-medium text-on-solid"
      >
        Skip to main content
      </a>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-[252px]">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        {/* A measured column: wide enough for dense tables, capped so text on
            a large display never runs the full width of the screen. */}
        <main id="main-content" className="mx-auto max-w-[1600px] p-4 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
