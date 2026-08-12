import React, { useEffect, useMemo, useState } from 'react';
import { ActivityLog } from '../types';
import { supabase } from '../lib/supabase';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  FilePlus2,
  FileText,
  Pencil,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

interface ActivityLogsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type LogRelation = {
  id: string;
  name: string;
  role: ActivityLog['actor'] extends infer T ? T extends { role: infer R } ? R : never : never;
  avatar_url?: string | null;
};

type LogRow = {
  id: string;
  user_id: string | null;
  action: string;
  details: string;
  target_user_id: string | null;
  created_at: string;
  table_name: string | null;
  record_id: string | null;
  metadata: Record<string, unknown> | null;
  actor: LogRelation | null;
  target: LogRelation | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietario',
  director: 'Direttore',
  vice_director: 'Vice Direttore',
  employee: 'Dipendente',
  probation: 'In prova',
};

const formatRole = (role?: string | null) => ROLE_LABELS[role ?? ''] ?? 'Utente';

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));

const getActionGroup = (action: string) => {
  if (/Elimin|rimosso|licenzi/i.test(action)) return 'delete';
  if (/Modific|Aggiorn|Cambio/i.test(action)) return 'update';
  if (/Creazione|Creat|assegnat|registrat|pubblicat|aggiunt/i.test(action)) return 'create';
  if (/visual|visualizz/i.test(action)) return 'view';
  if (/servizio|accesso|uscit/i.test(action)) return 'status';
  if (/richiamo|disciplin/i.test(action)) return 'warning';
  return 'default';
};

