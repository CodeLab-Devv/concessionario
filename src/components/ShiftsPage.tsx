import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Moon,
  MoonStar,
  Plus,
  Save,
  Sun,
  Sunset,
  Trash2,
  UserRoundX,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './ui/NotificationManager';
import { Avatar } from './Avatar';

interface UserRow {
  id: string;
  name: string;
  role: string;
  avatar_url?: string | null;
  employee_type?: string | null;
}

interface Shift {
  id: string;
  user_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

interface Absence {
  id: string;
  user_id: string;
  absence_date: string;
  slot: Slot;
  start_time: string;
  end_time: string;
  note: string | null;
  created_by: string | null;
}

interface SiteNotification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

type Slot =
  | 'mattino'
  | 'pomeriggio'
  | 'sera'
  | 'tarda_notte'
  | 'tutto_giorno';

type ShiftSlot = Exclude<Slot, 'tutto_giorno'>;

const HIGH_ROLES = ['owner', 'director', 'vice_director'];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietario',
  director: 'Direttore',
  vice_director: 'Vice Direttore',
  employee: 'Dipendente',
  probation: 'In Prova',
};

const SLOTS: {
  key: Slot;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  from: string;
  to: string;
}[] = [
  {
    key: 'mattino',
    label: 'Mattino',
    subtitle: '06:00 — 12:00',
    icon: Sun,
    from: '06:00',
    to: '12:00',
  },
  {
    key: 'pomeriggio',
    label: 'Pomeriggio',
    subtitle: '12:00 — 18:00',
    icon: Sunset,
    from: '12:00',
    to: '18:00',
  },
  {
    key: 'sera',
    label: 'Sera',
    subtitle: '18:00 — 00:00',
    icon: Moon,
    from: '18:00',
    to: '00:00',
  },
  {
    key: 'tarda_notte',
    label: 'Tarda notte',
    subtitle: '00:00 — 06:00',
    icon: MoonStar,
    from: '00:00',
    to: '06:00',
  },
  {
    key: 'tutto_giorno',
    label: 'Tutto il giorno',
    subtitle: 'Assenza completa',
    icon: UserRoundX,
    from: '00:00',
    to: '23:59',
  },
];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const displayDate = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`));

const shortDate = (date: Date) =>
  new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
  }).format(date);

const normalizeTime = (value: string) =>
  value.length === 5 ? `${value}:00` : value;

const getSlot = (start: string): ShiftSlot => {
  const hour = Number(start.slice(0, 2));

  if (hour >= 6 && hour < 12) return 'mattino';
  if (hour >= 12 && hour < 18) return 'pomeriggio';
  if (hour >= 18) return 'sera';

  return 'tarda_notte';
};

const slotInfo = (key: Slot) => SLOTS.find((slot) => slot.key === key)!;

export const ShiftsPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotifications();

  /**
   * Solo questi ruoli possono gestire i turni.
   *
   * IMPORTANTE:
   * questo controllo viene utilizzato anche per non renderizzare
   * proprio il pulsante "Aggiungi turno" agli utenti normali.
   */
  const canManage = useMemo(
    () => HIGH_ROLES.includes(user?.role || ''),
    [user?.role],
  );

  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(new Date()),
  );

  const [users, setUsers] = useState<UserRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editor, setEditor] = useState<'shift' | 'absence' | null>(null);

  const [editingIds, setEditingIds] = useState<string[]>([]);
  const [editingAbsenceId, setEditingAbsenceId] = useState<string | null>(
    null,
  );

  const [form, setForm] = useState<{
    slot: ShiftSlot;
    userIds: [string, string];
    start: string;
    end: string;
    notes: string;
  }>({
    slot: 'mattino',
    userIds: ['', ''],
    start: '06:00',
    end: '12:00',
    notes: '',
  });

  const [absenceForm, setAbsenceForm] = useState<{
    slot: Slot;
    note: string;
  }>({
    slot: 'mattino',
    note: '',
  });

  const weekDates = useMemo(() => {
    const current = new Date(`${selectedDate}T12:00:00`);
    const day = current.getDay() || 7;

    current.setDate(current.getDate() - day + 1);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(current);
      date.setDate(current.getDate() + index);

      return date;
    });
  }, [selectedDate]);

  const userMap = useMemo(
    () => new Map(users.map((item) => [item.id, item])),
    [users],
  );

  const load = useCallback(async () => {
    setLoading(true);

    const [
      { data: usersData, error: usersError },
      { data: shiftsData, error: shiftsError },
      { data: absencesData, error: absencesError },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id,name,role,avatar_url,employee_type')
        .order('name'),

      supabase
        .from('daily_shifts')
        .select(
          'id,user_id,shift_date,start_time,end_time,notes',
        )
        .eq('shift_date', selectedDate)
        .order('start_time'),

      supabase
        .from('shift_absences')
        .select(
          'id,user_id,absence_date,slot,start_time,end_time,note,created_by',
        )
        .eq('absence_date', selectedDate)
        .order('start_time'),
    ]);

    if (usersError) {
      console.error(
        'Errore caricamento dipendenti:',
        usersError,
      );
    }

    if (shiftsError) {
      console.error(
        'Errore caricamento turni:',
        shiftsError,
      );
    }

    if (absencesError) {
      console.error(
        'Errore caricamento assenze:',
        absencesError,
      );
    }

    setUsers(usersData || []);
    setShifts(shiftsData || []);
    setAbsences(absencesData || []);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Realtime turni + assenze.
   */
  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel(`shifts-realtime-${selectedDate}`)

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_shifts',
        },
        (payload) => {
          if (!active) return;

          if (payload.eventType === 'INSERT') {
            const row = payload.new as Shift;

            if (row.shift_date !== selectedDate) return;

            setShifts((current) =>
              current.some((item) => item.id === row.id)
                ? current
                : [...current, row].sort((a, b) =>
                    a.start_time.localeCompare(b.start_time),
                  ),
            );
          }

          if (payload.eventType === 'UPDATE') {
            const row = payload.new as Shift;

            setShifts((current) => {
              if (row.shift_date === selectedDate) {
                return current.some((item) => item.id === row.id)
                  ? current
                      .map((item) =>
                        item.id === row.id ? row : item,
                      )
                      .sort((a, b) =>
                        a.start_time.localeCompare(b.start_time),
                      )
                  : [...current, row].sort((a, b) =>
                      a.start_time.localeCompare(b.start_time),
                    );
              }

              return current.filter(
                (item) => item.id !== row.id,
              );
            });
          }

          if (payload.eventType === 'DELETE') {
            const row = payload.old as Partial<Shift>;

            setShifts((current) =>
              current.filter((item) => item.id !== row.id),
            );
          }
        },
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_absences',
        },
        (payload) => {
          if (!active) return;

          if (payload.eventType === 'INSERT') {
            const row = payload.new as Absence;

            if (row.absence_date !== selectedDate) return;

            setAbsences((current) =>
              current.some((item) => item.id === row.id)
                ? current
                : [...current, row].sort((a, b) =>
                    a.start_time.localeCompare(b.start_time),
                  ),
            );
          }

          if (payload.eventType === 'UPDATE') {
            const row = payload.new as Absence;

            setAbsences((current) => {
              if (row.absence_date === selectedDate) {
                return current.some((item) => item.id === row.id)
                  ? current
                      .map((item) =>
                        item.id === row.id ? row : item,
                      )
                      .sort((a, b) =>
                        a.start_time.localeCompare(b.start_time),
                      )
                  : [...current, row].sort((a, b) =>
                      a.start_time.localeCompare(b.start_time),
                    );
              }

              return current.filter(
                (item) => item.id !== row.id,
              );
            });
          }

          if (payload.eventType === 'DELETE') {
            const row = payload.old as Partial<Absence>;

            setAbsences((current) =>
              current.filter((item) => item.id !== row.id),
            );
          }
        },
      )
      .subscribe((status) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.warn(
            'Realtime turni non disponibile:',
            status,
          );
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  /**
   * Notifiche realtime per i gradi alti.
   */
  useEffect(() => {
    if (!user?.id || !canManage) return;

    let active = true;

    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select(
          'id,recipient_id,type,title,message,data,read_at,created_at',
        )
        .eq('recipient_id', user.id)
        .is('read_at', null)
        .order('created_at', {
          ascending: false,
        })
        .limit(20);

      if (!active || !data?.length) return;

      data.forEach((item: SiteNotification) => {
        showWarning(
          item.title,
          item.message || undefined,
        );
      });

      const ids = data.map((item) => item.id);

      void supabase
        .from('notifications')
        .update({
          read_at: new Date().toISOString(),
        })
        .in('id', ids)
        .eq('recipient_id', user.id);
    };

    void loadNotifications();

    const channel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (!active) return;

          const notification =
            payload.new as SiteNotification;

          if (
            notification.recipient_id !== user.id
          ) {
            return;
          }

          showWarning(
            notification.title,
            notification.message || undefined,
          );

          void supabase
            .from('notifications')
            .update({
              read_at: new Date().toISOString(),
            })
            .eq('id', notification.id)
            .eq('recipient_id', user.id);
        },
      )
      .subscribe((status) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.warn(
            'Realtime notifiche non disponibile:',
            status,
          );
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [canManage, showWarning, user?.id]);

  const shiftsBySlot = useMemo(() => {
    const map = new Map<ShiftSlot, Shift[]>();

    SLOTS.filter(
      (slot) => slot.key !== 'tutto_giorno',
    ).forEach((slot) => {
      map.set(slot.key as ShiftSlot, []);
    });

    shifts.forEach((shift) => {
      const slot = getSlot(shift.start_time);
      map.get(slot)?.push(shift);
    });

    return map;
  }, [shifts]);

  const absencesBySlot = useMemo(() => {
    const map = new Map<Slot, Absence[]>();

    SLOTS.forEach((slot) => {
      map.set(slot.key, []);
    });

    absences.forEach((absence) => {
      if (absence.slot === 'tutto_giorno') {
        SLOTS.filter(
          (slot) => slot.key !== 'tutto_giorno',
        ).forEach((slot) => {
          map.get(slot.key)?.push(absence);
        });

        return;
      }

      map.get(absence.slot)?.push(absence);
    });

    return map;
  }, [absences]);

  const openCreateShift = (
    slotKey: ShiftSlot = 'mattino',
  ) => {
    /**
     * Protezione ulteriore.
     * Anche se qualcuno prova a richiamare la funzione
     * manualmente, un utente normale non può aprire l'editor.
     */
    if (!canManage) return;

    const slot = slotInfo(slotKey);

    setEditingIds([]);

    setForm({
      slot: slotKey,
      userIds: [
        users[0]?.id || '',
        users[1]?.id || '',
      ],
      start: slot.from,
      end: slot.to,
      notes: '',
    });

    setEditor('shift');
  };

  const openEditShift = (rows: Shift[]) => {
    if (!canManage || !rows.length) return;

    const pair = rows.slice(0, 2);

    const slotKey = getSlot(
      pair[0]?.start_time || '06:00',
    );

    const slot = slotInfo(slotKey);

    setEditingIds(
      pair.map((row) => row.id),
    );

    setForm({
      slot: slotKey,
      userIds: [
        pair[0]?.user_id || '',
        pair[1]?.user_id || '',
      ],
      start:
        pair[0]?.start_time.slice(0, 5) ||
        slot.from,
      end:
        pair[0]?.end_time.slice(0, 5) ||
        slot.to,
      notes:
        pair[0]?.notes ||
        pair[1]?.notes ||
        '',
    });

    setEditor('shift');
  };

  const openCreateAbsence = (
    slot: Slot = 'mattino',
  ) => {
    if (!user?.id) return;

    setEditingAbsenceId(null);

    setAbsenceForm({
      slot,
      note: '',
    });

    setEditor('absence');
  };

  const openEditAbsence = (
    absence: Absence,
  ) => {
    if (
      !user?.id ||
      absence.user_id !== user.id
    ) {
      return;
    }

    setEditingAbsenceId(absence.id);

    setAbsenceForm({
      slot: absence.slot,
      note: absence.note || '',
    });

    setEditor('absence');
  };

  const saveShift = async () => {
    if (!canManage || saving) return;

    const [
      firstUser,
      secondUser,
    ] = form.userIds;

    if (
      !firstUser ||
      !secondUser ||
      firstUser === secondUser
    ) {
      showError(
        'Coppia non valida',
        'Seleziona due persone diverse.',
      );

      return;
    }

    setSaving(true);

    try {
      const duplicate = shifts.some(
        (shift) =>
          !editingIds.includes(shift.id) &&
          form.userIds.includes(shift.user_id) &&
          getSlot(shift.start_time) ===
            form.slot,
      );

      if (duplicate) {
        showWarning(
          'Turno già presente',
          'Una delle persone è già assegnata a questa fascia.',
        );

        return;
      }

      if (editingIds.length) {
        const { error } = await supabase
          .from('daily_shifts')
          .delete()
          .in('id', editingIds);

        if (error) throw error;
      }

      const payload = form.userIds.map(
        (userId) => ({
          user_id: userId,
          shift_date: selectedDate,
          start_time: normalizeTime(
            form.start,
          ),
          end_time: normalizeTime(
            form.end,
          ),
          notes:
            form.notes.trim() || null,
          created_by: user?.id ?? null,
        }),
      );

      const {
        data,
        error,
      } = await supabase
        .from('daily_shifts')
        .insert(payload)
        .select(
          'id,user_id,shift_date,start_time,end_time,notes',
        );

      if (error) throw error;

      if (editingIds.length) {
        setShifts((current) =>
          current
            .filter(
              (item) =>
                !editingIds.includes(item.id),
            )
            .concat((data || []) as Shift[])
            .sort((a, b) =>
              a.start_time.localeCompare(
                b.start_time,
              ),
            ),
        );
      } else if (data?.length) {
        setShifts((current) =>
          [
            ...current,
            ...(data as Shift[]),
          ]
            .filter(
              (item, index, array) =>
                array.findIndex(
                  (row) =>
                    row.id === item.id,
                ) === index,
            )
            .sort((a, b) =>
              a.start_time.localeCompare(
                b.start_time,
              ),
            ),
        );
      }

      setEditor(null);

      showSuccess(
        editingIds.length
          ? 'Turno aggiornato'
          : 'Turno aggiunto',
      );
    } catch (error) {
      console.error(
        'Errore salvataggio turno:',
        error,
      );

      showError(
        'Impossibile salvare il turno',
        error instanceof Error
          ? error.message
          : 'Controlla i dati e riprova.',
      );
    } finally {
      setSaving(false);
    }
  };

  const saveAbsence = async () => {
    if (!user?.id || saving) return;

    setSaving(true);

    try {
      const info = slotInfo(
        absenceForm.slot,
      );

      const payload = {
        user_id: user.id,
        absence_date: selectedDate,
        slot: absenceForm.slot,
        start_time: normalizeTime(
          info.from,
        ),
        end_time: normalizeTime(
          info.to,
        ),
        note:
          absenceForm.note.trim() || null,
        created_by: user.id,
      };

      if (editingAbsenceId) {
        const {
          data,
          error,
        } = await supabase
          .from('shift_absences')
          .update(payload)
          .eq('id', editingAbsenceId)
          .eq('user_id', user.id)
          .select(
            'id,user_id,absence_date,slot,start_time,end_time,note,created_by',
          )
          .single();

        if (error) throw error;

        setAbsences((current) =>
          current.map((item) =>
            item.id === data.id
              ? (data as Absence)
              : item,
          ),
        );
      } else {
        const {
          data,
          error,
        } = await supabase
          .from('shift_absences')
          .insert(payload)
          .select(
            'id,user_id,absence_date,slot,start_time,end_time,note,created_by',
          )
          .single();

        if (error) throw error;

        setAbsences((current) =>
          current.some(
            (item) => item.id === data.id,
          )
            ? current
            : [
                ...current,
                data as Absence,
              ].sort((a, b) =>
                a.start_time.localeCompare(
                  b.start_time,
                ),
              ),
        );
      }

      setEditor(null);

      showSuccess(
        editingAbsenceId
          ? 'Assenza aggiornata'
          : 'Assenza registrata',
        'I gradi alti verranno notificati automaticamente.',
      );
    } catch (error) {
      console.error(
        'Errore salvataggio assenza:',
        error,
      );

      showError(
        'Impossibile salvare l’assenza',
        error instanceof Error
          ? error.message
          : 'Controlla i dati e riprova.',
      );
    } finally {
      setSaving(false);
    }
  };

  const removeAbsence = async (
    absence: Absence,
  ) => {
    if (
      !user?.id ||
      absence.user_id !== user.id ||
      !window.confirm(
        'Vuoi eliminare la tua assenza?',
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from('shift_absences')
      .delete()
      .eq('id', absence.id)
      .eq('user_id', user.id);

    if (error) {
      showError(
        'Impossibile eliminare',
        error.message,
      );

      return;
    }

    setAbsences((current) =>
      current.filter(
        (item) => item.id !== absence.id,
      ),
    );

    showSuccess('Assenza eliminata');
  };

  const removePair = async (
    rows: Shift[],
  ) => {
    if (
      !canManage ||
      !rows.length ||
      !window.confirm(
        'Vuoi eliminare l’intera coppia da questo turno?',
      )
    ) {
      return;
    }

    const ids = rows
      .slice(0, 2)
      .map((row) => row.id);

    const { error } = await supabase
      .from('daily_shifts')
      .delete()
      .in('id', ids);

    if (error) {
      showError(
        'Impossibile eliminare il turno',
        error.message,
      );

      return;
    }

    setShifts((current) =>
      current.filter(
        (item) => !ids.includes(item.id),
      ),
    );

    showSuccess('Turno eliminato');
  };

  const renderPeople = (
    rows: Shift[],
  ) =>
    rows.slice(0, 2).map(
      (shift, index) => {
        const employee = userMap.get(
          shift.user_id,
        );

        if (!employee) return null;

        return (
          <React.Fragment key={shift.id}>
            {index > 0 && (
              <span className="text-lg font-bold text-gray-300">
                +
              </span>
            )}

            <div className="flex min-w-0 items-center gap-2">
              <Avatar
                src={
                  employee.avatar_url ||
                  undefined
                }
                alt={employee.name}
                size="sm"
                fallbackText={employee.name}
              />

              <div className="min-w-0">
                <p className="max-w-[160px] truncate text-sm font-bold text-gray-900">
                  {employee.name}
                </p>

                <p className="text-[11px] text-gray-500">
                  {ROLE_LABELS[
                    employee.role
                  ] || employee.role}
                </p>
              </div>
            </div>
          </React.Fragment>
        );
      },
    );

  const renderAbsences = (
    slot: ShiftSlot,
  ) =>
    (absencesBySlot.get(slot) || []).map(
      (absence) => {
        const employee = userMap.get(
          absence.user_id,
        );

        if (!employee) return null;

        const own =
          absence.user_id === user?.id;

        return (
          <div
            key={`${slot}-${absence.id}`}
            className="mt-2 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-2.5"
          >
            <Avatar
              src={
                employee.avatar_url ||
                undefined
              }
              alt={employee.name}
              size="sm"
              fallbackText={employee.name}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-red-900">
                {employee.name} · ASSENTE
              </p>

              <p className="text-[11px] text-red-700">
                {absence.slot ===
                'tutto_giorno'
                  ? 'Tutto il giorno'
                  : absence.note ||
                    'Assenza registrata'}
              </p>
            </div>

            {own && (
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    openEditAbsence(
                      absence,
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-100"
                >
                  <Edit3 className="h-3.5 w-3.5 text-red-700" />
                </button>

                <button
                  onClick={() =>
                    void removeAbsence(
                      absence,
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-700" />
                </button>
              </div>
            )}
          </div>
        );
      },
    );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8">
      {/* HEADER */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-300">
              <CalendarDays className="h-5 w-5" />

              <span className="text-xs font-bold uppercase tracking-[0.2em]">
                Programmazione
              </span>
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Turni
            </h1>

            <p className="mt-1 text-sm text-gray-300">
              Turni e assenze organizzati per fascia,
              sempre aggiornati in tempo reale.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {/* ASSENZA: DISPONIBILE A TUTTI GLI UTENTI AUTENTICATI */}
            <button
              onClick={() =>
                openCreateAbsence()
              }
              disabled={!user?.id || saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-500/15 px-4 font-semibold text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
            >
              <UserRoundX className="h-5 w-5" />
              Comunica assenza
            </button>

            {/* 
              AGGIUNGI TURNO:
              NON VIENE PROPRIO RENDERIZZATO
              agli utenti senza permesso.
            */}
            {canManage && (
              <button
                onClick={() =>
                  openCreateShift()
                }
                disabled={
                  !users.length ||
                  saving
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 font-semibold text-gray-950 shadow-lg transition hover:from-yellow-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
                Aggiungi turno
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DATE NAVIGATION */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              const date = new Date(
                `${selectedDate}T12:00:00`,
              );

              date.setDate(
                date.getDate() - 1,
              );

              setSelectedDate(
                formatDate(date),
              );
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 text-center">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-gray-400">
              Programmazione del giorno
            </p>

            <p className="truncate text-sm font-bold capitalize text-gray-900 sm:text-base">
              {displayDate(
                selectedDate,
              )}
            </p>
          </div>

          <button
            onClick={() => {
              const date = new Date(
                `${selectedDate}T12:00:00`,
              );

              date.setDate(
                date.getDate() + 1,
              );

              setSelectedDate(
                formatDate(date),
              );
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
          {weekDates.map((date) => {
            const value =
              formatDate(date);

            const active =
              value === selectedDate;

            return (
              <button
                key={value}
                onClick={() =>
                  setSelectedDate(value)
                }
                className={`min-w-0 rounded-xl px-1 py-2 text-center transition ${
                  active
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="block truncate text-[10px] font-semibold uppercase sm:text-xs">
                  {
                    shortDate(date).split(
                      ' ',
                    )[0]
                  }
                </span>

                <span className="mt-0.5 block text-sm font-bold sm:text-base">
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* DESKTOP */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-[210px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Fascia
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Turno assegnato
                  </th>

                  <th className="w-[180px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Orario
                  </th>

                  <th className="w-[250px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Assenze / note
                  </th>

                  <th className="w-[110px] px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                    Azioni
                  </th>
                </tr>
              </thead>

              <tbody>
                {SLOTS.filter(
                  (slot) =>
                    slot.key !==
                    'tutto_giorno',
                ).map((slot) => {
                  const Icon = slot.icon;

                  const rows =
                    shiftsBySlot.get(
                      slot.key as ShiftSlot,
                    ) || [];

                  const absenceRows =
                    absencesBySlot.get(
                      slot.key,
                    ) || [];

                  return (
                    <tr
                      key={slot.key}
                      className="border-b border-gray-100 align-top last:border-0"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <Icon className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-bold text-gray-900">
                              {slot.label}
                            </p>

                            <p className="text-xs text-gray-500">
                              {slot.subtitle}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {rows.length ? (
                          <div className="flex flex-wrap items-center gap-3">
                            {renderPeople(
                              rows,
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            Nessun turno assegnato
                          </span>
                        )}

                        {absenceRows.length >
                          0 && (
                          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-red-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Copertura da verificare
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-700">
                          <Clock3 className="h-3.5 w-3.5" />

                          {rows[0]
                            ? `${rows[0].start_time.slice(
                                0,
                                5,
                              )} — ${rows[0].end_time.slice(
                                0,
                                5,
                              )}`
                            : slot.subtitle}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {absenceRows.length ? (
                          absenceRows.map(
                            (absence) => {
                              const employee =
                                userMap.get(
                                  absence.user_id,
                                );

                              if (
                                !employee
                              ) {
                                return null;
                              }

                              return (
                                <div
                                  key={
                                    absence.id
                                  }
                                  className="mb-2 rounded-xl border border-red-100 bg-red-50 p-2.5 last:mb-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar
                                      src={
                                        employee.avatar_url ||
                                        undefined
                                      }
                                      alt={
                                        employee.name
                                      }
                                      size="sm"
                                      fallbackText={
                                        employee.name
                                      }
                                    />

                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-bold text-red-900">
                                        {
                                          employee.name
                                        }{' '}
                                        · Assente
                                      </p>

                                      <p className="text-[11px] text-red-700">
                                        {absence.slot ===
                                        'tutto_giorno'
                                          ? 'Tutto il giorno'
                                          : absence.note ||
                                            'Nessuna nota'}
                                      </p>
                                    </div>
                                  </div>

                                  {absence.user_id ===
                                    user?.id && (
                                    <div className="mt-2 flex justify-end gap-1">
                                      <button
                                        onClick={() =>
                                          openEditAbsence(
                                            absence,
                                          )
                                        }
                                        className="rounded-lg px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                      >
                                        Modifica
                                      </button>

                                      <button
                                        onClick={() =>
                                          void removeAbsence(
                                            absence,
                                          )
                                        }
                                        className="rounded-lg px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                      >
                                        Elimina
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )
                        ) : (
                          <span className="text-xs text-gray-400">
                            Nessuna assenza
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {canManage &&
                          rows.length >
                            0 && (
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() =>
                                  openEditShift(
                                    rows,
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-amber-50 hover:text-amber-600"
                                title="Modifica coppia"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() =>
                                  void removePair(
                                    rows,
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                                title="Elimina coppia"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}
          <div className="divide-y divide-gray-100 md:hidden">
            {SLOTS.filter(
              (slot) =>
                slot.key !==
                'tutto_giorno',
            ).map((slot) => {
              const Icon = slot.icon;

              const rows =
                shiftsBySlot.get(
                  slot.key as ShiftSlot,
                ) || [];

              return (
                <section
                  key={slot.key}
                  className="p-4"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900">
                        {slot.label}
                      </h3>

                      <p className="text-xs text-gray-500">
                        {slot.subtitle}
                      </p>
                    </div>
                  </div>

                  {rows.length ? (
                    <div className="space-y-2">
                      {rows
                        .slice(0, 2)
                        .map(
                          (shift) => {
                            const employee =
                              userMap.get(
                                shift.user_id,
                              );

                            if (
                              !employee
                            ) {
                              return null;
                            }

                            return (
                              <div
                                key={
                                  shift.id
                                }
                                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                              >
                                <Avatar
                                  src={
                                    employee.avatar_url ||
                                    undefined
                                  }
                                  alt={
                                    employee.name
                                  }
                                  size="md"
                                  fallbackText={
                                    employee.name
                                  }
                                />

                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-bold text-gray-900">
                                    {
                                      employee.name
                                    }
                                  </p>

                                  <p className="truncate text-xs text-gray-500">
                                    {ROLE_LABELS[
                                      employee
                                        .role
                                    ] ||
                                      employee.role}
                                  </p>

                                  <p className="mt-1 text-xs font-semibold text-amber-700">
                                    {shift.start_time.slice(
                                      0,
                                      5,
                                    )}{' '}
                                    —{' '}
                                    {shift.end_time.slice(
                                      0,
                                      5,
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          },
                        )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                      Nessun turno assegnato
                    </div>
                  )}

                  {renderAbsences(
                    slot.key as ShiftSlot,
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* SHIFT EDITOR */}
      {editor === 'shift' &&
        canManage && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingIds.length
                      ? 'Modifica coppia'
                      : 'Aggiungi turno'}
                  </h2>

                  <p className="text-xs text-gray-500">
                    {displayDate(
                      selectedDate,
                    )}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setEditor(null)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100"
                >
                  <X />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Fascia
                  </span>

                  <select
                    value={form.slot}
                    onChange={(event) => {
                      const slot =
                        slotInfo(
                          event.target
                            .value as ShiftSlot,
                        );

                      setForm(
                        (value) => ({
                          ...value,
                          slot:
                            event.target
                              .value as ShiftSlot,
                          start:
                            slot.from,
                          end:
                            slot.to,
                        }),
                      );
                    }}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3"
                  >
                    {SLOTS.filter(
                      (slot) =>
                        slot.key !==
                        'tutto_giorno',
                    ).map((slot) => (
                      <option
                        key={slot.key}
                        value={slot.key}
                      >
                        {slot.label} ·{' '}
                        {slot.subtitle}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {form.userIds.map(
                    (id, index) => (
                      <label
                        key={index}
                      >
                        <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Persona{' '}
                          {index + 1}
                        </span>

                        <select
                          value={id}
                          onChange={(
                            event,
                          ) =>
                            setForm(
                              (
                                value,
                              ) => ({
                                ...value,
                                userIds:
                                  value.userIds.map(
                                    (
                                      current,
                                      i,
                                    ) =>
                                      i ===
                                      index
                                        ? event
                                            .target
                                            .value
                                        : current,
                                  ) as [
                                    string,
                                    string,
                                  ],
                              }),
                            )
                          }
                          className="h-11 w-full rounded-xl border border-gray-200 px-3"
                        >
                          {users.map(
                            (item) => (
                              <option
                                key={
                                  item.id
                                }
                                value={
                                  item.id
                                }
                              >
                                {
                                  item.name
                                }{' '}
                                ·{' '}
                                {ROLE_LABELS[
                                  item
                                    .role
                                ] ||
                                  item.role}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    ),
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Inizio
                    </span>

                    <input
                      type="time"
                      value={
                        form.start
                      }
                      onChange={(event) =>
                        setForm(
                          (value) => ({
                            ...value,
                            start:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="h-11 w-full rounded-xl border border-gray-200 px-3"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Fine
                    </span>

                    <input
                      type="time"
                      value={
                        form.end
                      }
                      onChange={(event) =>
                        setForm(
                          (value) => ({
                            ...value,
                            end:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="h-11 w-full rounded-xl border border-gray-200 px-3"
                    />
                  </label>
                </div>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm(
                      (value) => ({
                        ...value,
                        notes:
                          event.target
                            .value,
                      }),
                    )
                  }
                  rows={3}
                  maxLength={500}
                  placeholder="Nota del turno (opzionale)"
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setEditor(null)
                    }
                    className="min-h-11 flex-1 rounded-xl border border-gray-200 font-semibold"
                  >
                    Annulla
                  </button>

                  <button
                    onClick={() =>
                      void saveShift()
                    }
                    disabled={saving}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-gray-950 disabled:opacity-60"
                  >
                    {saving ? (
                      'Salvataggio...'
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Salva
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ABSENCE EDITOR */}
      {editor === 'absence' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2 text-red-600">
                  <UserRoundX className="h-5 w-5" />

                  <span className="text-xs font-bold uppercase tracking-wider">
                    Assenza
                  </span>
                </div>

                <h2 className="text-lg font-bold text-gray-900">
                  {editingAbsenceId
                    ? 'Modifica assenza'
                    : 'Comunica assenza'}
                </h2>

                <p className="text-xs capitalize text-gray-500">
                  {displayDate(
                    selectedDate,
                  )}
                </p>
              </div>

              <button
                onClick={() =>
                  setEditor(null)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100"
              >
                <X />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <Avatar
                  src={
                    user?.avatar_url ||
                    undefined
                  }
                  alt={
                    user?.name || 'Tu'
                  }
                  size="md"
                  fallbackText={
                    user?.name || 'Tu'
                  }
                />

                <div>
                  <p className="font-bold text-gray-900">
                    {user?.name ||
                      'Utente'}
                  </p>

                  <p className="text-xs text-gray-500">
                    La tua assenza
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Fascia di assenza
                </span>

                <select
                  value={
                    absenceForm.slot
                  }
                  onChange={(event) =>
                    setAbsenceForm(
                      (value) => ({
                        ...value,
                        slot:
                          event.target
                            .value as Slot,
                      }),
                    )
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 px-3"
                >
                  {SLOTS.map((slot) => (
                    <option
                      key={slot.key}
                      value={slot.key}
                    >
                      {slot.label} ·{' '}
                      {slot.subtitle}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Nota
                </span>

                <textarea
                  value={
                    absenceForm.note
                  }
                  onChange={(event) =>
                    setAbsenceForm(
                      (value) => ({
                        ...value,
                        note:
                          event.target
                            .value,
                      }),
                    )
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="Es. malattia, permesso, impegno personale..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </label>

              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-800">
                <strong>Nota:</strong>{' '}
                comunichi solo la tua assenza.
                I gradi alti verranno avvisati
                automaticamente in tempo reale.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setEditor(null)
                  }
                  className="min-h-11 flex-1 rounded-xl border border-gray-200 font-semibold"
                >
                  Annulla
                </button>

                <button
                  onClick={() =>
                    void saveAbsence()
                  }
                  disabled={saving}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 font-bold text-white disabled:opacity-60"
                >
                  {saving ? (
                    'Salvataggio...'
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Comunica assenza
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
