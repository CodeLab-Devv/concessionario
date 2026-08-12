import { useCallback } from 'react';
import { useRealtimeSubscription, type RealtimePayload } from './useRealtimeSubscription';
interface UseDashboardRealtimeOptions { userRole?: string; enabled?: boolean; }
interface UserRealtimeRow { id:string; name:string; is_on_service:boolean|null; }
const ROLES=new Set(['owner','director','vice_director']);
export const useDashboardRealtime=({userRole,enabled=true}:UseDashboardRealtimeOptions)=>{
 const handleSalesChange=useCallback((payload:RealtimePayload)=>window.dispatchEvent(new CustomEvent('dashboardSalesRealtimeChange',{detail:{eventType:payload.eventType,new:payload.new??null,old:payload.old??null}})),[]);
 const handleUsersChange=useCallback((payload:RealtimePayload)=>{const prev=(payload.old||null) as UserRealtimeRow|null;const row=(payload.new||null) as UserRealtimeRow|null;if(payload.eventType==='UPDATE'&&prev&&row&&prev.is_on_service!==row.is_on_service){window.dispatchEvent(new CustomEvent('employeeServiceStatusChanged',{detail:{userId:row.id,userName:row.name,oldStatus:prev.is_on_service,newStatus:row.is_on_service,timestamp:new Date().toISOString()}}));}window.dispatchEvent(new CustomEvent('dashboardUserRealtimeChange',{detail:{eventType:payload.eventType,new:payload.new??null,old:payload.old??null}}));},[]);
 useRealtimeSubscription({table:'sales',onInsert:handleSalesChange,onUpdate:handleSalesChange,onDelete:handleSalesChange,enabled});
 useRealtimeSubscription({table:'users',onInsert:handleUsersChange,onUpdate:handleUsersChange,onDelete:handleUsersChange,enabled:enabled&&ROLES.has(userRole||'')});
};
