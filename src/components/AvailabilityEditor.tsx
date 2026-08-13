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

const DEFAULT_DAY: AvailabilityDay = {
  enabled: false,
  start: '09:00',
  end: '18:00',
};

export const createDefaultAvailability = (): Availability =>
  Object.fromEntries(
    AVAILABILITY_DAYS.map(([key]) => [key, { ...DEFAULT_DAY }]),
  ) as Availability;

export const parseAvailability = (
  value?: string | null,
): Availability => {
  if (!value) return createDefaultAvailability();

  try {
    const parsed = JSON.parse(value) as Partial<Availability>;
    const defaults = createDefaultAvailability();

    for (const [key] of AVAILABILITY_DAYS) {
      if (parsed[key]) {
        defaults[key] = {
          ...defaults[key],
          ...parsed[key],
        };
      }
    }

    return defaults;
  } catch {
    return createDefaultAvailability();
  }
};

export const serializeAvailability = (
  availability: Availability,
): string => JSON.stringify(availability);

interface Props {
  value?: string | null;
  onChange: (value: string) => void;
}

export const AvailabilityEditor: React.FC<Props> = ({
  value,
  onChange,
}) => {
  const availability = useMemo(
    () => parseAvailability(value),
    [value],
  );

  const update = (
    day: string,
    patch: Partial<AvailabilityDay>,
  ) => {
    onChange(
      serializeAvailability({
        ...availability,
        [day]: {
          ...availability[day],
          ...patch,
        },
      }),
    );
  };

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white">
              Quando sei disponibile?
            </h4>

            <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
              Seleziona i giorni e indica l'orario.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 p-3 sm:p-4">
        {AVAILABILITY_DAYS.map(([key, label]) => {
          const day = availability[key];

          return (
            <div
              key={key}
              className={`rounded-2xl border p-3 transition sm:p-3.5 ${
                day.enabled
                  ? 'border-amber-400/20 bg-amber-400/[0.045]'
                  : 'border-white/8 bg-white/[0.015]'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 cursor-pointer items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                      day.enabled
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-white/10 bg-white/[0.025] text-transparent'
                    }`}
                  >
                    {day.enabled && (
                      <Check
                        className="h-4 w-4"
                        strokeWidth={3}
                      />
                    )}
                  </span>

                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(event) =>
                      update(key, {
                        enabled: event.target.checked,
                      })
                    }
                    className="sr-only"
                  />

                  <span
                    className={`text-sm font-bold ${
                      day.enabled
                        ? 'text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </label>

                {day.enabled ? (
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-2.5 py-2 sm:w-[118px] sm:flex-none">
                      <Clock3 className="h-3.5 w-3.5 shrink-0 text-amber-300/80" />

                      <input
                        aria-label={`${label} inizio`}
                        type="time"
                        value={day.start}
                        onChange={(event) =>
                          update(key, {
                            start: event.target.value,
                          })
                        }
                        className="min-w-0 w-full bg-transparent text-sm font-semibold text-white outline-none"
                      />
                    </div>

                    <span className="shrink-0 text-xs font-bold text-slate-600">
                      —
                    </span>

                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-2.5 py-2 sm:w-[118px] sm:flex-none">
                      <Clock3 className="h-3.5 w-3.5 shrink-0 text-amber-300/80" />

                      <input
                        aria-label={`${label} fine`}
                        type="time"
                        value={day.end}
                        onChange={(event) =>
                          update(key, {
                            end: event.target.value,
                          })
                        }
                        className="min-w-0 w-full bg-transparent text-sm font-semibold text-white outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="pl-12 text-xs font-medium text-slate-600 sm:pl-0">
                    Non disponibile
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
