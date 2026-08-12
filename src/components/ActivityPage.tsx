import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Search,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type RealtimeRow = Record<string, unknown> & {
  id?: string; employee_id?: string; employee_name?: string; item_name?: string;
  car_model?: string; price?: number | string; quantity?: number | string; total?: number | string;
  date?: string; type?: string; category?: string; discount_type?: string; created_at?: string;
};

import { Sale, User } from '../types';

interface SaleRow {
  id: string;
  employee_id: string;
  employee_name: string;
  item_name: string;
  car_model?: string | null;
  price: number | string;
  quantity: number | string;
  total: number | string;
  date: string;
  discount_type?: 'employee' | 'collaboration' | null;
  created_at?: string | null;
}

type SortMode =
  | 'revenue-desc'
  | 'revenue-asc'
  | 'name-asc'
  | 'name-desc'
  | 'sales-desc'
  | 'sales-asc';
type Period = 'week' | 'month' | 'all';

const days = [
  ['1', 'Lun'],
  ['2', 'Mar'],
  ['3', 'Mer'],
  ['4', 'Gio'],
  ['5', 'Ven'],
  ['6', 'Sab'],
  ['0', 'Dom'],
] as const;

const money = (value: number) => `$${Math.round(value).toLocaleString('it-IT')}`;

const weekStart = () => {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
};

const periodLabels: Record<Period, string> = {
  week: 'Settimana corrente',
  month: 'Mese corrente',
  all: 'Tutto lo storico',
};

