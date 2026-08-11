import { useCallback } from 'react';
import { useRealtimeSubscription, type RealtimePayload } from './useRealtimeSubscription';
import { Sale, Employee } from '../types';

interface UseDashboardRealtimeOptions {
  onSalesUpdate?: (sales: Sale[]) => void;
  onEmployeesUpdate?: (employees: Employee[]) => void;
  refreshSales: () => Promise<void>;
  refreshEmployees: () => Promise<void>;
  currentUserId?: string;
  userRole?: string;
  enabled?: boolean;
}

interface UserRealtimeRow { id: string; name: string; is_on_service: boolean | null; }

export const useDashboardRealtime = ({ refreshSales, refreshEmployees, userRole, enabled = true }: UseDashboardRealtimeOptions) => {
  const handleSalesChange = useCallback(async (payload: RealtimePayload) => {
    console.log('Sales real-time update:', payload.eventType);
    await refreshSales();
  }, [refreshSales]);

  const handleUsersChange = useCallback(async (payload: RealtimePayload) => {
    if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
      const previousUser = payload.old as UserRealtimeRow;
      const currentUser = payload.new as UserRealtimeRow;
      if (previousUser.is_on_service !== currentUser.is_on_service) {
        window.dispatchEvent(new CustomEvent('employeeServiceStatusChanged', { detail: { userId: currentUser.id, userName: currentUser.name, oldStatus: previousUser.is_on_service, newStatus: currentUser.is_on_service, timestamp: new Date().toISOString() } }));
      }
    }
    if (['owner', 'director', 'vice_director'].includes(userRole || '')) await refreshEmployees();
  }, [refreshEmployees, userRole]);

  useRealtimeSubscription({ table: 'sales', onInsert: handleSalesChange, onUpdate: handleSalesChange, onDelete: handleSalesChange, enabled });
  useRealtimeSubscription({ table: 'users', onInsert: handleUsersChange, onUpdate: handleUsersChange, onDelete: handleUsersChange, enabled: enabled && ['owner', 'director', 'vice_director'].includes(userRole || '') });
};