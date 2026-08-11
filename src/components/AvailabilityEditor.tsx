import React, { useMemo } from 'react';
import { CalendarDays, Check, Clock3 } from 'lucide-react';

export interface AvailabilityDay {
  enabled: boolean;
  start: string;
  end: string;
}

export type Availability = Record<string, AvailabilityDay>;

export const AVAILABILITY_DAYS = [
  ['monday', 'Lunedì'],
  ['tuesday', 'Martedì'],
  ['wednesday', 'Mercoledì'],
  ['thursday', 'Giovedì'],
  ['friday', 'Venerdì'],
  ['saturday', 'Sabato'],
  ['sunday', 'Domenica'],
] as const;

const DEFAULT_DAY: AvailabilityDay = { enabled: false, start: '09:00', end: '18:00' };

export const createDefaultAvailability = (): Availability =>
  Object.fromEntries(AVAILABILITY_DAYS.map(([key]) => [key, { ...DEFAULT_DAY }])) as Availability;

export const parseAvailability = (value?: string | null): Availability => {
  if (!value) return createDefaultAvailability();
  try {
    const parsed = JSON.parse(value) as Partial<Availability>;
    const defaults = createDefaultAvailability();
    for (const [key] of AVAILABILITY_DAYS) {
      if (parsed[key]) defaults[key] = { ...defaults[key], ...parsed[key] };
    }
    return defaults;
  } catch {
    return createDefaultAvailability();
  }
};

export const serializeAvailability = (availability: Availability): string => JSON.stringify(availability);

interface Props {
  value?: string | null;
  onChange: (value: string) => void;
  compact?: boolean;
}

export const AvailabilityEditor: React.FC<Props> = ({ value, onChange }) => {
  const availability = useMemo(() => parseAvailability(value), [value]);

  const update = (day: string, patch: Partial<AvailabilityDay>) => {
    onChange(serializeAvailability({
      ...availability,
      [day]: { ...availability[day], ...patch },
    }));
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <CalendarDays className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">Disponibilità</h4>
          <p className="text-xs text-gray-500">Seleziona i giorni e l'orario di lavoro.</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {AVAILABILITY_DAYS.map(([key, label]) => {
          const day = availability[key];
          return (
            <div key={key} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
              <label className="flex min-w-0 cursor-pointer items-center gap-2.5 sm:w-28 sm:shrink-0">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${day.enabled ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                  {day.enabled && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => update(key, { enabled: e.target.checked })}
                  className="sr-only"
                />
                <span className={`text-sm font-medium ${day.enabled ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span>
              </label>

              {day.enabled ? (
                <div className="flex items-center gap-2 pl-7 sm:pl-0">
                  <Clock3 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <input
                    aria-label={`${label} inizio`}
                    type="time"
                    value={day.start}
                    onChange={(e) => update(key, { start: e.target.value })}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-28 sm:flex-none"
                  />
                  <span className="text-xs font-medium text-gray-400">—</span>
                  <input
                    aria-label={`${label} fine`}
                    type="time"
                    value={day.end}
                    onChange={(e) => update(key, { end: e.target.value })}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-28 sm:flex-none"
                  />
                </div>
              ) : (
                <span className="pl-7 text-xs text-gray-400 sm:pl-0">Non disponibile</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};