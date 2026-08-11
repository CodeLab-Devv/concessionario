import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  ChevronLeft,
  FileText
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPage: 'dashboard' | 'admin' | 'documents';
  onPageChange: (page: 'dashboard' | 'admin' | 'documents') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onToggle, 
  currentPage, 
  onPageChange 
}) => {
  const { user } = useAuth();

  // Only show admin section for owners and directors
  const canAccessAdmin = user?.role === 'owner' || user?.role === 'director';
  
  // Access to documents section: dealer type or high roles
  const canAccessDocuments = user?.isOnService && (
    ['vice_director', 'director', 'owner'].includes(user?.role || '') ||
    (['probation', 'employee'].includes(user?.role || '') && user?.employeeType === 'dealer')
  );

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      page: 'dashboard' as const
    },
    ...(canAccessDocuments ? [{
      id: 'documents',
      label: 'Immatricolazione',
      icon: FileText,
      page: 'documents' as const
    }] : []),
    ...(canAccessAdmin ? [{
      id: 'admin',
      label: 'Stipendi',
      icon: DollarSign,
      page: 'admin' as const
    }] : [])
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`app-viewport-height safe-area-bottom fixed lg:relative z-50 bg-white shadow-lg transition-all duration-300 ${isOpen ? 'w-64' : 'w-0 lg:w-20'} overflow-hidden`}
      >
        {/* Toggle button - right side when open */}
        {isOpen && (
          <button
            onClick={onToggle}
            aria-label="Chiudi menu"
            className="absolute -right-1 top-1/2 z-10 flex h-14 w-11 -translate-y-1/2 items-center justify-center rounded-r-lg border border-gray-200 bg-white text-amber-500 shadow-lg hover:bg-amber-50 hover:text-amber-600"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {/* Header */}
        <div className="safe-area-top flex items-center border-b border-gray-200 p-4">
          <div className={`flex items-center ${isOpen ? 'space-x-3' : 'justify-center w-full'}`}>
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            {isOpen && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">Aurum Motors</h1>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`p-4 space-y-2 ${!isOpen && 'px-2'}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.page)}
                className={`
                  w-full flex items-center rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                  ${isOpen 
                    ? 'min-h-11 space-x-3 px-3 py-2.5'
                    : 'min-h-11 justify-center p-2.5'
                  }
                `}
                title={!isOpen ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {isOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
