import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

type DashboardRealtimeRow = Record<string, unknown> & {
  id?: string; employee_id?: string; employee_name?: string; item_name?: string; car_model?: string;
  price?: number | string; quantity?: number | string; total?: number | string; date?: string;
  type?: string; category?: string; created_at?: string; name?: string; email?: string; role?: string;
  employee_type?: string; is_on_service?: boolean | null; last_service_status_change?: string | null; avatar_url?: string | null;
};

import { Sale, Employee, User } from '../types';
import { supabase } from '../lib/supabase';
import { useNotifications } from './ui/NotificationManager';
import { useDialogs } from './ui/DialogManager';
import { useDashboardRealtime } from '../hooks/useDashboardRealtime';
import { Users, Activity, Clock, Plus, Eye, Edit, Trash2, UserCheck, Shield, Crown, Award, Car, ChevronDown, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { AddSaleModal } from './modals/AddSaleModal';
import { ViewSaleModal } from './modals/ViewSaleModal';
import { EditSaleModal } from './modals/EditSaleModal';
import { PromoteEmployeeModal } from './modals/PromoteEmployeeModal';
import { ActivityLogsPanel } from './ActivityLogsPanel';
import { Avatar } from './Avatar';
import { getErrorMessage } from '../utils/errorHandling';

interface EmployeeProfileRow {
  id: string;
  name: string;
  email: string;
  role: Employee['role'];
  employee_type: 'dealer' | null;
  is_on_service: boolean | null;
  last_service_status_change: string | null;
  avatar_url: string | null;
  created_at: string;
}

const SALES_PER_PAGE = 6;

const sortSalesByCreatedAt = (salesList: Sale[]) => [...salesList].sort((a, b) => {
  const dateA = new Date(a.created_at).getTime();
  const dateB = new Date(b.created_at).getTime();
  return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
});

const CountUpNumber: React.FC<{ value: number; duration?: number; prefix?: string; suffix?: string }> = ({ value, duration = 2000, prefix = '', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setDisplayValue(Math.floor(progress * value));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => { if (animationFrame) cancelAnimationFrame(animationFrame); };
  }, [value, duration]);
  return <span className="tabular-nums">{prefix}{displayValue.toLocaleString('it-IT')}{suffix}</span>;
};

const AnimatedCarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`${className} animate-pulse`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12V7a1 1 0 011-1h4l2-3h2l2 3h4a1 1 0 011 1v5M5 12a2 2 0 104 0M5 12a2 2 0 114 0m0 0h6m0 0a2 2 0 104 0M15 12a2 2 0 114 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <animateTransform attributeName="transform" type="translate" values="0,0;1,0;0,0" dur="2s" repeatCount="indefinite"/>
  </svg>
);

const AnimatedChartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 16l4-4 4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><animate attributeName="stroke-dasharray" values="0,100;100,0;0,100" dur="3s" repeatCount="indefinite"/></path>
    <circle cx="7" cy="16" r="2" fill="currentColor"><animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="11" cy="12" r="2" fill="currentColor"><animate attributeName="r" values="2;3;2" dur="2s" begin="0.5s" repeatCount="indefinite"/></circle>
    <circle cx="15" cy="16" r="2" fill="currentColor"><animate attributeName="r" values="2;3;2" dur="2s" begin="1s" repeatCount="indefinite"/></circle>
  </svg>
);

