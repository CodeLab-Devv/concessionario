import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type { PresenceStatus } from '../types';

type AdminRealtimeRow = Record<string, unknown> & {
  id?: string; name?: string; email?: string; role?: string; employee_id?: string; total?: number | string; availability?: unknown;
  presence_status?: string | null; avatar_url?: string | null;
};

import { supabase } from '../lib/supabase';
import { useRealtimeSubscription, type RealtimePayload } from '../hooks/useRealtimeSubscription';
import { useDialogs } from './ui/DialogManager';
import { Avatar } from './Avatar';
import {
  DollarSign,
  Users,
  TrendingUp,
  Edit3,
  Save,
  X,
  Crown,
  Shield,
  Award,
  UserCheck,
  RefreshCw,
  Clock
} from 'lucide-react';

interface AvailabilityDay {
  enabled?: boolean;
  start?: string;
  end?: string;
}

type Availability = Record<string, AvailabilityDay>;

interface EmployeeRevenue {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation';
  revenue: number;
  commission: number;
  availability: Availability;
  presenceStatus: PresenceStatus;
  avatar_url?: string | null;
}

const WEEKDAYS: Array<{ key: string; label: string }> = [
  { key: 'monday', label: 'Lun' },
  { key: 'tuesday', label: 'Mar' },
  { key: 'wednesday', label: 'Mer' },
  { key: 'thursday', label: 'Gio' },
  { key: 'friday', label: 'Ven' },
  { key: 'saturday', label: 'Sab' },
  { key: 'sunday', label: 'Dom' }
];

const PRESENCE_META: Record<PresenceStatus, { label: string; dot: string }> = {
  available: { label: 'Disponibile', dot: 'bg-emerald-500' },
  inactive: { label: 'Inattivo', dot: 'bg-orange-500' },
  busy: { label: 'Occupato', dot: 'bg-red-500' },
};

const normalizePresence = (status?: string | null): PresenceStatus =>
  status === 'available' || status === 'busy' ? status : 'inactive';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount);

const getDefaultCommission = (role: EmployeeRevenue['role']) => {
  switch (role) {
    case 'owner':
    case 'director':
      return 50;
    case 'vice_director':
      return 45;
    default:
      return 35;
  }
};

const formatAvailability = (availability: Availability) =>
  WEEKDAYS
    .map(({ key, label }) => {
      const day = availability?.[key];
      if (!day?.enabled) return null;
      const start = day.start || '--:--';
      const end = day.end || '--:--';
      return `${label} ${start}-${end}`;
    })
    .filter(Boolean) as string[];

