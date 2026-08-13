import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  supervisor_id: string | null;
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

type ShiftSlot =
  | 'mattino'
  | 'pomeriggio'
  | 'sera'
  | 'tarda_notte';

type Slot = ShiftSlot | 'tutto_giorno';

interface SlotInfo {
  key: Slot;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  from: string;
  to: string;
}

const HIGH_ROLES = new Set([
  'owner',
  'director',
  'vice_director',
]);

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietario',
  director: 'Direttore',
  vice_director: 'Vice Direttore',
  employee: 'Dipendente',
  probation: 'In Prova',
};

const SLOTS: readonly SlotInfo[] = [
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

const SHIFT_SLOTS = SLOTS.filter(
  (slot): slot is SlotInfo & { key: ShiftSlot } =>
    slot.key !== 'tutto_giorno',
);

const formatDate = (date: Date): string =>
  date.toISOString().slice(0, 10);

const displayDate = (value: string): string =>
  new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`));

const shortDate = (date: Date): string =>
  new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
  }).format(date);

const normalizeTime = (value: string): string =>
  value.length === 5 ? `${value}:00` : value;

const getSlot = (startTime: string): ShiftSlot => {
  const hour = Number(startTime.slice(0, 2));

  if (hour >= 6 && hour < 12) return 'mattino';
  if (hour >= 12 && hour < 18) return 'pomeriggio';
  if (hour >= 18) return 'sera';

  return 'tarda_notte';
};

const getSlotInfo = (slot: Slot): SlotInfo =>
  SLOTS.find((item) => item.key === slot) ?? SLOTS[0];

const sortByStartTime = <T extends { start_time: string }>(
  rows: T[],
): T[] =>
  [...rows].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );

export const ShiftsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    showSuccess,
    showError,
    showWarning,
  } = useNotifications();

  const canManage = HIGH_ROLES.has(user?.role ?? '');
  const isOnService = Boolean(user?.isOnService);

  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(new Date()),
  );

  const [users, setUsers] = useState<UserRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editor, setEditor] = useState<
    'shift' | 'absence' | null
  >(null);

  const [editingIds, setEditingIds] = useState<string[]>([]);
  const [editingAbsenceId, setEditingAbsenceId] =
    useState<string | null>(null);

  const [form, setForm] = useState<{
    slot: ShiftSlot;
    userIds: [string, string];
    supervisorId: string;
    start: string;
    end: string;
    notes: string;
  }>({
    slot: 'mattino',
    userIds: ['', ''],
    supervisorId: '',
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

  const shiftsBySlot = useMemo(() => {
    const map = new Map<ShiftSlot, Shift[]>();

    SHIFT_SLOTS.forEach((slot) => {
      map.set(slot.key, []);
    });

    shifts.forEach((shift) => {
      map.get(getSlot(shift.start_time))?.push(shift);
    });

    map.forEach((rows, slot) => {
      map.set(slot, sortByStartTime(rows));
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
        SHIFT_SLOTS.forEach((slot) => {
          map.get(slot.key)?.push(absence);
        });

        return;
      }

      map.get(absence.slot)?.push(absence);
    });

    return map;
  }, [absences]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [
        usersResult,
        shiftsResult,
        absencesResult,
      ] = await Promise.all([
        supabase
          .from('users')
          .select(
            'id,name,role,avatar_url,employee_type',
          )
          .order('name'),

        supabase
          .from('daily_shifts')
          .select(
            'id,user_id,shift_date,start_time,end_time,notes,supervisor_id',
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

      if (usersResult.error) {
        console.error(
          'Errore caricamento dipendenti:',
          usersResult.error,
        );
      }

      if (shiftsResult.error) {
        console.error(
          'Errore caricamento turni:',
          shiftsResult.error,
        );
      }

      if (absencesResult.error) {
        console.error(
          'Errore caricamento assenze:',
          absencesResult.error,
        );
      }

      setUsers(usersResult.data ?? []);

      setShifts(
        sortByStartTime(
          (shiftsResult.data ?? []) as Shift[],
        ),
      );

      setAbsences(
        sortByStartTime(
          (absencesResult.data ?? []) as Absence[],
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

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
              current.some(
                (item) => item.id === row.id,
              )
                ? current
                : sortByStartTime([
                    ...current,
                    row,
                  ]),
            );

            return;
          }

          if (payload.eventType === 'UPDATE') {
            const row = payload.new as Shift;

            setShifts((current) =>
              row.shift_date !== selectedDate
                ? current.filter(
                    (item) => item.id !== row.id,
                  )
                : sortByStartTime(
                    current.some(
                      (item) => item.id === row.id,
                    )
                      ? current.map((item) =>
                          item.id === row.id
                            ? row
                            : item,
                        )
                      : [...current, row],
                  ),
            );

            return;
          }

          if (payload.eventType === 'DELETE') {
            const row =
              payload.old as Partial<Shift>;

            setShifts((current) =>
              current.filter(
                (item) => item.id !== row.id,
              ),
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

            if (row.absence_date !== selectedDate) {
              return;
            }

            setAbsences((current) =>
              current.some(
                (item) => item.id === row.id,
              )
                ? current
                : sortByStartTime([
                    ...current,
                    row,
                  ]),
            );

            return;
          }

          if (payload.eventType === 'UPDATE') {
            const row = payload.new as Absence;

            setAbsences((current) =>
              row.absence_date !== selectedDate
                ? current.filter(
                    (item) => item.id !== row.id,
                  )
                : sortByStartTime(
                    current.some(
                      (item) => item.id === row.id,
                    )
                      ? current.map((item) =>
                          item.id === row.id
                            ? row
                            : item,
                        )
                      : [...current, row],
                  ),
            );

            return;
          }

          if (payload.eventType === 'DELETE') {
            const row =
              payload.old as Partial<Absence>;

            setAbsences((current) =>
              current.filter(
                (item) => item.id !== row.id,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const isUserAbsentInSlot = useCallback(
    (userId: string, slot: ShiftSlot) =>
      absencesBySlot
        .get(slot)
        ?.some(
          (absence) => absence.user_id === userId,
        ) ?? false,
    [absencesBySlot],
  );

  const isUserAlreadyAssigned = useCallback(
    (userId: string, slot: ShiftSlot) =>
      shifts.some(
        (shift) =>
          !editingIds.includes(shift.id) &&
          shift.user_id === userId &&
          getSlot(shift.start_time) === slot,
      ),
    [editingIds, shifts],
  );

  const getAvailableUsers = useCallback(
    (index: number): UserRow[] => {
      const selectedOtherUser =
        form.userIds[index === 0 ? 1 : 0];

      return users.filter((employee) => {
        if (employee.id === form.userIds[index]) {
          return true;
        }

        if (employee.id === selectedOtherUser) {
          return false;
        }

        if (
          isUserAbsentInSlot(
            employee.id,
            form.slot,
          )
        ) {
          return false;
        }

        if (
          isUserAlreadyAssigned(
            employee.id,
            form.slot,
          )
        ) {
          return false;
        }

        return true;
      });
    },
    [
      form.slot,
      form.userIds,
      isUserAbsentInSlot,
      isUserAlreadyAssigned,
      users,
    ],
  );

  const openCreateShift = (
    slotKey: ShiftSlot = 'mattino',
  ) => {
    if (!canManage) {
      showWarning(
        'Permesso negato',
        'Solo i gradi alti possono modificare i turni.',
      );

      return;
    }

    const slot = getSlotInfo(slotKey);

    const availableUsers = users.filter(
      (employee) =>
        !isUserAbsentInSlot(
          employee.id,
          slotKey,
        ) &&
        !isUserAlreadyAssigned(
          employee.id,
          slotKey,
        ),
    );

    setEditingIds([]);

    setForm({
      slot: slotKey,
      userIds: [
        availableUsers[0]?.id ?? '',
        availableUsers[1]?.id ?? '',
      ],
      supervisorId: '',
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
      pair[0]?.start_time ?? '06:00',
    );

    const slot = getSlotInfo(slotKey);

    setEditingIds(
      pair.map((row) => row.id),
    );

    setForm({
      slot: slotKey,
      userIds: [
        pair[0]?.user_id ?? '',
        pair[1]?.user_id ?? '',
      ],
      supervisorId:
        pair[0]?.supervisor_id ?? '',
      start:
        pair[0]?.start_time.slice(0, 5) ??
        slot.from,
      end:
        pair[0]?.end_time.slice(0, 5) ??
        slot.to,
      notes:
        pair[0]?.notes ??
        pair[1]?.notes ??
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
      note: absence.note ?? '',
    });

    setEditor('absence');
  };

  const saveShift = async () => {
    if (!canManage || saving) return;

    const [firstUser, secondUser] =
      form.userIds;

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

    const selectedUsers = [
      firstUser,
      secondUser,
    ];

    const supervisor = form.supervisorId
      ? userMap.get(form.supervisorId)
      : null;

    if (
      supervisor &&
      !HIGH_ROLES.has(supervisor.role)
    ) {
      showError(
        'Supervisore non valido',
        'Il supervisore deve essere Proprietario, Direttore o Vice Direttore.',
      );

      return;
    }

    if (
      form.supervisorId &&
      selectedUsers.includes(
        form.supervisorId,
      )
    ) {
      showError(
        'Supervisore non valido',
        'Il supervisore deve essere diverso dalle due persone del turno.',
      );

      return;
    }

    if (
      form.supervisorId &&
      isUserAbsentInSlot(
        form.supervisorId,
        form.slot,
      )
    ) {
      showWarning(
        'Supervisore assente',
        'Il supervisore selezionato è assente in questa fascia.',
      );

      return;
    }

    if (
      selectedUsers.some((userId) =>
        isUserAbsentInSlot(
          userId,
          form.slot,
        ),
      )
    ) {
      showWarning(
        'Persona assente',
        'Una delle persone selezionate è assente in questa fascia.',
      );

      return;
    }

    if (
      selectedUsers.some((userId) =>
        isUserAlreadyAssigned(
          userId,
          form.slot,
        ),
      )
    ) {
      showWarning(
        'Turno già presente',
        'Una delle persone selezionate è già assegnata a questa fascia.',
      );

      return;
    }

    setSaving(true);

    try {
      if (editingIds.length > 0) {
        const { error } = await supabase
          .from('daily_shifts')
          .delete()
          .in('id', editingIds);

        if (error) throw error;
      }

      const payload = selectedUsers.map(
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
          supervisor_id:
            form.supervisorId || null,
        }),
      );

      const {
        data,
        error,
      } = await supabase
        .from('daily_shifts')
        .insert(payload)
        .select(
          'id,user_id,shift_date,start_time,end_time,notes,supervisor_id',
        );

      if (error) throw error;

      const newRows =
        (data ?? []) as Shift[];

      setShifts((current) =>
        sortByStartTime([
          ...current.filter(
            (item) =>
              !editingIds.includes(item.id),
          ),
          ...newRows,
        ]),
      );

      setEditor(null);

      showSuccess(
        editingIds.length > 0
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
      const info = getSlotInfo(
        absenceForm.slot,
      );

      const payload = {
        user_id: user.id,
        absence_date: selectedDate,
        slot: absenceForm.slot,
        start_time: normalizeTime(
          info.from,
        ),
        end_time: normalizeTime(info.to),
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
            : sortByStartTime([
                ...current,
                data as Absence,
              ]),
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
      rows.length === 0 ||
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-400">
                +
              </div>
            )}

            <div className="flex min-w-[150px] items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/80 px-2.5 py-2">
              <Avatar
                src={
                  employee.avatar_url ??
                  undefined
                }
                alt={employee.name}
                size="sm"
                fallbackText={
                  employee.name
                }
              />

              <div className="min-w-0">
                <p className="max-w-[160px] truncate text-sm font-bold text-gray-900">
                  {employee.name}
                </p>

                <p className="text-[11px] text-gray-500">
                  {ROLE_LABELS[
                    employee.role
                  ] ?? employee.role}
                </p>
              </div>
            </div>
          </React.Fragment>
        );
      },
    );

  const renderSupervisor = (
    supervisorId: string | null | undefined,
    mobile = false,
  ) => {
    if (!supervisorId) return null;

    const supervisor =
      userMap.get(supervisorId);

    if (!supervisor) return null;

    return (
      <div
        className={[
          'flex items-center gap-2.5 rounded-xl border',
          'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50',
          mobile
            ? 'mt-3 p-3'
            : 'mt-3 max-w-[280px] p-2.5',
        ].join(' ')}
      >
        <div className="relative shrink-0">
          <Avatar
            src={
              supervisor.avatar_url ??
              undefined
            }
            alt={supervisor.name}
            size="sm"
            fallbackText={
              supervisor.name
            }
          />

          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-amber-500" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-xs font-bold text-gray-900">
              {supervisor.name}
            </p>

            <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-900">
              Supervisore
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-gray-500">
              {ROLE_LABELS[
                supervisor.role
              ] ?? supervisor.role}
            </span>

            <span className="h-1 w-1 rounded-full bg-gray-300" />

            <span className="text-[10px] font-semibold text-amber-700">
              Responsabile fascia
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderAbsences = (
    slot: ShiftSlot,
  ) => {
    const rows =
      absencesBySlot.get(slot) ?? [];

    return rows.map((absence) => {
      const employee =
        userMap.get(absence.user_id);

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
              employee.avatar_url ??
              undefined
            }
            alt={employee.name}
            size="sm"
            fallbackText={
              employee.name
            }
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-red-900">
              {employee.name} · ASSENTE
            </p>

            <p className="text-[11px] text-red-700">
              {absence.slot ===
              'tutto_giorno'
                ? 'Tutto il giorno'
                : absence.note ??
                  'Assenza registrata'}
            </p>
          </div>

          {own && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() =>
                  openEditAbsence(absence)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-100"
                title="Modifica assenza"
              >
                <Edit3 className="h-3.5 w-3.5 text-red-700" />
              </button>

              <button
                type="button"
                onClick={() =>
                  void removeAbsence(
                    absence,
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-100"
                title="Elimina assenza"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-700" />
              </button>
            </div>
          )}
        </div>
      );
    });
  };

  if (!isOnService) {
    return (
      <div className="flex min-h-[520px] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl shadow-amber-100/50 sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <CalendarDays className="h-8 w-8 text-amber-500" />
          </div>

          <h3 className="text-xl font-bold text-gray-900">
            Non sei in servizio
          </h3>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Metti lo stato in servizio per
            visualizzare e gestire i turni.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8">
      {/* HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900 p-5 text-white shadow-xl sm:p-7">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-300">
              <CalendarDays className="h-5 w-5" />

              <span className="text-xs font-bold uppercase tracking-[0.2em]">
                Programmazione
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Turni
            </h1>

            <p className="mt-1 max-w-xl text-sm text-gray-300">
              Organizza le squadre per fascia
              oraria e monitora le assenze in
              tempo reale.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
            <button
              type="button"
              onClick={() =>
                openCreateAbsence()
              }
              disabled={
                !user?.id || saving
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-500/15 px-4 font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserRoundX className="h-5 w-5" />
              Comunica assenza
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() =>
                  openCreateShift()
                }
                disabled={
                  users.length < 2 ||
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
      </section>

      {/* DATE NAVIGATION */}
      <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 transition hover:bg-gray-50"
            title="Giorno precedente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 text-center">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">
              Programmazione del giorno
            </p>

            <p className="truncate text-sm font-bold capitalize text-gray-900 sm:text-base">
              {displayDate(
                selectedDate,
              )}
            </p>
          </div>

          <button
            type="button"
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 transition hover:bg-gray-50"
            title="Giorno successivo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
          {weekDates.map((date) => {
            const value = formatDate(date);
            const active =
              value === selectedDate;

            return (
              <button
                type="button"
                key={value}
                onClick={() =>
                  setSelectedDate(value)
                }
                className={[
                  'min-w-0 rounded-xl px-1 py-2 text-center transition',
                  active
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100',
                ].join(' ')}
              >
                <span className="block truncate text-[9px] font-semibold uppercase sm:text-xs">
                  {shortDate(date).split(
                    ' ',
                  )[0]}
                </span>

                <span className="mt-0.5 block text-sm font-bold sm:text-base">
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* SHIFTS */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* DESKTOP */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1050px] border-collapse">
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
                {SHIFT_SLOTS.map(
                  (slot) => {
                    const Icon = slot.icon;

                    const rows =
                      shiftsBySlot.get(
                        slot.key,
                      ) ?? [];

                    const absenceRows =
                      absencesBySlot.get(
                        slot.key,
                      ) ?? [];

                    const supervisor =
                      rows[0]
                        ?.supervisor_id
                        ? userMap.get(
                            rows[0]
                              .supervisor_id,
                          )
                        : null;

                    return (
                      <tr
                        key={slot.key}
                        className="border-b border-gray-100 align-top last:border-0"
                      >
                        {/* SLOT */}
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
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

                        {/* TEAM */}
                        <td className="px-5 py-5">
                          {rows.length >
                          0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {renderPeople(
                                rows,
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-400">
                              Nessun turno
                              assegnato
                            </div>
                          )}

                          {supervisor &&
                            renderSupervisor(
                              supervisor.id,
                            )}

                          {absenceRows.length >
                            0 && (
                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Copertura da
                              verificare
                            </div>
                          )}
                        </td>

                        {/* TIME */}
                        <td className="px-5 py-5">
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

                        {/* ABSENCES */}
                        <td className="px-5 py-5">
                          {absenceRows.length >
                          0 ? (
                            absenceRows.map(
                              (
                                absence,
                              ) => {
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
                                          employee.avatar_url ??
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
                                            : absence.note ??
                                              'Nessuna nota'}
                                        </p>
                                      </div>
                                    </div>

                                    {absence.user_id ===
                                      user?.id && (
                                      <div className="mt-2 flex justify-end gap-1">
                                        <button
                                          type="button"
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
                                          type="button"
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
                              Nessuna
                              assenza
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-5 py-5 text-right">
                          {canManage &&
                            rows.length >
                              0 && (
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditShift(
                                      rows,
                                    )
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-amber-50 hover:text-amber-600"
                                  title="Modifica coppia"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void removePair(
                                      rows,
                                    )
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                  title="Elimina coppia"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}
          <div className="divide-y divide-gray-100 md:hidden">
            {SHIFT_SLOTS.map(
              (slot) => {
                const Icon = slot.icon;

                const rows =
                  shiftsBySlot.get(
                    slot.key,
                  ) ?? [];

                const supervisor =
                  rows[0]
                    ?.supervisor_id
                    ? userMap.get(
                        rows[0]
                          .supervisor_id,
                      )
                    : null;

                return (
                  <section
                    key={slot.key}
                    className="p-4"
                  >
                    {/* SLOT HEADER */}
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900">
                            {slot.label}
                          </h3>

                          <p className="text-xs text-gray-500">
                            {slot.subtitle}
                          </p>
                        </div>
                      </div>

                      {rows.length >
                        0 && (
                        <span className="shrink-0 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[10px] font-bold text-gray-600">
                          {rows.length ===
                          2
                            ? '2 PERSONE'
                            : '1 PERSONA'}
                        </span>
                      )}
                    </div>

                    {/* PEOPLE */}
                    {rows.length >
                    0 ? (
                      <div className="space-y-2">
                        {rows
                          .slice(0, 2)
                          .map(
                            (
                              shift,
                            ) => {
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
                                      employee.avatar_url ??
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
                                      ] ??
                                        employee.role}
                                    </p>

                                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                                      <Clock3 className="h-3 w-3" />

                                      {shift.start_time.slice(
                                        0,
                                        5,
                                      )}{' '}
                                      —
                                      {shift.end_time.slice(
                                        0,
                                        5,
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            },
                          )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                        Nessun turno
                        assegnato
                      </div>
                    )}

                    {/* SUPERVISOR */}
                    {supervisor &&
                      renderSupervisor(
                        supervisor.id,
                        true,
                      )}

                    {/* ABSENCES */}
                    {renderAbsences(
                      slot.key,
                    )}

                    {/* ACTIONS */}
                    {canManage &&
                      rows.length >
                        0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditShift(
                                rows,
                              )
                            }
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Modifica
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void removePair(
                                rows,
                              )
                            }
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-100 text-xs font-bold text-red-700 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Elimina
                          </button>
                        </div>
                      )}
                  </section>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* SHIFT MODAL */}
      {editor === 'shift' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2 text-amber-600">
                  <Clock3 className="h-4 w-4" />

                  <span className="text-[10px] font-extrabold uppercase tracking-[0.18em]">
                    Programmazione
                  </span>
                </div>

                <h2 className="text-lg font-bold text-gray-900">
                  {editingIds.length >
                  0
                    ? 'Modifica coppia'
                    : 'Aggiungi turno'}
                </h2>

                <p className="text-xs capitalize text-gray-500">
                  {displayDate(
                    selectedDate,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditor(null)
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:bg-gray-100"
                title="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* SLOT */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Fascia
                </span>

                <select
                  value={form.slot}
                  onChange={(event) => {
                    const slotKey =
                      event.target
                        .value as ShiftSlot;

                    const slot =
                      getSlotInfo(
                        slotKey,
                      );

                    const available =
                      users.filter(
                        (employee) =>
                          !isUserAbsentInSlot(
                            employee.id,
                            slotKey,
                          ) &&
                          !isUserAlreadyAssigned(
                            employee.id,
                            slotKey,
                          ),
                      );

                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        slot: slotKey,
                        userIds: [
                          available[0]
                            ?.id ?? '',
                          available[1]
                            ?.id ?? '',
                        ],
                        supervisorId:
                          '',
                        start:
                          slot.from,
                        end:
                          slot.to,
                      }),
                    );
                  }}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                >
                  {SHIFT_SLOTS.map(
                    (slot) => (
                      <option
                        key={
                          slot.key
                        }
                        value={
                          slot.key
                        }
                      >
                        {slot.label} ·{' '}
                        {
                          slot.subtitle
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              {/* PEOPLE */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {form.userIds.map(
                  (
                    id,
                    index,
                  ) => {
                    const availableUsers =
                      getAvailableUsers(
                        index,
                      );

                    return (
                      <label
                        key={index}
                        className="block"
                      >
                        <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Persona{' '}
                          {index +
                            1}
                        </span>

                        <select
                          value={id}
                          onChange={(
                            event,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => {
                                const userIds =
                                  [
                                    ...current.userIds,
                                  ] as [
                                    string,
                                    string,
                                  ];

                                userIds[
                                  index
                                ] =
                                  event
                                    .target
                                    .value;

                                return {
                                  ...current,
                                  userIds,
                                };
                              },
                            )
                          }
                          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                        >
                          {!id && (
                            <option value="">
                              Seleziona
                              persona
                            </option>
                          )}

                          {availableUsers.map(
                            (
                              employee,
                            ) => (
                              <option
                                key={
                                  employee.id
                                }
                                value={
                                  employee.id
                                }
                              >
                                {
                                  employee.name
                                }{' '}
                                ·{' '}
                                {ROLE_LABELS[
                                  employee
                                    .role
                                ] ??
                                  employee.role}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    );
                  },
                )}
              </div>

              {/* SUPERVISOR */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
                <div className="mb-2.5 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <UserRoundX className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Supervisore
                    </p>

                    <p className="text-[11px] text-gray-500">
                      Opzionale · responsabile
                      della fascia
                    </p>
                  </div>
                </div>

                <select
                  value={
                    form.supervisorId
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        supervisorId:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                >
                  <option value="">
                    Nessun supervisore
                  </option>

                  {users
                    .filter(
                      (employee) =>
                        HIGH_ROLES.has(
                          employee.role,
                        ) &&
                        !form.userIds.includes(
                          employee.id,
                        ) &&
                        !isUserAbsentInSlot(
                          employee.id,
                          form.slot,
                        ),
                    )
                    .map(
                      (
                        employee,
                      ) => (
                        <option
                          key={
                            employee.id
                          }
                          value={
                            employee.id
                          }
                        >
                          {
                            employee.name
                          }{' '}
                          ·{' '}
                          {ROLE_LABELS[
                            employee
                              .role
                          ] ??
                            employee.role}
                        </option>
                      ),
                    )}
                </select>
              </div>

              {/* TIME */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Inizio
                  </span>

                  <input
                    type="time"
                    value={form.start}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          start: event
                            .target
                            .value,
                        }),
                      )
                    }
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Fine
                  </span>

                  <input
                    type="time"
                    value={form.end}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          end: event
                            .target
                            .value,
                        }),
                      )
                    }
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </label>
              </div>

              {/* NOTES */}
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      notes: event.target
                        .value,
                    }),
                  )
                }
                rows={3}
                maxLength={500}
                placeholder="Nota del turno (opzionale)"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />

              {/* ACTIONS */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setEditor(null)
                  }
                  className="min-h-11 flex-1 rounded-xl border border-gray-200 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void saveShift()
                  }
                  disabled={saving}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-gray-950 transition hover:bg-amber-400 disabled:opacity-60"
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

      {/* ABSENCE MODAL */}
      {editor === 'absence' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
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
                type="button"
                onClick={() =>
                  setEditor(null)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100"
                title="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <Avatar
                  src={
                    user?.avatar_url ??
                    undefined
                  }
                  alt={
                    user?.name ??
                    'Tu'
                  }
                  size="md"
                  fallbackText={
                    user?.name ??
                    'Tu'
                  }
                />

                <div>
                  <p className="font-bold text-gray-900">
                    {user?.name ??
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
                      (current) => ({
                        ...current,
                        slot: event
                          .target
                          .value as Slot,
                      }),
                    )
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  {SLOTS.map(
                    (slot) => (
                      <option
                        key={
                          slot.key
                        }
                        value={
                          slot.key
                        }
                      >
                        {slot.label} ·{' '}
                        {
                          slot.subtitle
                        }
                      </option>
                    ),
                  )}
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
                      (current) => ({
                        ...current,
                        note: event
                          .target
                          .value,
                      }),
                    )
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="Es. malattia, permesso, impegno personale..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </label>

              <div className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-800">
                <strong>Nota:</strong>{' '}
                comunichi solo la tua
                assenza. I gradi alti
                verranno avvisati
                automaticamente in
                tempo reale.
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditor(null)
                  }
                  className="min-h-11 flex-1 rounded-xl border border-gray-200 font-semibold transition hover:bg-gray-50"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void saveAbsence()
                  }
                  disabled={saving}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
                >
                  {saving ? (
                    'Salvataggio...'
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Comunica
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
