import React, { useMemo } from 'react';
import { CalendarDays, Check, Clock3 } from 'lucide-react';

export interface AvailabilityDay { enabled: boolean; start: string; end: string; }
export type Availability = Record<string, AvailabilityDay>;
export const AVAILABILITY_DAYS = [['monday', 'Lunedì'], ['tuesday', 'Martedì'], ['wednesday', 'Mercoledì'], ['thursday', 'Giovedì'], ['friday', 'Venerdì'], ['saturday', 'Sabato'], ['sunday', 'Domenica']] as const;
const DEFAULT_DAY: AvailabilityDay = { enabled: false, start: '09:00', end: '18:00' };
export const createDefaultAvailability = (): Availability => Object.fromEntries(AVAILABILITY_DAYS.map(([key]) => [key, { ...DEFAULT_DAY }])) as Availability;
export const parseAvailability = (value?: string | null): Availability => {
  if (!value) return createDefaultAvailability();
  try {
    const parsed = JSON.parse(value) as Partial<Availability>;
    const defaults = createDefaultAvailability();
    for (const [key] of AVAILABILITY_DAYS) if (parsed[key]) defaults[key] = { ...defaults[key], ...parsed[key] };
    return defaults;
  } catch { return createDefaultAvailability(); }
};
export const serializeAvailability = (availability: Availability): string => JSON.stringify(availability);
interface Props { value?: string | null; onChange: (value: string) => void; }

export const AvailabilityEditor: React.FC<Props> = ({ value, onChange }) => {
  const availability = useMemo(() => parseAvailability(value), [value]);
  const update = (day: string, patch: Partial<AvailabilityDay>) => onChange(serializeAvailability({ ...availability, [day]: { ...availability[day], ...patch } }));
  return <section className="w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="flex min-w-0 items-center gap-3 border-b border-gray-100 px-3 py-2.5 sm:px-4 sm:py-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 sm:h-9 sm:w-9"><CalendarDays className="h-4 w-4" /></div><div className="min-w-0"><h4 className="text-sm font-semibold leading-tight text-gray-900">Disponibilità</h4><p className="mt-0.5 truncate text-xs text-gray-500">Giorni e orari di lavoro</p></div></div>
    <div className="divide-y divide-gray-100">{AVAILABILITY_DAYS.map(([key, label]) => { const day = availability[key]; return <div key={key} className="grid min-w-0 grid-cols-1 items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] sm:gap-4 sm:px-4"><label className="flex min-w-0 cursor-pointer items-center gap-2"><span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${day.enabled ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'}`}>{day.enabled && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span><input type="checkbox" checked={day.enabled} onChange={e => update(key, { enabled: e.target.checked })} className="sr-only" /><span className={`truncate text-sm font-medium ${day.enabled ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span></label>{day.enabled ? <div className="flex min-w-0 w-full items-center gap-1.5 sm:justify-end sm:gap-2"><Clock3 className="h-3.5 w-3.5 shrink-0 text-gray-400" /><input aria-label={`${label} inizio`} type="time" value={day.start} onChange={e => update(key, { start: e.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-[92px] sm:flex-none" /><span className="shrink-0 px-0.5 text-xs font-medium text-gray-400">—</span><input aria-label={`${label} fine`} type="time" value={day.end} onChange={e => update(key, { end: e.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-[92px] sm:flex-none" /></div> : <span className="truncate text-xs text-gray-400 sm:text-right">Non disponibile</span>}</div>; })}</div>
  </section>;
};