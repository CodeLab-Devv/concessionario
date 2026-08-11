import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, DollarSign, ChevronLeft, Megaphone, CalendarDays, AlertTriangle } from 'lucide-react';
import { useServiceStatus } from '../hooks/useServiceStatus';

interface SidebarProps { isOpen: boolean; onToggle: () => void; currentPage: 'dashboard' | 'admin' | 'documents' | 'announcements' | 'shifts' | 'warnings'; onPageChange: (page: 'dashboard' | 'admin' | 'documents' | 'announcements' | 'shifts' | 'warnings') => void; }

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, currentPage, onPageChange }) => {
  const { user } = useAuth();
  const isOnService = useServiceStatus(user);
  const canAccessAdmin = user?.role === 'owner' || user?.role === 'director';
  const canAccessAnnouncements = isOnService;
  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, page: 'dashboard' as const },
    { id: 'shifts', label: 'Turni', icon: CalendarDays, page: 'shifts' as const },
    { id: 'warnings', label: 'Richiami', icon: AlertTriangle, page: 'warnings' as const },
    ...(canAccessAnnouncements ? [{ id: 'announcements', label: 'Annunci', icon: Megaphone, page: 'announcements' as const }] : []),
    ...(canAccessAdmin ? [{ id: 'admin', label: 'Stipendi', icon: DollarSign, page: 'admin' as const }] : [])
  ];
  return <>
    {isOpen && <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={onToggle} />}
    <aside className={`app-viewport-height safe-area-bottom fixed z-50 overflow-hidden bg-white shadow-lg transition-all duration-300 lg:relative ${isOpen ? 'w-64' : 'w-0 lg:w-20'}`}>
      {isOpen && <button onClick={onToggle} aria-label="Chiudi menu" className="absolute -right-1 top-1/2 z-10 flex h-14 w-11 -translate-y-1/2 items-center justify-center rounded-r-lg border border-gray-200 bg-white text-amber-500 shadow-lg"><ChevronLeft className="h-6 w-6" /></button>}
      <div className="safe-area-top flex items-center border-b border-gray-200 p-4"><div className={`flex items-center ${isOpen ? 'space-x-3' : 'w-full justify-center'}`}><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600"><Users className="h-5 w-5 text-white" /></div>{isOpen && <h1 className="text-lg font-bold text-gray-900">Aurum Motors</h1>}</div></div>
      <nav className={`space-y-2 p-4 ${!isOpen ? 'px-2' : ''}`}>{menuItems.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => onPageChange(item.page)} className={`flex w-full items-center rounded-lg transition-colors ${currentPage === item.page ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'} ${isOpen ? 'min-h-11 space-x-3 px-3 py-2.5' : 'min-h-11 justify-center p-2.5'}`} title={!isOpen ? item.label : undefined}><Icon className="h-5 w-5 flex-shrink-0" />{isOpen && <span className="font-medium">{item.label}</span>}</button>; })}</nav>
    </aside>
  </>;
};