export const ActivityPage: React.FC = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState('all');
  const [sort, setSort] = useState<SortMode>('revenue-desc');
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);

  const isHighRank = ['owner', 'director', 'vice_director'].includes(user?.role || '');
  const isOnService = Boolean(user?.isOnService);

  const load = useCallback(async () => {
    if (!user || !isHighRank || !isOnService) return;

    setLoading(true);

    try {
      const salesQuery = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      const [salesResult, usersResult] = await Promise.all([
        salesQuery,
        supabase
          .from('users')
          .select('id,name,email,role,employee_type,avatar_url,created_at')
          .order('name'),
      ]);

      if (!salesResult.error) {
        setSales(
          ((salesResult.data || []) as SaleRow[]).map((sale) => ({
            id: sale.id,
            employeeId: sale.employee_id,
            employeeName: sale.employee_name,
            itemName: sale.item_name,
            carModel: sale.car_model ?? undefined,
            price: Number(sale.price) || 0,
            quantity: Number(sale.quantity) || 0,
            total: Number(sale.total) || 0,
            date: sale.date,
            type: 'sale',
            category: 'concessionari',
            discountType: sale.discount_type ?? undefined,
            created_at: sale.created_at || `${sale.date}T00:00:00.000Z`,
          })),
        );
      }

      if (!usersResult.error) {
        setUsers((usersResult.data || []) as User[]);
      }
    } finally {
      setLoading(false);
    }
  }, [isHighRank, isOnService, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(()=>{if(!isHighRank||!isOnService)return;const toSale=(row:RealtimeRow):Sale=>({id:String(row.id),employeeId:String(row.employee_id),employeeName:String(row.employee_name||''),itemName:String(row.item_name||''),carModel:row.car_model??undefined,price:Number(row.price)||0,quantity:Number(row.quantity)||0,total:Number(row.total)||0,date:String(row.date||new Date().toISOString().slice(0,10)),type:'sale',category:'concessionari',discountType:row.discount_type??undefined,created_at:row.created_at||new Date().toISOString()});const channel=supabase.channel('activity-live').on('postgres_changes',{event:'INSERT',schema:'public',table:'sales'},payload=>{const row=toSale(payload.new as RealtimeRow);setSales(current=>current.some(item=>item.id===row.id)?current:[row,...current]);}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'sales'},payload=>{const row=toSale(payload.new as RealtimeRow);setSales(current=>current.some(item=>item.id===row.id)?current.map(item=>item.id===row.id?row:item):[row,...current]);}).on('postgres_changes',{event:'DELETE',schema:'public',table:'sales'},payload=>{const id=(payload.old as {id?:string}).id;if(id)setSales(current=>current.filter(item=>item.id!==id));}).on('postgres_changes',{event:'*',schema:'public',table:'users'},payload=>{const row=(payload.new||payload.old) as RealtimeRow;if(!row?.id)return;if(payload.eventType==='DELETE'){setUsers(current=>current.filter(item=>item.id!==row.id));return;}const mapped=row as User;setUsers(current=>current.some(item=>item.id===mapped.id)?current.map(item=>item.id===mapped.id?{...item,...mapped}:item):[...current,mapped]);}).subscribe();return()=>{void supabase.removeChannel(channel);};},[isHighRank,isOnService]);

  const filtered = useMemo(() => {
    const now = new Date();
    const start =
      period === 'week'
        ? weekStart()
        : period === 'month'
          ? new Date(now.getFullYear(), now.getMonth(), 1)
          : null;

    const query = q.trim().toLowerCase();

    return sales.filter((sale) => {
      const saleDate = new Date(sale.created_at || sale.date);
      return (
        (!start || saleDate >= start) &&
        (selected === 'all' || sale.employeeId === selected) &&
        (!query || sale.employeeName.toLowerCase().includes(query))
      );
    });
  }, [period, q, sales, selected]);

  const stats = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sales: number; revenue: number }>();

    users.forEach((employee) => {
      map.set(employee.id, {
        id: employee.id,
        name: employee.name,
        sales: 0,
        revenue: 0,
      });
    });

    filtered.forEach((sale) => {
      const current =
        map.get(sale.employeeId) || {
          id: sale.employeeId,
          name: sale.employeeName,
          sales: 0,
          revenue: 0,
        };

      current.sales += 1;
      current.revenue += sale.total;
      map.set(sale.employeeId, current);
    });

    return [...map.values()]
      .filter((employee) => !q.trim() || employee.name.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => {
        switch (sort) {
          case 'revenue-desc':
            return b.revenue - a.revenue;
          case 'revenue-asc':
            return a.revenue - b.revenue;
          case 'name-asc':
            return a.name.localeCompare(b.name, 'it');
          case 'name-desc':
            return b.name.localeCompare(a.name, 'it');
          case 'sales-desc':
            return b.sales - a.sales;
          default:
            return a.sales - b.sales;
        }
      });
  }, [filtered, q, sort, users]);

  const chart = useMemo(
    () =>
      days.map(([key, label]) => {
        const date = weekStart();
        date.setDate(date.getDate() + (key === '0' ? 6 : Number(key) - 1));
        const dateKey = date.toISOString().slice(0, 10);

        return {
          label,
          dateKey,
          revenue: filtered
            .filter((sale) => sale.date === dateKey)
            .reduce((total, sale) => total + sale.total, 0),
        };
      }),
    [filtered],
  );

  const total = filtered.reduce((value, sale) => value + sale.total, 0);
  const max = Math.max(...chart.map((day) => day.revenue), 1);
  const bestDay = chart.reduce((best, day) => (day.revenue > best.revenue ? day : best), chart[0]);
  const activeEmployees = stats.filter((employee) => employee.sales > 0).length;

  if (!isHighRank) {
    return (
      <div className="flex min-h-[520px] items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-xl shadow-gray-200/40">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <Activity className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Sezione riservata</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Le analisi delle performance sono disponibili solo ai gradi alti.
          </p>
        </div>
      </div>
    );
  }

  if (!isOnService) {
    return (
      <div className="flex min-h-[520px] items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-amber-200 bg-white p-10 text-center shadow-xl shadow-amber-100/50">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <Activity className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Non sei in servizio</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Metti lo stato in servizio per visualizzare le attività del concessionario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-950 via-gray-900 to-amber-950 px-5 py-6 text-white shadow-xl shadow-gray-200/50 sm:px-7 sm:py-7">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur-sm">
              <Activity className="h-3.5 w-3.5" />
              Performance riservate
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Attività</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
              Una panoramica chiara di fatturato, vendite e rendimento del team.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm">
            {(['week', 'month', 'all'] as Period[]).map((value) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
                  period === value
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {value === 'week' ? 'Settimana' : value === 'month' ? 'Mese' : 'Tutto'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Fatturato</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-gray-950">{money(total)}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            {periodLabels[period]}
          </div>
        </div>

        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vendite</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-gray-950">{filtered.length}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-xs font-medium text-gray-400">Operazioni concluse</p>
        </div>

        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Giorno migliore</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-gray-950">{bestDay?.label || '—'}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold text-yellow-600">{money(bestDay?.revenue || 0)}</p>
        </div>

        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Team attivo</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-gray-950">{activeEmployees}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-xs font-medium text-gray-400">Dipendenti con vendite</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <BarChart3 className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-950">Andamento del fatturato</h2>
                <p className="text-xs text-gray-400">Lunedì → Domenica · {periodLabels[period]}</p>
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 xl:self-auto">
            <CalendarDays className="h-4 w-4 text-amber-500" />
            Picco: <span className="text-gray-950">{bestDay?.label || '—'}</span>
            <span className="text-amber-600">{money(bestDay?.revenue || 0)}</span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="relative h-[320px]">
            <div className="absolute inset-x-0 top-0 bottom-9 flex flex-col justify-between text-[10px] text-gray-300">
              {[1, 0.75, 0.5, 0.25, 0].map((value) => (
                <div key={value} className="flex items-center gap-3">
                  <span className="w-14 text-right font-medium">{money(max * value)}</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
              ))}
            </div>

            <div className="absolute inset-x-16 bottom-0 top-2 flex items-end justify-between gap-2 sm:gap-4">
              {chart.map((day) => {
                const height = day.revenue ? Math.max((day.revenue / max) * 100, 6) : 2;
                const active = day.revenue === max && day.revenue > 0;

                return (
                  <div key={day.label} className="group flex h-full flex-1 flex-col items-center justify-end">
                    <div className="mb-2 translate-y-1 rounded-lg border border-gray-800 bg-gray-950 px-2.5 py-1.5 text-[10px] font-bold text-white opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">
                      {money(day.revenue)}
                    </div>
                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        className={`w-full max-w-14 rounded-t-xl transition-all duration-500 group-hover:-translate-y-1 ${
                          active
                            ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-300 shadow-lg shadow-amber-200'
                            : 'bg-gradient-to-t from-amber-500/85 to-yellow-200'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className={`mt-3 text-xs font-semibold ${active ? 'text-amber-600' : 'text-gray-400'}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="font-bold text-gray-950">Classifica dipendenti</h2>
              <p className="mt-1 text-xs text-gray-400">Confronta il rendimento del team nel periodo selezionato.</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-0 sm:min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cerca dipendente..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-50"
                />
              </div>

              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-50"
              >
                <option value="all">Tutti i dipendenti</option>
                {users.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-50"
              >
                <option value="revenue-desc">Fatturato più alto</option>
                <option value="revenue-asc">Fatturato più basso</option>
                <option value="sales-desc">Vendite più alte</option>
                <option value="sales-asc">Vendite più basse</option>
                <option value="name-asc">Nome A → Z</option>
                <option value="name-desc">Nome Z → A</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-amber-500" />
              <p className="text-sm text-gray-500">Caricamento attività...</p>
            </div>
          </div>
        ) : stats.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Nessun risultato</p>
            <p className="mt-1 text-xs text-gray-400">Prova a cambiare i filtri o la ricerca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3.5">Dipendente</th>
                  <th className="px-4 py-3.5">Vendite</th>
                  <th className="px-4 py-3.5">Fatturato</th>
                  <th className="px-4 py-3.5">Media</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((employee, index) => (
                  <tr key={employee.id} className="group border-b border-gray-50 last:border-0 hover:bg-amber-50/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            index === 0
                              ? 'bg-amber-100 text-amber-700'
                              : index === 1
                                ? 'bg-slate-100 text-slate-600'
                                : index === 2
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-gray-900">{employee.name}</div>
                          <div className="text-xs text-gray-400">Performance team</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-600">{employee.sales}</td>
                    <td className="px-4 py-4 text-sm font-black text-gray-950">{money(employee.revenue)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-500">
                      {money(employee.sales ? employee.revenue / employee.sales : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
