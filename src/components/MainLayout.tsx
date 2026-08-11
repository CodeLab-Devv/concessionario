import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { AdminPage } from './AdminPage';
import { DocumentsPage } from './DocumentsPage';
import { AnnouncementsPage } from './AnnouncementsPage';
import { ShiftsPage } from './ShiftsPage';
import { ActivityPage } from './ActivityPage';
import { AnnouncementServiceNotifier } from './AnnouncementServiceNotifier';
import { Header } from './Header';
import { ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useServiceStatus } from '../hooks/useServiceStatus';

type Page = 'dashboard' | 'admin' | 'documents' | 'announcements' | 'shifts' | 'activity';
const PAGES: Page[] = ['dashboard', 'admin', 'documents', 'announcements', 'shifts', 'activity'];

export const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const isOnService = useServiceStatus(user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [visitedPages, setVisitedPages] = useState<Set<Page>>(() => new Set(['dashboard']));
  const hasActivityAccess = ['owner', 'director', 'vice_director'].includes(user?.role || '') && isOnService;

  useEffect(() => {
    const savedPage = localStorage.getItem('currentPage') as Page | null;
    if (savedPage && PAGES.includes(savedPage)) {
      setCurrentPage(savedPage);
      setVisitedPages(previous => new Set(previous).add(savedPage));
    }
  }, []);

  useEffect(() => {
    if ((currentPage === 'announcements' || currentPage === 'shifts') && !isOnService) {
      setCurrentPage('dashboard');
      localStorage.setItem('currentPage', 'dashboard');
    }
    if (currentPage === 'activity' && !hasActivityAccess) {
      setCurrentPage('dashboard');
      localStorage.setItem('currentPage', 'dashboard');
    }
  }, [currentPage, hasActivityAccess, isOnService]);

  const handlePageChange = (page: Page) => {
    if ((page === 'announcements' || page === 'shifts') && !isOnService) {
      setCurrentPage('dashboard');
      localStorage.setItem('currentPage', 'dashboard');
      setIsSidebarOpen(false);
      return;
    }
    if (page === 'activity' && !hasActivityAccess) {
      setCurrentPage('dashboard');
      localStorage.setItem('currentPage', 'dashboard');
      setIsSidebarOpen(false);
      return;
    }
    setVisitedPages(previous => new Set(previous).add(page));
    setCurrentPage(page);
    setIsSidebarOpen(false);
    localStorage.setItem('currentPage', page);
  };

  const hasAdminAccess = user?.role === 'owner' || user?.role === 'director';
  const hasDocumentsAccess = isOnService && (
    ['vice_director', 'director', 'owner'].includes(user?.role || '') ||
    (['probation', 'employee'].includes(user?.role || '') && user?.employeeType === 'dealer')
  );

  const renderPage = (page: Page) => {
    switch (page) {
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
        return null;
    }
  };

  return (
    <div className="app-viewport-height flex bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(open => !open)}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} aria-label="Apri menu" className="absolute left-2 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-amber-500 shadow-md lg:hidden"><Menu className="h-5 w-5" /></button>}
        {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} aria-label="Apri barra laterale" className="absolute left-0 top-1/2 z-10 hidden h-12 w-11 -translate-y-1/2 items-center justify-center rounded-r-lg bg-white text-amber-500 shadow-md lg:flex"><ChevronRight className="h-5 w-5" /></button>}
        <Header />
        <div className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
          {[...visitedPages].map(page => (
            <div key={page} className={currentPage === page ? 'block' : 'hidden'}>
              {renderPage(page)}
            </div>
          ))}
        </div>
      </div>
      <AnnouncementServiceNotifier onOpen={() => handlePageChange('announcements')} />
    </div>
  );
};
