import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { AdminPage } from './AdminPage';
import { DocumentsPage } from './DocumentsPage';
import { Header } from './Header';
import { ChevronRight } from 'lucide-react';
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
    <div className="flex h-screen bg-gray-50">
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
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-8 h-12 bg-white shadow-md rounded-r-lg flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-all duration-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        <Header />
        <div className="flex-1 overflow-auto p-6">
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
