import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { AdminPage } from './AdminPage';
import { DocumentsPage } from './DocumentsPage';
import { AnnouncementsPage } from './AnnouncementsPage';
import { ShiftsPage } from './ShiftsPage';
import { AnnouncementServiceNotifier } from './AnnouncementServiceNotifier';
import { Header } from './Header';
import { ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useServiceStatus } from '../hooks/useServiceStatus';

type Page = 'dashboard' | 'admin' | 'documents' | 'announcements' | 'shifts';

export const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const isOnService = useServiceStatus(user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    const savedPage = localStorage.getItem('currentPage') as Page;
    const allowed: Page[] = ['dashboard', 'admin', 'documents', 'announcements', 'shifts'];
    if (savedPage && allowed.includes(savedPage)) setCurrentPage(savedPage);
  }, []);

  useEffect(() => {
    if (currentPage === 'announcements' && !isOnService) {
      setCurrentPage('dashboard');
      localStorage.setItem('currentPage', 'dashboard');
    }
  }, [currentPage, isOnService]);

  const handlePageChange = (page: Page) => {
    if (page === 'announcements' && !isOnService) {
      setCurrentPage('dashboard');
      localStorage.setItem('currentPage', 'dashboard');
      setIsSidebarOpen(false);
      return;
    }
    setCurrentPage(page);
    setIsSidebarOpen(false);
    localStorage.setItem('currentPage', page);
  };

  const hasAdminAccess = user?.role === 'owner' || user?.role === 'director';
  const hasDocumentsAccess = isOnService && ['vice_director', 'director', 'owner'].includes(user?.role || '') || (isOnService && ['probation', 'employee'].includes(user?.role || '') && user?.employeeType === 'dealer');
  const hasAnnouncementsAccess = isOnService;

  return <div className="app-viewport-height flex bg-gray-50">
    <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} currentPage={currentPage} onPageChange={handlePageChange} />
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} aria-label="Apri menu" className="absolute left-2 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-amber-500 shadow-md hover:bg-amber-50 lg:hidden"><Menu className="h-5 w-5" /></button>}
      {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} aria-label="Apri barra laterale" className="absolute left-0 top-1/2 z-10 hidden h-12 w-11 -translate-y-1/2 items-center justify-center rounded-r-lg bg-white text-amber-500 shadow-md hover:bg-amber-50 lg:flex"><ChevronRight className="h-5 w-5" /></button>}
      <Header />
      <div className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
        {currentPage === 'dashboard' ? <Dashboard /> : currentPage === 'shifts' ? <ShiftsPage /> : currentPage === 'announcements' ? (
          hasAnnouncementsAccess ? <AnnouncementsPage /> : <div className="flex h-64 items-center justify-center"><div className="text-center"><h3 className="mb-2 text-lg font-semibold text-gray-900">Sezione non disponibile</h3><p className="text-gray-600">Devi essere in servizio per visualizzare gli annunci.</p></div></div>
        ) : currentPage === 'documents' ? (
          hasDocumentsAccess ? <DocumentsPage /> : <div className="flex h-64 items-center justify-center"><div className="text-center"><h3 className="mb-2 text-lg font-semibold text-gray-900">Accesso Negato</h3><p className="text-gray-600">Solo concessionari possono accedere a questa sezione.</p></div></div>
        ) : hasAdminAccess ? <AdminPage /> : <div className="flex h-64 items-center justify-center"><div className="text-center"><h3 className="mb-2 text-lg font-semibold text-gray-900">Accesso Negato</h3><p className="text-gray-600">Solo proprietari e direttori possono accedere a questa sezione.</p></div></div>}
      </div>
    </div>
    <AnnouncementServiceNotifier onOpen={() => handlePageChange('announcements')} />
  </div>;
};