export const AdminPage: React.FC = () => {
  const { user, resetAllData } = useAuth();
  const { showConfirm } = useDialogs();
  const [employees, setEmployees] = useState<EmployeeRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [tempCommission, setTempCommission] = useState<number>(0);
  const [resetting, setResetting] = useState(false);

  const hasAdminAccess = user?.role === 'owner' || user?.role === 'director';

  const fetchEmployeesRevenue = useCallback(async () => {
    if (!hasAdminAccess) return;

    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.warn('AdminPage fetch timed out after 20s');
    }, 20000);

    try {
      setLoading(true);
      const [
        { data: usersData, error: usersError },
        { data: salesData, error: salesError }
      ] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: true }),
        supabase.from('sales').select('employee_id, total')
      ]);

      if (usersError || salesError) {
        console.error('Error fetching employee revenue data:', usersError || salesError);
        return;
      }

      const revenueByEmployee = new Map<string, number>();
      for (const sale of salesData || []) {
        revenueByEmployee.set(
          sale.employee_id,
          (revenueByEmployee.get(sale.employee_id) || 0) + (sale.total || 0)
        );
      }

      const employeesWithRevenue: EmployeeRevenue[] = (usersData || []).map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        revenue: revenueByEmployee.get(emp.id) || 0,
        commission: getDefaultCommission(emp.role),
        availability: (emp.availability && typeof emp.availability === 'object' ? emp.availability : {}) as Availability,
        presenceStatus: normalizePresence(emp.presence_status),
        avatar_url: emp.avatar_url || null,
      }));

      setEmployees(employeesWithRevenue);
    } catch (error) {
      console.error('Error fetching employee revenue data:', error);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [hasAdminAccess]);

  useEffect(() => {
    void fetchEmployeesRevenue();
  }, [fetchEmployeesRevenue]);

  const handleUsersRealtimeChange = useCallback((payload: RealtimePayload) => {
    const row = (payload.new || payload.old) as AdminRealtimeRow;
    if (!row?.id) return;

    setEmployees(current => {
      if (payload.eventType === 'DELETE') return current.filter(item => item.id !== row.id);

      const next: Partial<EmployeeRevenue> & Pick<EmployeeRevenue, 'id' | 'name' | 'email' | 'role' | 'presenceStatus' | 'availability'> = {
        id: String(row.id),
        name: String(row.name || ''),
        email: String(row.email || ''),
        role: String(row.role || 'employee') as EmployeeRevenue['role'],
        availability: (row.availability && typeof row.availability === 'object' ? row.availability : {}) as Availability,
        presenceStatus: normalizePresence(row.presence_status),
        avatar_url: row.avatar_url || null,
      };

      const existing = current.find(item => item.id === next.id);
      if (!existing) {
        return [...current, {
          id: next.id,
          name: next.name,
          email: next.email,
          role: next.role,
          revenue: 0,
          commission: getDefaultCommission(next.role),
          availability: next.availability,
          presenceStatus: next.presenceStatus,
          avatar_url: next.avatar_url,
        }];
      }

      return current.map(item => item.id === next.id ? {
        ...item,
        ...next,
        revenue: item.revenue,
        commission: item.commission,
      } : item);
    });
  }, []);

  const handleSalesRealtimeChange = useCallback((payload: RealtimePayload) => {
    const n = payload.new as AdminRealtimeRow | null;
    const o = payload.old as AdminRealtimeRow | null;
    const ni = n?.employee_id ? String(n.employee_id) : null;
    const oi = o?.employee_id ? String(o.employee_id) : null;
    const nt = Number(n?.total) || 0;
    const ot = Number(o?.total) || 0;

    setEmployees(current => current.map(employee => {
      let d = 0;
      if (payload.eventType === 'INSERT' && employee.id === ni) d = nt;
      if (payload.eventType === 'DELETE' && employee.id === oi) d = -ot;
      if (payload.eventType === 'UPDATE') {
        if (employee.id === oi) d -= ot;
        if (employee.id === ni) d += nt;
      }
      return d ? { ...employee, revenue: Math.max(0, employee.revenue + d) } : employee;
    }));
  }, []);

  useRealtimeSubscription({ table: 'users', onInsert: handleUsersRealtimeChange, onUpdate: handleUsersRealtimeChange, onDelete: handleUsersRealtimeChange, enabled: hasAdminAccess });
  useRealtimeSubscription({ table: 'sales', onInsert: handleSalesRealtimeChange, onUpdate: handleSalesRealtimeChange, onDelete: handleSalesRealtimeChange, enabled: hasAdminAccess });

  const handleEditCommission = (employeeId: string, currentCommission: number) => {
    setEditingCommission(employeeId);
    setTempCommission(currentCommission);
  };

  const handleSaveCommission = (employeeId: string) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === employeeId ? { ...emp, commission: tempCommission } : emp
    ));
    setEditingCommission(null);
  };

  const handleCancelEdit = () => {
    setEditingCommission(null);
    setTempCommission(0);
  };

  const verifyDataDeletion = async () => {
    try {
      const [salesCheck, logsCheck] = await Promise.all([
        supabase.from('sales').select('id', { count: 'exact', head: true }),
        supabase.from('activity_logs').select('id', { count: 'exact', head: true })
      ]);
      const salesCount = salesCheck.count || 0;
      const logsCount = logsCheck.count || 0;
      return { success: salesCount === 0, details: { sales: salesCount, logs: logsCount } };
    } catch (error) {
      console.error('Error verifying data deletion:', error);
      return { success: false, details: null };
    }
  };

  const handleResetAll = async () => {
    if (resetting) return;
    const confirmed = await showConfirm({
      title: 'Ripristina Tutti i Dati',
      message: 'Sei sicuro di voler ripristinare tutti i dati? Questa azione cancellerà tutte le vendite e i log di attività. Questa operazione non può essere annullata.',
      confirmText: 'Ripristina',
      cancelText: 'Annulla',
      type: 'danger',
      icon: 'warning'
    });
    if (!confirmed) return;
    if (!resetAllData) {
      await showConfirm({
        title: 'Errore',
        message: "Funzione di reset non disponibile. Contattare l'amministratore.",
        confirmText: 'OK'
      });
      return;
    }
    try {
      setResetting(true);
      const success = await resetAllData();
      if (success) {
        const verification = await verifyDataDeletion();
        await showConfirm({
          title: verification.success ? 'Reset Completato' : 'Attenzione',
          message: verification.success
            ? `Dati ripristinati con successo!\n\n✅ Vendite cancellate: ${verification.details?.sales || 0}\n✅ Log attività: ${verification.details?.logs || 0}`
            : `Reset parzialmente completato.\n\n📊 Vendite rimanenti: ${verification.details?.sales || 'N/A'}\n📝 Log attività: ${verification.details?.logs || 'N/A'}`,
          confirmText: 'OK',
          type: verification.success ? 'info' : 'warning',
          icon: verification.success ? 'info' : 'warning'
        });
        await fetchEmployeesRevenue();
      } else {
        await showConfirm({ title: 'Errore', message: 'Errore durante il ripristino dei dati. Controlla la console per maggiori dettagli.', confirmText: 'OK', type: 'danger', icon: 'warning' });
      }
    } catch (error) {
      console.error('Error during reset:', error);
      await showConfirm({ title: 'Errore', message: 'Errore durante il ripristino dei dati.', confirmText: 'OK', type: 'danger', icon: 'warning' });
    } finally {
      setResetting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'director': return <Shield className="h-4 w-4 text-purple-600" />;
      case 'vice_director': return <Award className="h-4 w-4 text-blue-600" />;
      case 'employee': return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'probation': return <Award className="h-4 w-4 text-orange-600" />;
      default: return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietario';
      case 'director': return 'Direttore';
      case 'vice_director': return 'Vice Direttore';
      case 'employee': return 'Dipendente';
      case 'probation': return 'In Prova';
      default: return role;
    }
  };

  const totalRevenue = employees.reduce((sum, emp) => sum + emp.revenue, 0);
  const totalCommissions = employees.reduce((sum, emp) => sum + (emp.revenue * emp.commission / 100), 0);

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Accesso Negato</h3>
          <p className="text-gray-600">Solo proprietari e direttori possono accedere a questa sezione.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm"><DollarSign className="h-8 w-8" /></div>
            <div><h1 className="text-2xl font-bold">Gestione Stipendi</h1><p className="text-yellow-100">Gestione fatturato, commissioni e disponibilità dipendenti</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6"><div className="flex items-center space-x-4"><div className="p-3 bg-green-100 rounded-lg"><TrendingUp className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-gray-600">Fatturato Totale</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p></div></div></div>
          <div className="bg-white rounded-xl shadow-lg p-6"><div className="flex items-center justify-between"><div className="flex items-center space-x-4"><div className="p-3 bg-purple-100 rounded-lg"><DollarSign className="h-6 w-6 text-purple-600" /></div><div><p className="text-sm text-gray-600">Stipendi da saldare</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCommissions)}</p></div></div><button onClick={handleResetAll} disabled={resetting} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"><RefreshCw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} /><span>{resetting ? 'Ripristinando...' : 'Ripristina'}</span></button></div></div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">Dipendenti Aurum Motors</h2><p className="text-sm text-gray-600">Dati aggiornati automaticamente in tempo reale.</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dipendente</th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ruolo/Tipo</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponibilità</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fatturato</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commissione</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Totale</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(employee => {
                  const schedule = formatAvailability(employee.availability);
                  const presence = PRESENCE_META[employee.presenceStatus];
                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative shrink-0">
                            <Avatar src={employee.avatar_url ?? undefined} alt={employee.name} size="sm" fallbackText={employee.name || 'U'} />
                            <span title={presence.label} className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${presence.dot}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900 truncate">{employee.name}</div>
                              <span className={`hidden rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:inline-flex ${employee.presenceStatus === 'available' ? 'bg-emerald-50 text-emerald-700' : employee.presenceStatus === 'busy' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>{presence.label}</span>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 truncate">{employee.email}</div>
                            <div className="mt-1 flex items-center gap-1 sm:hidden"><span className={`h-2 w-2 rounded-full ${presence.dot}`} /><span className="text-[10px] font-semibold text-gray-500">{presence.label}</span></div>
                            <div className="sm:hidden mt-1 flex items-center space-x-1">{getRoleIcon(employee.role)}<span className="text-xs text-gray-600">{getRoleLabel(employee.role)}</span></div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4"><div className="flex items-center space-x-2">{getRoleIcon(employee.role)}<div><div className="text-sm font-medium text-gray-900">{getRoleLabel(employee.role)}</div><div className="text-sm text-gray-500">Concessionario</div></div></div></td>
                      <td className="px-3 sm:px-6 py-4"><div className="min-w-[180px]">{schedule.length ? <div className="space-y-1">{schedule.map(day => <div key={day} className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700"><Clock className="h-3.5 w-3.5 text-amber-600" />{day}</div>)}</div> : <span className="text-xs sm:text-sm text-gray-400">Non impostata</span>}</div></td>
                      <td className="px-3 sm:px-6 py-4"><div className="text-sm font-bold text-gray-900">{formatCurrency(employee.revenue)}</div></td>
                      <td className="px-3 sm:px-6 py-4">{editingCommission === employee.id ? <div className="flex items-center space-x-1 sm:space-x-2"><input type="number" value={tempCommission} onChange={e => setTempCommission(Number(e.target.value))} className="w-12 px-1 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 sm:w-16 sm:px-2 sm:py-1 sm:text-sm" min="0" max="100" step="0.1" /><button onClick={() => handleSaveCommission(employee.id)} className="flex min-h-11 min-w-11 items-center justify-center p-1 text-green-600 hover:text-green-800"><Save className="h-3 w-3 sm:h-4 sm:w-4" /></button><button onClick={handleCancelEdit} className="flex min-h-11 min-w-11 items-center justify-center p-1 text-red-600 hover:text-red-800"><X className="h-3 w-3 sm:h-4 sm:w-4" /></button></div> : <div className="flex items-center space-x-1 sm:space-x-2"><span className="text-xs sm:text-sm text-gray-900">{employee.commission}%</span><button onClick={() => handleEditCommission(employee.id, employee.commission)} className="flex min-h-11 min-w-11 items-center justify-center p-1 text-amber-600 hover:text-amber-800"><Edit3 className="h-3 w-3 sm:h-4 sm:w-4" /></button></div>}</td>
                      <td className="px-3 sm:px-6 py-4"><div className="text-sm font-medium text-green-600">{formatCurrency(employee.revenue * employee.commission / 100)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};