export const Dashboard: React.FC = () => {
  const { user, updateUserRole, fireEmployee, fetchEmployeesStatus } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const { showDeleteConfirm, showFireConfirm } = useDialogs();
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSale, setShowAddSale] = useState(false);
  const [showViewSale, setShowViewSale] = useState(false);
  const [showEditSale, setShowEditSale] = useState(false);
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [isEmployeeManagementExpanded, setIsEmployeeManagementExpanded] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [expandedSections, setExpandedSections] = useState({ sales: true });
  const [salesPage, setSalesPage] = useState(1);
  const [lastServiceUpdate, setLastServiceUpdate] = useState('');

  const employeesRef = useRef<Employee[]>([]);
  useEffect(() => { employeesRef.current = employees; }, [employees]);

  const toggleSection = (section: 'sales') => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const fetchSales = useCallback(async () => {
    try {
      let query = supabase.from('sales').select('*');
      if (!['owner', 'director'].includes(user?.role || '')) query = query.eq('employee_id', user?.id);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) { console.error('Error fetching sales:', error); return; }
      const salesData: Sale[] = data?.map((sale) => ({
        id: sale.id, employeeId: sale.employee_id, employeeName: sale.employee_name, itemName: sale.item_name,
        carModel: sale.car_model, price: sale.price, quantity: sale.quantity, total: sale.total, date: sale.date,
        type: sale.type, category: sale.category, created_at: sale.created_at || new Date().toISOString()
      })) || [];
      setSales(sortSalesByCreatedAt(salesData));
    } catch (error) { console.error('Error fetching sales:', error); }
  }, [user?.role, user?.id]);

  const fetchEmployees = useCallback(async () => {
    if (!['owner', 'director', 'vice_director'].includes(user?.role || '')) return;
    try {
      const { data, error } = await supabase.from('users').select('*').neq('id', user?.id).order('created_at', { ascending: false });
      if (error) { console.error('Error fetching employees:', error); return; }
      const employeesData: Employee[] = (data || []).map((emp) => {
        const profile = emp as EmployeeProfileRow;
        return {
          id: profile.id, name: profile.name, email: profile.email, role: profile.role,
          employeeType: profile.employee_type || undefined, department: 'Concessionario',
          hireDate: profile.created_at.split('T')[0], totalSales: 0,
          isOnService: profile.is_on_service || false,
          lastServiceStatusChange: profile.last_service_status_change || undefined,
          avatar_url: profile.avatar_url || undefined
        };
      });
      setEmployees(employeesData);
    } catch (error) { console.error('Error fetching employees:', error); }
  }, [user?.role, user?.id]);

  const fetchData = useCallback(async () => {
    const safetyTimeout = new Promise<never>((_, reject) => {
      const t = setTimeout(() => { clearTimeout(t); reject(new Error('Timeout caricamento dati (20s)')); }, 20000);
    });
    try { setLoading(true); await Promise.race([Promise.all([fetchSales(), fetchEmployees()]), safetyTimeout]); }
    catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); }
  }, [fetchSales, fetchEmployees]);

  useEffect(() => {
    if (user) {
      fetchData();
      if (['owner', 'director', 'vice_director'].includes(user.role)) fetchEmployeesStatus?.();
    }
    const handleEmployeeStatusUpdate = (event: CustomEvent) => {
      const { employeeId, newStatus } = event.detail;
      setEmployees(prev => prev.map(emp => emp.id === employeeId ? { ...emp, isOnService: newStatus, lastServiceStatusChange: new Date().toISOString() } : emp));
    };
    const mapSaleRow = (row: DashboardRealtimeRow): Sale => ({
      id: String(row.id), employeeId: String(row.employee_id), employeeName: String(row.employee_name || ''),
      itemName: String(row.item_name || ''), carModel: row.car_model ?? undefined, price: Number(row.price) || 0,
      quantity: Number(row.quantity) || 0, total: Number(row.total) || 0,
      date: String(row.date || new Date().toISOString().slice(0, 10)), type: row.type, category: row.category,
      created_at: String(row.created_at || new Date().toISOString())
    });
    const handleDashboardSalesRealtime = (event: CustomEvent) => {
      const { eventType, new: nextRow, old: oldRow } = event.detail as { eventType?: string; new?: DashboardRealtimeRow | null; old?: DashboardRealtimeRow | null };
      setSales(current => {
        if (eventType === 'INSERT' && nextRow) {
          const row = mapSaleRow(nextRow);
          setSalesPage(1);
          return sortSalesByCreatedAt(current.some(item => item.id === row.id) ? current : [row, ...current]);
        }
        if (eventType === 'UPDATE' && nextRow) {
          const row = mapSaleRow(nextRow);
          return sortSalesByCreatedAt(current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [row, ...current]);
        }
        if (eventType === 'DELETE' && oldRow?.id) return current.filter(item => item.id !== String(oldRow.id));
        return current;
      });
    };
    const handleDashboardUserRealtime = (event: CustomEvent) => {
      const { eventType, new: nextRow, old: oldRow } = event.detail as { eventType?: string; new?: DashboardRealtimeRow | null; old?: DashboardRealtimeRow | null };
      if (eventType === 'DELETE' && oldRow?.id) { setEmployees(current => current.filter(employee => employee.id !== String(oldRow.id))); return; }
      if (!nextRow?.id || String(nextRow.id) === String(user?.id)) return;
      setEmployees(current => {
        const existing = current.find(employee => employee.id === String(nextRow.id));
        const mapped: Employee = {
          id: String(nextRow.id), name: String(nextRow.name || ''), email: String(nextRow.email || ''), role: String(nextRow.role || ''),
          employeeType: nextRow.employee_type || undefined, department: 'Concessionario',
          hireDate: String(nextRow.created_at || '').split('T')[0], totalSales: existing?.totalSales || 0,
          isOnService: Boolean(nextRow.is_on_service), lastServiceStatusChange: nextRow.last_service_status_change || undefined,
          avatar_url: nextRow.avatar_url || undefined
        };
        return existing ? current.map(employee => employee.id === mapped.id ? mapped : employee) : [mapped, ...current];
      });
    };
    const handleServiceStatusChange = (event: CustomEvent) => {
      const { userId, userName, newStatus, timestamp } = event.detail;
      const currentEmployee = employeesRef.current.find(e => e.id === userId);
      if (currentEmployee && currentEmployee.isOnService === newStatus) return;
      console.log(`🔄 Dashboard: Service status changed for ${userName}: ${newStatus}`);
      setEmployees(prev => prev.map(emp => emp.id === userId ? { ...emp, isOnService: newStatus, lastServiceStatusChange: timestamp } : emp));
      setLastServiceUpdate(`${userId}-${newStatus}-${Date.now()}`);
    };
    window.addEventListener('employeeStatusUpdated', handleEmployeeStatusUpdate as EventListener);
    window.addEventListener('dashboardSalesRealtimeChange', handleDashboardSalesRealtime as EventListener);
    window.addEventListener('dashboardUserRealtimeChange', handleDashboardUserRealtime as EventListener);
    window.addEventListener('employeeServiceStatusChanged', handleServiceStatusChange as EventListener);
    return () => {
      window.removeEventListener('employeeStatusUpdated', handleEmployeeStatusUpdate as EventListener);
      window.removeEventListener('dashboardSalesRealtimeChange', handleDashboardSalesRealtime as EventListener);
      window.removeEventListener('dashboardUserRealtimeChange', handleDashboardUserRealtime as EventListener);
      window.removeEventListener('employeeServiceStatusChanged', handleServiceStatusChange as EventListener);
    };
  }, [user, fetchData, fetchEmployeesStatus]);

  useDashboardRealtime({ userRole: user?.role, enabled: !!user });

  const { userSales, totalRevenue, permissions } = useMemo(() => {
    const isManager = ['owner', 'director', 'vice_director'].includes(user?.role || '');
    const isDealer = user?.employeeType === 'dealer';
    const isOnService = user?.isOnService || false;
    const filteredSales = isManager ? sales : sales.filter(s => s.employeeId === user?.id);
    const orderedSales = sortSalesByCreatedAt(filteredSales);
    const revenue = orderedSales.reduce((sum, sale) => {
      const saleValue = Number(sale.total) || 0;
      const commissionRate = ['employee', 'probation'].includes(user?.role || '') ? 0.10 : 1;
      return sum + (saleValue * commissionRate);
    }, 0);
    const isActiveManager = isManager && isOnService;
    return {
      userSales: orderedSales,
      totalRevenue: revenue,
      permissions: {
        canAddSale: (isManager || isDealer) && isOnService,
        canManageEmployees: isActiveManager,
        canViewLogs: (user?.role === 'owner' || user?.role === 'director') && isOnService,
      }
    };
  }, [sales, user?.role, user?.employeeType, user?.id, user?.isOnService]);

  const { canAddSale, canManageEmployees, canViewLogs } = permissions;
  const salesPageCount = Math.max(1, Math.ceil(userSales.length / SALES_PER_PAGE));
  const paginatedSales = useMemo(() => userSales.slice((salesPage - 1) * SALES_PER_PAGE, salesPage * SALES_PER_PAGE), [userSales, salesPage]);
  const salesStart = userSales.length === 0 ? 0 : (salesPage - 1) * SALES_PER_PAGE + 1;
  const salesEnd = Math.min(salesPage * SALES_PER_PAGE, userSales.length);

  useEffect(() => {
    setSalesPage(currentPage => Math.min(currentPage, salesPageCount));
  }, [salesPageCount]);

  const handleAddSale = async (sale: Omit<Sale, 'id'>) => {
    try {
      const { error } = await supabase.from('sales').insert({ employee_id: sale.employeeId, employee_name: sale.employeeName, item_name: sale.itemName, car_model: sale.carModel, price: sale.price, quantity: sale.quantity, total: sale.total, date: sale.date, type: sale.type, category: sale.category }).select().single();
      if (error) { console.error('Error adding sale:', error); return; }
      if (user) await supabase.rpc('log_activity', { p_user_id: user.id, p_action: 'Creazione Vendita', p_details: `${user.name} ha creato una nuova vendita: "${sale.itemName}" - Cliente: ${sale.employeeName} - Importo: €${Math.round(sale.total).toLocaleString()}`, p_target_user_id: sale.employeeId });
    } catch (error) { console.error('Error adding sale:', error); }
  };

  const handleEditSale = async (updatedSale: Sale) => {
    try {
      const { error } = await supabase.from('sales').update({ item_name: updatedSale.itemName, car_model: updatedSale.carModel, price: updatedSale.price, quantity: updatedSale.quantity, total: updatedSale.total, category: updatedSale.category }).eq('id', updatedSale.id);
      if (error) { console.error('Error updating sale:', error); return; }
      if (user) await supabase.rpc('log_activity', { p_user_id: user.id, p_action: 'Modifica Vendita', p_details: `${user.name} ha modificato la vendita: "${updatedSale.itemName}" - Cliente: ${updatedSale.employeeName} - Nuovo importo: €${Math.round(updatedSale.total).toLocaleString()}`, p_target_user_id: updatedSale.employeeId });
    } catch (error) { console.error('Error updating sale:', error); }
  };

  const handleDeleteSale = async (saleId: string) => {
    const saleToDelete = sales.find(sale => sale.id === saleId);
    const saleDescription = saleToDelete ? saleToDelete.itemName : 'questa vendita';
    const confirmed = await showDeleteConfirm(saleDescription, 'vendita');
    if (!confirmed) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) throw error;
      if (user) await supabase.rpc('log_activity', { p_user_id: user.id, p_action: 'Eliminazione Vendita', p_details: `${user.name} ha eliminato la vendita "${saleDescription}" - Cliente: ${saleToDelete?.employeeName || 'N/A'} - Importo: €${Math.round(saleToDelete?.total || 0).toLocaleString()}`, p_target_user_id: saleToDelete?.employeeId });
      setSales(prevSales => prevSales.filter(sale => sale.id !== saleId));
      await fetchData();
      showSuccess('Vendita eliminata', `La vendita "${saleDescription}" è stata eliminata con successo`);
    } catch (error) {
      console.error('Error deleting sale:', error);
      showError('Errore eliminazione', `Errore durante l'eliminazione della vendita: ${getErrorMessage(error, 'Errore sconosciuto')}`);
    } finally { setLoading(false); }
  };

  const handleViewSale = (sale: Sale) => { setSelectedSale(sale); setShowViewSale(true); };
  const handleEditSaleClick = (sale: Sale) => { setSelectedSale(sale); setShowEditSale(true); };
  const handlePromoteEmployee = (employee: Employee) => setSelectedEmployee({ id: employee.id, name: employee.name, email: employee.email, role: employee.role, employeeType: employee.employeeType, isOnService: employee.isOnService, lastServiceStatusChange: employee.lastServiceStatusChange, createdAt: employee.hireDate, avatar_url: employee.avatar_url });

  const handleFireEmployee = async (employeeId: string): Promise<boolean> => {
    if (!fireEmployee) { showError('Errore', 'Funzione di licenziamento non disponibile'); return false; }
    const employeeToFire = employees.find(emp => emp.id === employeeId);
    if (!employeeToFire) { showError('Errore', 'Dipendente non trovato'); return false; }
    const confirmed = await showFireConfirm(employeeToFire.name);
    if (!confirmed) return false;
    try {
      setLoading(true);
      const success = await fireEmployee(employeeId);
      if (success) {
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        await fetchData();
        if (fetchEmployeesStatus) await fetchEmployeesStatus();
        showSuccess('Dipendente licenziato', `${employeeToFire.name} è stato licenziato con successo`);
        setSelectedEmployee(null);
        return true;
      }
      showError('Errore licenziamento', 'Errore durante il licenziamento del dipendente');
      return false;
    } catch (error) { console.error('Error firing employee:', error); showError('Errore licenziamento', 'Si è verificato un errore durante il licenziamento'); return false; }
    finally { setLoading(false); }
  };

  const handleRoleUpdate = async (employeeId: string, newRole: User['role']): Promise<boolean> => {
    if (!user || !updateUserRole) return false;
    const validRoles: User['role'][] = ['owner', 'director', 'vice_director', 'employee', 'probation'];
    if (!validRoles.includes(newRole)) { console.error(`Invalid role: ${newRole}`); return false; }
    try {
      setLoading(true);
      const success = await updateUserRole(employeeId, newRole);
      if (success) {
        setEmployees(prev => prev.map(emp => emp.id === employeeId ? { ...emp, role: newRole, employeeType: 'dealer', department: 'Concessionario' } : emp));
        await Promise.all([fetchEmployees(), fetchData()]);
        return true;
      }
      showError('Errore aggiornamento', "Errore durante l'aggiornamento del ruolo");
      return false;
    } catch (error) { console.error('Error updating employee:', error); showError('Errore aggiornamento', "Si è verificato un errore durante l'aggiornamento"); return false; }
    finally { setLoading(false); }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div><p className="mt-4 text-gray-600">Caricamento dati...</p></div></div>;

  if (!user?.isOnService) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="app-viewport min-h-[60vh] flex items-center justify-center"><div className="text-center space-y-6">
        <div className="relative"><div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse"><Clock className="h-12 w-12 text-white" /></div><div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-yellow-300 rounded-full animate-ping opacity-20"></div><div className="absolute inset-0 w-32 h-32 mx-auto -m-4 border-2 border-amber-200 rounded-full animate-pulse opacity-30"></div></div>
        <div className="space-y-3"><h2 className="text-3xl font-bold text-gray-800 animate-fade-in">Devi essere in servizio</h2><p className="text-xl text-gray-600 animate-fade-in-delay">per iniziare a lavorare</p></div>
        <div className="flex items-center justify-center space-x-2 text-gray-500"><div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div><span className="text-sm font-medium">Fuori servizio</span></div>
      </div></div>
    </div>
  );

  return (
    <div className="app-viewport bg-gradient-to-br from-gray-50 via-yellow-50/20 to-amber-50/30 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30"><div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d97706' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }}></div></div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="group relative bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div><div className="relative z-10 flex items-center"><div className="flex-shrink-0"><div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg"><AnimatedCarIcon className="h-6 w-6 text-white" /></div></div><div className="ml-4"><p className="text-sm font-semibold text-emerald-700 mb-1">{['employee', 'probation'].includes(user?.role || '') ? 'Commissioni Totali' : 'Fatturato Totale'}</p><p className="text-2xl font-bold text-gray-900">€<CountUpNumber value={Math.round(totalRevenue)} duration={2000} /></p><div className="flex items-center mt-2"><div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div><p className="text-xs text-emerald-600 font-medium">{['employee', 'probation'].includes(user?.role || '') ? '10% di commissione per veicolo' : 'Aurum Motors'}</p></div></div></div></div>
          <div className="group relative bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 opacity-60"></div><div className="relative z-10 flex items-center"><div className="flex-shrink-0"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg"><AnimatedChartIcon className="h-6 w-6 text-white" /></div></div><div className="ml-4"><p className="text-sm font-semibold text-blue-700 mb-1">Vendite Totali</p><p className="text-2xl font-bold text-gray-900"><CountUpNumber value={userSales.length} duration={1500} /></p><div className="flex items-center mt-2"><div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div><p className="text-xs text-blue-600 font-medium">Veicoli venduti</p></div></div></div></div>
          {canManageEmployees && <div className="group relative bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden"><div className="relative z-10 flex items-center"><div className="flex-shrink-0"><div className="p-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl shadow-lg"><Users className="h-6 w-6 text-white" /></div></div><div className="ml-4"><p className="text-sm font-semibold text-rose-700 mb-1">Team Attivo</p><p className="text-2xl font-bold text-gray-900"><CountUpNumber value={employees.length} duration={1500} /></p><div className="flex items-center mt-2"><div className="w-2 h-2 bg-rose-400 rounded-full mr-2 animate-pulse"></div><p className="text-xs text-rose-600 font-medium">Dipendenti registrati</p></div></div></div></div>}
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          {canViewLogs && <button onClick={() => setShowActivityLogs(true)} className="group relative flex-1 min-w-[200px] flex items-center justify-center space-x-3 bg-gradient-to-r from-slate-700 to-gray-800 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg"><Activity className="h-5 w-5 text-blue-300" /><span>Log Attività</span></button>}
          {canAddSale && <button onClick={() => setShowAddSale(true)} className="group relative flex-1 min-w-[200px] flex items-center justify-center space-x-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg"><Plus className="h-5 w-5" /><span>Nuova Vendita</span></button>}
        </div>

        {userSales.length > 0 && (
          <section className="bg-white rounded-2xl shadow-lg mb-6 border border-gray-100 overflow-hidden" aria-labelledby="recent-sales-title">
            <button type="button" className="w-full text-left bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 px-4 sm:px-6 py-4 border-b border-yellow-100" onClick={() => toggleSection('sales')} aria-expanded={expandedSections.sales}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3"><div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg shadow-md shrink-0"><BarChart3 className="h-5 w-5 text-white" /></div><div className="min-w-0"><h2 id="recent-sales-title" className="text-lg sm:text-xl font-bold text-gray-800 flex flex-wrap items-center gap-2">Vendite Recenti <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">{userSales.length}</span></h2><p className="text-xs text-gray-600 mt-1">Le vendite più recenti vengono mostrate per prime e aggiornate in tempo reale.</p></div></div>
                <div className="flex items-center gap-3 shrink-0"><div className="hidden sm:block text-right"><p className="text-xs text-gray-500">Totale</p><p className="text-base sm:text-lg font-bold text-yellow-600">€{Math.round(userSales.reduce((sum, sale) => sum + sale.total, 0)).toLocaleString()}</p></div><ChevronDown className={`h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 transition-transform duration-200 ${expandedSections.sales ? 'rotate-180' : ''}`} /></div>
              </div>
            </button>

            {expandedSections.sales && <div className="p-3 sm:p-4">
              <div className="grid gap-3">
                {paginatedSales.map((sale, index) => (
                  <article key={sale.id} className="group bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 hover:border-yellow-300 hover:shadow-md transition-all duration-300 overflow-hidden">
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3">
                            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-sm"><Car className="h-5 w-5 text-white" />{salesPage === 1 && index === 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" title="Vendita più recente" />}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm sm:text-base font-extrabold tracking-tight text-gray-900 break-words">{sale.itemName}</h3><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Venduta</span></div>
                              {sale.carModel && sale.carModel.trim().toLowerCase() !== sale.itemName.trim().toLowerCase() && <p className="mt-0.5 text-sm font-medium text-gray-500 break-words">{sale.carModel}</p>}
                              <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-x-3 gap-y-1.5 text-xs text-gray-500"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{new Date(sale.created_at).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' })}{' · '}{new Date(sale.created_at).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' })}</span><span className="hidden sm:block h-3 w-px bg-gray-200" /><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Venduta da <strong className="font-bold text-gray-700">{sale.employeeName || 'Utente'}</strong></span></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:shrink-0">
                          <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/80 border border-gray-100 p-2 sm:border-0 sm:bg-transparent sm:p-0"><div className="text-center"><p className="text-[10px] sm:text-xs text-gray-500 font-medium">Qtà</p><p className="text-sm font-bold text-gray-900">{sale.quantity}</p></div><div className="text-center"><p className="text-[10px] sm:text-xs text-gray-500 font-medium">Prezzo</p><p className="text-sm font-bold text-yellow-600">€{Math.round(sale.price).toLocaleString()}</p></div><div className="text-center"><p className="text-[10px] sm:text-xs text-gray-500 font-medium">Totale</p><p className="text-base sm:text-lg font-bold text-green-600">€{Math.round(sale.total).toLocaleString()}</p></div></div>
                          <div className="flex w-full sm:w-auto gap-2"><button onClick={() => handleViewSale(sale)} className="flex min-h-11 min-w-11 flex-1 sm:flex-none items-center justify-center rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100" title="Visualizza vendita" aria-label={`Visualizza ${sale.itemName}`}><Eye className="h-4 w-4" /></button><button onClick={() => handleEditSaleClick(sale)} className="flex min-h-11 min-w-11 flex-1 sm:flex-none items-center justify-center rounded-lg bg-green-50 p-2 text-green-600 hover:bg-green-100" title="Modifica vendita" aria-label={`Modifica ${sale.itemName}`}><Edit className="h-4 w-4" /></button><button onClick={() => handleDeleteSale(sale.id)} className="flex min-h-11 min-w-11 flex-1 sm:flex-none items-center justify-center rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Elimina vendita" aria-label={`Elimina ${sale.itemName}`}><Trash2 className="h-4 w-4" /></button></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-0.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </article>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs sm:text-sm text-gray-500">Visualizzate <span className="font-semibold text-gray-700">{salesStart}–{salesEnd}</span> di <span className="font-semibold text-gray-700">{userSales.length}</span> vendite</div>
                {salesPageCount > 1 && <div className="flex items-center justify-between sm:justify-end gap-2"><button type="button" onClick={() => setSalesPage(page => Math.max(1, page - 1))} disabled={salesPage === 1} className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:border-yellow-300 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Precedente</span></button><div className="flex h-10 min-w-24 items-center justify-center rounded-lg bg-yellow-50 px-3 text-sm font-bold text-yellow-700">Pagina {salesPage} / {salesPageCount}</div><button type="button" onClick={() => setSalesPage(page => Math.min(salesPageCount, page + 1))} disabled={salesPage === salesPageCount} className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:border-yellow-300 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-40"><span className="hidden sm:inline mr-1">Successiva</span><ChevronRight className="h-4 w-4" /></button></div>}
              </div>
            </div>}
          </section>
        )}

        {canManageEmployees && (
          <div className="mt-8">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-t-xl p-6 text-white cursor-pointer" onClick={() => setIsEmployeeManagementExpanded(!isEmployeeManagementExpanded)}><div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="flex items-center space-x-3"><div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Users className="h-6 w-6" /></div><div><h2 className="text-xl font-bold">Gestione Dipendenti</h2><p className="text-yellow-100 text-sm">Gestisci il team Aurum Motors</p></div></div><div className="flex items-center space-x-4"><div className="text-right"><p className="text-2xl font-bold">{employees.filter(e => e.isOnService).length}</p><p className="text-yellow-100 text-sm">Dipendenti in Servizio</p></div><ChevronDown className={`h-6 w-6 transition-transform duration-200 ${isEmployeeManagementExpanded ? 'rotate-180' : ''}`} /></div></div></div>
            <div className={`bg-white shadow-lg overflow-hidden transition-all duration-300 ${isEmployeeManagementExpanded ? 'rounded-b-xl' : 'max-h-0'}`}>
              <div className="grid gap-4 p-6">
                {employees.length === 0 ? <div className="text-center py-12"><Users className="h-12 w-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">Nessun dipendente</h3><p className="text-gray-500">Non ci sono dipendenti da gestire al momento.</p></div> : <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                  {employees.map((employee) => {
                    const getRoleIcon = (role: string) => { switch (role) { case 'owner': return <Shield className="h-5 w-5 text-red-600" />; case 'director': return <Crown className="h-5 w-5 text-amber-600" />; case 'vice_director': return <Award className="h-5 w-5 text-orange-600" />; case 'employee': return <UserCheck className="h-5 w-5 text-blue-600" />; case 'probation': return <Clock className="h-5 w-5 text-orange-600" />; default: return <UserCheck className="h-5 w-5 text-gray-600" />; } };
                    const getRoleColor = (role: string) => { switch (role) { case 'owner': return 'bg-red-50 border-red-200 text-red-700'; case 'director': return 'bg-amber-50 border-amber-200 text-amber-700'; case 'vice_director': return 'bg-orange-50 border-orange-200 text-orange-700'; case 'employee': return 'bg-blue-50 border-blue-200 text-blue-700'; case 'probation': return 'bg-orange-50 border-orange-200 text-orange-700'; default: return 'bg-gray-50 border-gray-200 text-gray-700'; } };
                    return <div key={`${employee.id}-${lastServiceUpdate}`} className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-yellow-400 transition-all duration-300 hover:-translate-y-1">
                      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center space-x-3"><Avatar src={employee.avatar_url} alt={employee.name} size="lg" fallbackText={employee.name} className="shadow-lg" /><div className="min-w-0"><h3 className="truncate font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">{employee.name}</h3><p className="text-sm text-gray-500 truncate max-w-[200px]">{employee.email}</p></div></div><div className="flex shrink-0 items-center space-x-1"><div className={`w-2 h-2 rounded-full ${employee.isOnService ? 'bg-green-400' : 'bg-gray-300'}`}></div><span className={`text-xs font-medium ${employee.isOnService ? 'text-green-600' : 'text-gray-500'}`}>{employee.isOnService ? 'In Servizio' : 'Fuori Servizio'}</span></div></div>
                      <div className="space-y-3 mb-4"><div className={`flex items-center justify-between p-3 rounded-lg border ${getRoleColor(employee.role)}`}><div className="flex items-center space-x-2">{getRoleIcon(employee.role)}<span className="font-medium text-sm">{employee.role === 'owner' ? 'Proprietario' : employee.role === 'director' ? 'Direttore' : employee.role === 'vice_director' ? 'Vice Direttore' : employee.role === 'employee' ? 'Dipendente' : 'In Prova'}</span></div></div><div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200"><div className="flex items-center space-x-2"><Car className="h-4 w-4 text-yellow-600" /><span className="font-medium text-sm text-yellow-700">Concessionario</span></div></div></div>
                      <div className="flex space-x-2"><button onClick={() => handlePromoteEmployee(employee)} className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-4 py-2.5 rounded-lg font-medium hover:from-yellow-600 hover:to-amber-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"><UserCheck className="h-4 w-4" /><span>Gestisci</span></button></div>
                      <div className="mt-4 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>;
                  })}
                </div>}
              </div>
            </div>
          </div>
        )}

        <AddSaleModal isOpen={showAddSale} onClose={() => setShowAddSale(false)} onAdd={handleAddSale} />
        <ViewSaleModal isOpen={showViewSale} onClose={() => setShowViewSale(false)} sale={selectedSale} />
        <EditSaleModal isOpen={showEditSale} onClose={() => setShowEditSale(false)} onEdit={handleEditSale} sale={selectedSale} />
        {selectedEmployee && <PromoteEmployeeModal isOpen={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} onPromote={handleRoleUpdate} onFire={handleFireEmployee} employee={selectedEmployee} currentUserRole={user?.role || 'employee'} />}
        <ActivityLogsPanel isOpen={showActivityLogs} onClose={() => setShowActivityLogs(false)} />
      </div>
    </div>
  );
};
