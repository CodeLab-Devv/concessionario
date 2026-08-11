import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { supabase } from '../lib/supabase';
import { Clock, Activity, X, Search, Database } from 'lucide-react';

interface ActivityLogsPanelProps { isOpen: boolean; onClose: () => void; }

export const ActivityLogsPanel: React.FC<ActivityLogsPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => { if (isOpen) void fetchLogs(); }, [isOpen]);

  useEffect(() => {
    let filtered = logs;
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(log => log.action.toLowerCase().includes(query) || log.details.toLowerCase().includes(query));
    }
    if (actionFilter !== 'all') filtered = filtered.filter(log => log.action === actionFilter);
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      if (dateFilter === 'today') filterDate.setHours(0, 0, 0, 0);
      if (dateFilter === 'week') filterDate.setDate(now.getDate() - 7);
      if (dateFilter === 'month') filterDate.setMonth(now.getMonth() - 1);
      filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
    }
    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, dateFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(1000);
      if (error) throw error;
      setLogs((data || []).map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        details: log.details,
        timestamp: log.created_at,
        targetUserId: log.target_user_id
      })));
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally { setLoading(false); }
  };

  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();
  const getActionIcon = (action: string) => {
    if (action.includes('Eliminazione')) return '🗑️';
    if (action.includes('Modifica')) return '✏️';
    if (action.includes('Creazione')) return '➕';
    switch (action) {
      case 'LOGIN': case 'Accesso': return '🔑';
      case 'LOGOUT': return '🚪';
      case 'Stato Servizio': return '🔄';
      case 'Visualizzazione Annuncio': return '👁️';
      case 'Cambio Ruolo': return '⬆️';
      case 'Licenziamento': return '❌';
      default: return '📝';
    }
  };
  const getActionColor = (action: string) => {
    if (action.includes('Eliminazione') || action === 'Licenziamento') return 'text-red-600';
    if (action.includes('Modifica') || action === 'Cambio Ruolo') return 'text-amber-600';
    if (action.includes('Creazione')) return 'text-green-600';
    if (action === 'Stato Servizio') return 'text-cyan-600';
    if (action === 'Visualizzazione Annuncio') return 'text-blue-600';
    return 'text-gray-600';
  };

  if (!isOpen) return null;
  return (
    <div className="safe-area-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="modal-shell flex w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-2"><Activity className="h-6 w-6 text-red-600" /><h3 className="text-lg font-semibold text-gray-900">Log Attività Sistema</h3><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">{filteredLogs.length}</span></div>
          <button onClick={onClose} aria-label="Chiudi" className="flex min-h-11 min-w-11 items-center justify-center text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
        </div>
        <div className="space-y-3 border-b border-gray-200 p-6">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Cerca nei log..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500" /></div>
          <div className="flex gap-3"><select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 sm:text-sm"><option value="all">Tutte le azioni</option>{uniqueActions.map(action => <option key={action} value={action}>{action}</option>)}</select><select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 sm:text-sm"><option value="all">Tutti i periodi</option><option value="today">Oggi</option><option value="week">Ultima settimana</option><option value="month">Ultimo mese</option></select></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? <div className="py-8 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" /><p className="mt-2 text-gray-600">Caricamento log...</p></div> : filteredLogs.length === 0 ? <div className="py-8 text-center"><Activity className="mx-auto mb-4 h-12 w-12 text-gray-400" /><p className="text-gray-600">{logs.length === 0 ? 'Nessun log disponibile' : 'Nessun risultato trovato'}</p></div> : <div className="space-y-3">{filteredLogs.map(log => <div key={log.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="text-2xl">{getActionIcon(log.action)}</span><div className="min-w-0"><div className="flex items-center gap-2"><span className={`font-semibold ${getActionColor(log.action)}`}>{log.action}</span></div><p className="mt-1 break-words text-sm leading-relaxed text-gray-600">{log.details}</p></div></div><div className="flex shrink-0 items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" />{new Date(log.timestamp).toLocaleString('it-IT')}</div></div><div className="mt-2 flex items-center gap-1 text-[11px] text-gray-400"><Database className="h-3 w-3" />{log.targetUserId ? `Utente: ${log.targetUserId}` : 'Sistema'}</div></div>)}</div>}
          {!loading && logs.length > 0 && <div className="mt-6 border-t border-gray-200 pt-4 text-xs text-gray-500">Mostrando {filteredLogs.length} di {logs.length} log</div>}
        </div>
        <div className="border-t border-gray-200 p-6"><button onClick={onClose} className="w-full rounded-lg bg-gray-600 px-4 py-2 font-medium text-white hover:bg-gray-700">Chiudi</button></div>
      </div>
    </div>
  );
};
