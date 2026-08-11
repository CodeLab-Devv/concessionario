import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { supabase } from '../lib/supabase';

import { Clock, Activity, X, Search } from 'lucide-react';

interface ActivityLogsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogsPanel: React.FC<ActivityLogsPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  // Filter logs based on search term, action filter, and date filter
  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, dateFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching logs:', error);
        return;
      }

      const logsData: ActivityLog[] = data?.map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        details: log.details,
        timestamp: log.created_at || log.timestamp,
        targetUserId: log.target_user_id
      })) || [];

      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique actions for filter dropdown
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN': return '🔑';
      case 'LOGOUT': return '🚪';
      case 'REGISTER': return '👤';
      case 'Cambio Ruolo': return '⬆️';
      case 'Licenziamento': return '❌';
      case 'Creazione Vendita': return '💰';
      case 'Modifica Vendita': return '✏️';
      case 'Eliminazione Vendita': return '🗑️';
      case 'Creazione Lavoro': return '🔧';
      case 'Modifica Lavoro': return '🔄';
      case 'Eliminazione Lavoro': return '❌';
      case 'Creazione Documento': return '📄';
      case 'Modifica Documento': return '📝';
      case 'Eliminazione Documento': return '🗂️';
      case 'Stato Servizio': return '🔄';
      case 'Accesso': return '🔑';
      case 'Registrazione Proprietario': return '👑';
      default: return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'text-green-600';
      case 'LOGOUT': return 'text-gray-600';
      case 'REGISTER': return 'text-blue-600';
      case 'Cambio Ruolo': return 'text-purple-600';
      case 'Licenziamento': return 'text-red-600';
      case 'Creazione Vendita': return 'text-green-600';
      case 'Modifica Vendita': return 'text-yellow-600';
      case 'Eliminazione Vendita': return 'text-red-600';
      case 'Creazione Lavoro': return 'text-blue-600';
      case 'Modifica Lavoro': return 'text-yellow-600';
      case 'Eliminazione Lavoro': return 'text-red-600';
      case 'Creazione Documento': return 'text-indigo-600';
      case 'Modifica Documento': return 'text-orange-600';
      case 'Eliminazione Documento': return 'text-red-600';
      case 'Stato Servizio': return 'text-cyan-600';
      case 'Accesso': return 'text-green-600';
      case 'Registrazione Proprietario': return 'text-purple-800';
      default: return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Log Attività Sistema</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {filteredLogs.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca nei log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Row */}
          <div className="flex gap-3">
            {/* Action Filter */}
            <div className="flex-1">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">Tutte le azioni</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex-1">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">Tutti i periodi</option>
                <option value="today">Oggi</option>
                <option value="week">Ultima settimana</option>
                <option value="month">Ultimo mese</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Caricamento log...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{logs.length === 0 ? 'Nessun log disponibile' : 'Nessun risultato trovato'}</p>
              {logs.length > 0 && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActionFilter('all');
                    setDateFilter('all');
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Cancella filtri
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">{getActionIcon(log.action)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`font-semibold ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 break-words leading-relaxed">{log.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(log.timestamp).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Footer with stats */}
          {!loading && logs.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Mostrando {filteredLogs.length} di {logs.length} log</span>
                <span>Aggiornato: {new Date().toLocaleTimeString('it-IT')}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};