const getActionIcon = (action: string) => {
  switch (getActionGroup(action)) {
    case 'delete':
      return <Trash2 className="h-4 w-4" />;
    case 'update':
      return <Pencil className="h-4 w-4" />;
    case 'create':
      return <FilePlus2 className="h-4 w-4" />;
    case 'view':
      return <Eye className="h-4 w-4" />;
    case 'status':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'warning':
      return <ShieldAlert className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getActionClasses = (action: string) => {
  switch (getActionGroup(action)) {
    case 'delete':
      return 'bg-red-50 text-red-700 ring-red-200';
    case 'update':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'create':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'view':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
    case 'status':
      return 'bg-cyan-50 text-cyan-700 ring-cyan-200';
    case 'warning':
      return 'bg-orange-50 text-orange-700 ring-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 ring-gray-200';
  }
};

const getFriendlyTableName = (table?: string | null) => {
  switch (table) {
    case 'daily_shifts':
      return 'Turni';
    case 'announcements':
      return 'Annunci';
    case 'announcement_reads':
      return 'Letture annunci';
    case 'sales':
      return 'Vendite';
    case 'users':
      return 'Utenti';
    case 'vehicles':
      return 'Veicoli';
    case 'disciplinary_warnings':
      return 'Richiami disciplinari';
    case 'pending_employee_registrations':
      return 'Registrazioni';
    default:
      return table ? table.replaceAll('_', ' ') : 'Sistema';
  }
};

const getMetadataSummary = (metadata: Record<string, unknown> | null) => {
  if (!metadata) return null;
  const operation = typeof metadata.operation === 'string' ? metadata.operation : null;
  return operation ? operation : null;
};

export const ActivityLogsPanel: React.FC<ActivityLogsPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select(
            `
              id,
              user_id,
              action,
              details,
              target_user_id,
              created_at,
              table_name,
              record_id,
              metadata,
              actor:users!activity_logs_user_id_fkey(id,name,role,avatar_url),
              target:users!activity_logs_target_user_id_fkey(id,name,role,avatar_url)
            `,
          )
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) throw error;
        if (!active) return;

        setLogs(
          ((data ?? []) as unknown as LogRow[]).map((log) => ({
            id: log.id,
            userId: log.user_id,
            action: log.action,
            details: log.details,
            timestamp: log.created_at,
            created_at: log.created_at,
            targetUserId: log.target_user_id,
            tableName: log.table_name,
            recordId: log.record_id,
            metadata: log.metadata,
            actor: log.actor,
            target: log.target,
          })),
        );
      } catch (error) {
        console.error('Errore caricamento log attività:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchLogs();

    const channel = supabase
      .channel('activity-logs-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        async (payload) => {
          if (!active) return;

          if (payload.eventType === 'DELETE') {
            const id = String((payload.old as { id?: string }).id ?? '');
            if (id) setLogs((current) => current.filter((log) => log.id !== id));
            return;
          }

          const row = payload.new as LogRow;
          if (!row?.id) return;

          const { data } = await supabase
            .from('activity_logs')
            .select(
              `
                id,
                user_id,
                action,
                details,
                target_user_id,
                created_at,
                table_name,
                record_id,
                metadata,
                actor:users!activity_logs_user_id_fkey(id,name,role,avatar_url),
                target:users!activity_logs_target_user_id_fkey(id,name,role,avatar_url)
              `,
            )
            .eq('id', row.id)
            .maybeSingle();

          if (!data) return;

          const mapped = data as unknown as LogRow;
          const nextLog: ActivityLog = {
            id: mapped.id,
            userId: mapped.user_id,
            action: mapped.action,
            details: mapped.details,
            timestamp: mapped.created_at,
            created_at: mapped.created_at,
            targetUserId: mapped.target_user_id,
            tableName: mapped.table_name,
            recordId: mapped.record_id,
            metadata: mapped.metadata,
            actor: mapped.actor,
            target: mapped.target,
          };

          setLogs((current) => {
            const withoutCurrent = current.filter((log) => log.id !== nextLog.id);
            return [nextLog, ...withoutCurrent].slice(0, 1000);
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [isOpen]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    const query = searchTerm.trim().toLowerCase();

    if (query) {
      result = result.filter((log) =>
        [
          log.action,
          log.details,
          log.actor?.name,
          log.target?.name,
          getFriendlyTableName(log.tableName),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      );
    }

    if (actionFilter !== 'all') result = result.filter((log) => log.action === actionFilter);

    if (dateFilter !== 'all') {
      const now = new Date();
      const from = new Date(now);
      if (dateFilter === 'today') from.setHours(0, 0, 0, 0);
      if (dateFilter === 'week') from.setDate(now.getDate() - 7);
      if (dateFilter === 'month') from.setMonth(now.getMonth() - 1);
      result = result.filter((log) => new Date(log.timestamp) >= from);
    }

    return result;
  }, [logs, searchTerm, actionFilter, dateFilter]);

  const uniqueActions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort((a, b) => a.localeCompare(b, 'it')),
    [logs],
  );

  if (!isOpen) return null;

  return (
    <div className="safe-area-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-5">
      <div className="modal-shell flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-bold text-gray-900">Registro attività</h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  {filteredLogs.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">Eventi registrati in tempo reale</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi registro attività"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 border-b border-gray-200 bg-gray-50/60 p-4 sm:p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca azione, dipendente, annuncio, turno..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100"
            >
              <option value="all">Tutte le azioni</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100"
            >
              <option value="all">Tutto lo storico</option>
              <option value="today">Oggi</option>
              <option value="week">Ultimi 7 giorni</option>
              <option value="month">Ultimo mese</option>
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-b-red-600" />
              <p className="mt-3 text-sm text-gray-500">Caricamento registro...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="font-semibold text-gray-700">Nessuna attività trovata</p>
              <p className="mt-1 text-sm text-gray-500">Prova a modificare ricerca o filtri.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md sm:p-5"
                >
                  <div className="flex gap-3 sm:gap-4">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${getActionClasses(log.action)}`}
                      aria-hidden="true"
                    >
                      {getActionIcon(log.action)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-gray-900">{log.action}</h4>
                            {log.tableName && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                                {getFriendlyTableName(log.tableName)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm leading-6 text-gray-700">{log.details}</p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span title={formatDateTime(log.timestamp)}>{formatDateTime(log.timestamp)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5 text-gray-400" />
                          <strong className="text-gray-700">Da:</strong>
                          {log.actor?.name ?? 'Sistema'}
                          {log.actor?.role && <span className="text-gray-400">({formatRole(log.actor.role)})</span>}
                        </span>

                        {log.target?.name && (
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5 text-gray-400" />
                            <strong className="text-gray-700">Su:</strong>
                            {log.target.name}
                            {log.target.role && <span className="text-gray-400">({formatRole(log.target.role)})</span>}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                          <strong className="text-gray-700">Orario:</strong>
                          {new Date(log.timestamp).toLocaleTimeString('it-IT')}
                        </span>

                        {getMetadataSummary(log.metadata) && (
                          <span className="inline-flex items-center gap-1.5 text-gray-400">
                            <Database className="h-3.5 w-3.5" />
                            Operazione registrata
                          </span>
                        )}
                      </div>

                      {log.tableName && log.recordId && (
                        <details className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-gray-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Dettagli tecnici
                          </summary>
                          <div className="mt-2 grid gap-1 text-[11px] leading-5 text-gray-500 sm:grid-cols-2">
                            <span>Tabella: {getFriendlyTableName(log.tableName)}</span>
                            <span>ID record: {log.recordId}</span>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && logs.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-400">
              Mostrando {filteredLogs.length} di {logs.length} attività. Gli eventi nuovi compaiono automaticamente senza aggiornare la pagina.
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50/70 p-4 sm:p-5">
          <button onClick={onClose} className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
