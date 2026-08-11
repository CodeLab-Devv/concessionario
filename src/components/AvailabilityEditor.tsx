import React, { useMemo } from 'react';
import { Clock3, CalendarDays } from 'lucide-react';

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

export const AvailabilityEditor: React.FC<Props> = ({ value, onChange, compact = false }) => {
  const availability = useMemo(() => parseAvailability(value), [value]);

  const update = (day: string, patch: Partial<AvailabilityDay>) => {
    onChange(serializeAvailability({
      ...availability,
      [day]: { ...availability[day], ...patch },
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-blue-600" />
        <div>
          <h4 className="font-semibold text-gray-900">Disponibilità e orari</h4>
          <p className="text-xs text-gray-500">Imposta quando il dipendente è disponibile.</p>
        </div>
      </div>
      <div className="space-y-2">
        {AVAILABILITY_DAYS.map(([key, label]) => {
          const day = availability[key];
          return (
            <div key={key} className={`grid ${compact ? 'grid-cols-[100px_1fr]' : 'grid-cols-[120px_1fr]'} items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3`}>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => update(key, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {label}
              </label>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-gray-400" />
                <input type="time" value={day.start} disabled={!day.enabled} onChange={(e) => update(key, { start: e.target.value })} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50" />
                <span className="text-gray-400">—</span>
                <input type="time" value={day.end} disabled={!day.enabled} onChange={(e) => update(key, { end: e.target.value })} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};