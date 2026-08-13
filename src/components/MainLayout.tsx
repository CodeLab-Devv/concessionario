import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { AdminPage } from './AdminPage';
import { DocumentsPage } from './DocumentsPage';
import { AnnouncementsPage } from './AnnouncementsPage';
import { ShiftsPage } from './ShiftsPage';
import { ActivityPage } from './ActivityPage';
import { ShiftDeleteDialogBridge } from './ShiftDeleteDialogBridge';
import { AnnouncementServiceNotifier } from './AnnouncementServiceNotifier';
import { Header } from './Header';
import { ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useServiceStatus } from '../hooks/useServiceStatus';

type Page = 'dashboard' | 'admin' | 'documents' | 'announcements' | 'shifts' | 'activity';

const PAGES: readonly Page[] = [
  'dashboard',
  'admin',
  'documents',
  'announcements',
  'shifts',
  'activity',
];

const isValidPage = (value: unknown): value is Page =>
  typeof value === 'string' && PAGES.includes(value as Page);

interface PageHistoryState {
  appPage?: Page;
}

export const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const isOnService = useServiceStatus(user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const hasActivityAccess =
    ['owner', 'director', 'vice_director'].includes(user?.role || '') &&
    isOnService;

  const canOpenPage = useCallback(
    (page: Page): boolean => {
      if (
        (page === 'announcements' || page === 'shifts') &&
        !isOnService
      ) {
        return false;
      }

      if (page === 'activity' && !hasActivityAccess) {
        return false;
      }

      if (page === 'admin' && !['owner', 'director'].includes(user?.role || '')) {
        return false;
      }

      if (
        page === 'documents' &&
        !(isOnService && (
          ['vice_director', 'director', 'owner'].includes(user?.role || '') ||
          (['probation', 'employee'].includes(user?.role || '') &&
            user?.employeeType === 'dealer')
        ))
      ) {
        return false;
      }

      return true;
    },
    [hasActivityAccess, isOnService, user?.employeeType, user?.role],
  );

  useEffect(() => {
    const savedPage = localStorage.getItem('currentPage') as Page | null;
    const historyState = window.history.state as PageHistoryState | null;
    const initialPage =
      isValidPage(historyState?.appPage) && canOpenPage(historyState.appPage)
        ? historyState.appPage
        : savedPage && isValidPage(savedPage) && canOpenPage(savedPage)
          ? savedPage
          : 'dashboard';

    setCurrentPage(initialPage);
    localStorage.setItem('currentPage', initialPage);

    if (historyState?.appPage !== initialPage) {
      window.history.replaceState(
        { ...(historyState ?? {}), appPage: initialPage },
        '',
        window.location.href,
      );
    }
  }, [canOpenPage]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as PageHistoryState | null;
      const page = state?.appPage;

      if (isValidPage(page) && canOpenPage(page)) {
        setCurrentPage(page);
        localStorage.setItem('currentPage', page);
        setIsSidebarOpen(false);
        return;
      }

      // Se la destinazione precedente non appartiene all'app o non è accessibile,
      // mantieni la SPA su Dashboard senza creare un loop di navigazione.
      setCurrentPage('dashboard');
      localStorage.setItem('currentPage', 'dashboard');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [canOpenPage]);

  useEffect(() => {
    if (!canOpenPage(currentPage)) {
      setCurrentPage('dashboard');
      localStorage.setItem('currentPage', 'dashboard');

      const state = window.history.state as PageHistoryState | null;
      if (state?.appPage !== 'dashboard') {
        window.history.replaceState(
          { ...(state ?? {}), appPage: 'dashboard' },
          '',
          window.location.href,
        );
      }
    }
  }, [canOpenPage, currentPage]);

  const handlePageChange = useCallback(
    (page: Page) => {
      if (!canOpenPage(page)) {
        const fallback: Page = 'dashboard';
        setCurrentPage(fallback);
        setIsSidebarOpen(false);
        localStorage.setItem('currentPage', fallback);

        window.history.pushState(
          { appPage: fallback },
          '',
          window.location.href,
        );
        return;
      }

      if (page === currentPage) {
        setIsSidebarOpen(false);
        return;
      }

      setCurrentPage(page);
      setIsSidebarOpen(false);
      localStorage.setItem('currentPage', page);

      window.history.pushState(
        { appPage: page },
        '',
        window.location.href,
      );
    },
    [canOpenPage, currentPage],
  );

  const hasAdminAccess =
    user?.role === 'owner' ||
    user?.role === 'director';

  const hasDocumentsAccess =
    isOnService &&
    (
      ['vice_director', 'director', 'owner'].includes(user?.role || '') ||
      (['probation', 'employee'].includes(user?.role || '') &&
        user?.employeeType === 'dealer')
    );

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'activity':
        return hasActivityAccess ? <ActivityPage /> : null;
      case 'shifts':
        return <ShiftsPage />;
      case 'announcements':
        return <AnnouncementsPage />;
      case 'documents':
        return hasDocumentsAccess ? <DocumentsPage /> : null;
      case 'admin':
        return hasAdminAccess ? <AdminPage /> : null;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-viewport-height flex bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((open) => !open)}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Apri menu"
            className="absolute left-2 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-amber-500 shadow-md lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Apri barra laterale"
            className="absolute left-0 top-1/2 z-10 hidden h-12 w-11 -translate-y-1/2 items-center justify-center rounded-r-lg bg-white text-amber-500 shadow-md lg:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <Header />

        <div className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
          {renderPage()}
        </div>
      </div>

      {currentPage === 'shifts' && <ShiftDeleteDialogBridge />}
      <AnnouncementServiceNotifier
        onOpen={() => handlePageChange('announcements')}
      />
    </div>
  );
};
