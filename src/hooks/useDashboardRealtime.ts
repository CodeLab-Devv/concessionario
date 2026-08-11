import { useCallback, useRef, useEffect } from 'react';
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

interface UserRealtimeRow {
  id: string;
  name: string;
  is_on_service: boolean | null;
}

const useDebouncedRefresh = (refreshFn: () => Promise<void>, delayMs: number = 1500) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const runningRef = useRef(false);

  const debouncedRefresh = useCallback(async () => {
    if (runningRef.current) {
      pendingRef.current = true;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (runningRef.current) {
        pendingRef.current = true;
        return;
      }
      try {
        runningRef.current = true;
        pendingRef.current = false;
        await refreshFn();
      } finally {
        runningRef.current = false;
        if (pendingRef.current) {
          pendingRef.current = false;
          timeoutRef.current = setTimeout(async () => {
            try {
              runningRef.current = true;
              await refreshFn();
            } finally {
              runningRef.current = false;
            }
          }, delayMs);
        }
      }
    }, delayMs);
  }, [refreshFn, delayMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedRefresh;
};

export const useDashboardRealtime = ({
  refreshSales,
  refreshEmployees,
  userRole,
  enabled = true
}: UseDashboardRealtimeOptions) => {

  const debouncedSalesRefresh = useDebouncedRefresh(refreshSales, 1200);
  const debouncedEmployeesRefresh = useDebouncedRefresh(refreshEmployees, 1200);

  const handleSalesChange = useCallback(async (payload: RealtimePayload) => {
    console.log('Sales real-time update (debounced):', payload.eventType);
    await debouncedSalesRefresh();
  }, [debouncedSalesRefresh]);

  const handleUsersChange = useCallback(async (payload: RealtimePayload) => {
    console.log('Users real-time update:', payload.eventType);
    
    if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
      const previousUser = payload.old as UserRealtimeRow;
      const currentUser = payload.new as UserRealtimeRow;
      const oldServiceStatus = previousUser.is_on_service;
      const newServiceStatus = currentUser.is_on_service;
      
      if (oldServiceStatus !== newServiceStatus) {
        console.log(`🔄 Service status changed for user ${currentUser.name}: ${oldServiceStatus} → ${newServiceStatus}`);
        
        const event = new CustomEvent('employeeServiceStatusChanged', {
          detail: {
            userId: currentUser.id,
            userName: currentUser.name,
            oldStatus: oldServiceStatus,
            newStatus: newServiceStatus,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(event);
      }
    }
    
    if (['owner', 'director', 'vice_director'].includes(userRole || '')) {
      console.log('🔄 Refreshing employees data (debounced)...');
      await debouncedEmployeesRefresh();
    }
  }, [debouncedEmployeesRefresh, userRole]);

  useRealtimeSubscription({
    table: 'sales',
    onInsert: handleSalesChange,
    onUpdate: handleSalesChange,
    onDelete: handleSalesChange,
    enabled: enabled
  });

  useRealtimeSubscription({
    table: 'users',
    onInsert: handleUsersChange,
    onUpdate: handleUsersChange,
    onDelete: handleUsersChange,
    enabled: enabled && ['owner', 'director', 'vice_director'].includes(userRole || '')
  });

  return {
  };
};
