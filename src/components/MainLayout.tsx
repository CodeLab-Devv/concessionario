import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { AdminPage } from './AdminPage';
import { DocumentsPage } from './DocumentsPage';
import { Header } from './Header';
import { ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'admin' | 'documents'>('dashboard');

  // Load saved page from localStorage on component mount
  useEffect(() => {
    const savedPage = localStorage.getItem('currentPage') as 'dashboard' | 'admin' | 'documents';
    if (savedPage && ['dashboard', 'admin', 'documents'].includes(savedPage)) {
      setCurrentPage(savedPage);
    }
  }, []);

  // Save page to localStorage whenever it changes
  const handlePageChange = (page: 'dashboard' | 'admin' | 'documents') => {
    setCurrentPage(page);
    setIsSidebarOpen(false);
    localStorage.setItem('currentPage', page);
  };

  // Check if user has admin access
  const hasAdminAccess = user?.role === 'owner' || user?.role === 'director';
  
  // Check if user has documents access
  const hasDocumentsAccess = user?.isOnService && (
    // High roles: always have access regardless of employee type
    ['vice_director', 'director', 'owner'].includes(user?.role || '') ||
    // Low roles: only if they are dealer type
    (['probation', 'employee'].includes(user?.role || '') && user?.employeeType === 'dealer')
  );

  return (
    <div className="app-viewport-height flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Apri menu"
            className="absolute left-2 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-amber-500 shadow-md hover:bg-amber-50 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Apri barra laterale"
            className="absolute left-0 top-1/2 z-10 hidden h-12 w-11 -translate-y-1/2 items-center justify-center rounded-r-lg bg-white text-amber-500 shadow-md hover:bg-amber-50 lg:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        <Header />
        <div className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
          {currentPage === 'dashboard' ? (
            <Dashboard />
          ) : currentPage === 'documents' ? (
            hasDocumentsAccess ? (
              <DocumentsPage />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Accesso Negato</h3>
                  <p className="text-gray-600">Solo concessionari possono accedere a questa sezione.</p>
                </div>
              </div>
            )
          ) : (
            hasAdminAccess ? (
              <AdminPage />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Accesso Negato</h3>
                  <p className="text-gray-600">Solo proprietari e direttori possono accedere a questa sezione.</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
