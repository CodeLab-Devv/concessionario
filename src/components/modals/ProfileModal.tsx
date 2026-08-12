import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../ui/NotificationManager';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../Avatar';
import { AvatarUpload } from '../AvatarUpload';
import { AvailabilityEditor } from '../AvailabilityEditor';
import {
  Award,
  CheckCircle,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Save,
  Settings2,
  ShieldCheck,
  User,
  UserCheck,
  X,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

type RoleMeta = {
  label: string;
  className: string;
  icon: React.ReactNode;
};

const ROLE_META: Record<string, RoleMeta> = {
  owner: {
    label: 'Proprietario',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: <Crown className="h-4 w-4" />,
  },
  director: {
    label: 'Direttore',
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  vice_director: {
    label: 'Vice Direttore',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: <Award className="h-4 w-4" />,
  },
  employee: {
    label: 'Dipendente',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: <UserCheck className="h-4 w-4" />,
  },
  probation: {
    label: 'In Prova',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
    icon: <User className="h-4 w-4" />,
  },
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUserProfile } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | undefined>(user?.avatar_url);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    availability: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user || !isOpen) return;

    setFormData({
      name: user.name || '',
      email: user.email || '',
      availability: user.availability || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setCurrentAvatarUrl(user.avatar_url);
  }, [user, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleAvatarUpdate = async (url: string) => {
    setCurrentAvatarUrl(url || undefined);
    await refreshUserProfile?.();
    showSuccess('Avatar aggiornato', 'La tua immagine profilo è stata aggiornata.');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || isLoading) return;

    setIsLoading(true);

    try {
      const updates: { name?: string; availability?: string } = {};
      const name = formData.name.trim();
      const email = formData.email.trim().toLowerCase();
      const availability = formData.availability.trim();

      if (name !== user.name) updates.name = name;
      if (availability !== (user.availability || '')) updates.availability = availability;

      if (email !== user.email.toLowerCase()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Inserisci un indirizzo email valido.');
        }

        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw new Error(`Impossibile cambiare email: ${emailError.message}`);
        showSuccess('Email aggiornata', 'Il nuovo indirizzo email è stato salvato.');
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('users').update(updates).eq('id', user.id);
        if (error) throw new Error(`Errore aggiornamento profilo: ${error.message}`);
      }

      if (formData.newPassword) {
        if (!formData.currentPassword) throw new Error('Inserisci la password attuale.');
        if (formData.newPassword !== formData.confirmPassword) throw new Error('Le nuove password non coincidono.');
        if (formData.newPassword.length < 6) throw new Error('La nuova password deve avere almeno 6 caratteri.');

        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword,
          current_password: formData.currentPassword,
        } as Parameters<typeof supabase.auth.updateUser>[0]);

        if (passwordError) {
          const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: formData.currentPassword,
          });
          if (reauthError) throw new Error('Password attuale non corretta.');

          const { error: retryError } = await supabase.auth.updateUser({ password: formData.newPassword });
          if (retryError) throw new Error(`Impossibile cambiare password: ${retryError.message}`);
        }
      }

      const changedProfile = Object.keys(updates).length > 0;
      const changedEmail = email !== user.email.toLowerCase();
      const changedPassword = Boolean(formData.newPassword);

      if (!changedProfile && !changedEmail && !changedPassword) {
        showError('Nessuna modifica', 'Non sono state rilevate modifiche da salvare.');
        return;
      }

      await refreshUserProfile?.();
      setFormData(prev => ({
        ...prev,
        email: email || user.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      showSuccess('Profilo aggiornato', 'Le modifiche sono state salvate correttamente.');
    } catch (error) {
      console.error('Profile update error:', error);
      showError('Errore aggiornamento', error instanceof Error ? error.message : 'Errore imprevisto.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      availability: user?.availability || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const roleMeta = ROLE_META[user?.role || 'probation'] || ROLE_META.probation;

  const passwordFields: Array<{
    field: PasswordField;
    label: string;
    visible: boolean;
    toggle: React.Dispatch<React.SetStateAction<boolean>>;
    icon: React.ElementType;
  }> = [
    { field: 'currentPassword', label: 'Password attuale', visible: showCurrentPassword, toggle: setShowCurrentPassword, icon: LockKeyhole },
    { field: 'newPassword', label: 'Nuova password', visible: showNewPassword, toggle: setShowNewPassword, icon: KeyRound },
    { field: 'confirmPassword', label: 'Conferma nuova password', visible: showConfirmPassword, toggle: setShowConfirmPassword, icon: CheckCircle },
  ];

  if (!isOpen || !user || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.28)] sm:max-h-[calc(100dvh-2.5rem)]"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-inner backdrop-blur-sm sm:h-14 sm:w-14">
                <Settings2 className="h-6 w-6 text-amber-300 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Account</p>
                <h2 id="profile-modal-title" className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">Il mio profilo</h2>
                <p className="mt-1 text-xs text-slate-300 sm:text-sm">Gestisci informazioni personali, disponibilità e sicurezza.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Chiudi profilo"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/15 hover:text-white active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70">
          <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative mx-auto shrink-0 sm:mx-0">
                <Avatar
                  src={currentAvatarUrl}
                  alt={user.name}
                  size="xl"
                  fallbackText={user.name}
                  className="h-24 w-24 rounded-[22px] ring-4 ring-amber-50 shadow-[0_12px_35px_rgba(15,23,42,0.12)]"
                />
                <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white ${user.isOnService ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                  <h3 className="truncate text-2xl font-bold tracking-tight text-slate-900">{user.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${roleMeta.className}`}>
                    {roleMeta.icon}
                    {roleMeta.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500 sm:justify-start">
                  <span className="inline-flex min-w-0 items-center gap-1.5"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{user.email}</span></span>
                  <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${user.isOnService ? 'bg-emerald-500' : 'bg-slate-300'}`} />{user.isOnService ? 'In servizio' : 'Fuori servizio'}</span>
                </div>
              </div>

              <div className="hidden shrink-0 sm:block">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Aurum Motors</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">Profilo personale</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-8">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">Profilo</p>
                    <h4 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900"><User className="h-5 w-5 text-amber-500" />Informazioni personali</h4>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="shrink-0"><AvatarUpload currentAvatarUrl={currentAvatarUrl} onAvatarUpdate={handleAvatarUpdate} size="md" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">Immagine profilo</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">JPG, PNG, GIF o WEBP. Le immagini grandi vengono compresse automaticamente.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Nome completo</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        value={formData.name}
                        onChange={event => setFormData(previous => ({ ...previous, name: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={event => setFormData(previous => ({ ...previous, email: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                    <AvailabilityEditor
                      value={formData.availability}
                      onChange={availability => setFormData(previous => ({ ...previous, availability }))}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Protezione</p>
                  <h4 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900"><LockKeyhole className="h-5 w-5 text-emerald-500" />Sicurezza account</h4>
                </div>

                <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm"><ShieldCheck className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Account protetto</p>
                      <p className="mt-0.5 text-xs leading-5 text-emerald-700">Per cambiare password inserisci prima quella attuale.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {passwordFields.map(({ field, label, visible, toggle, icon: Icon }) => (
                    <div key={field}>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
                      <div className="relative">
                        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type={visible ? 'text' : 'password'}
                          value={formData[field]}
                          onChange={event => setFormData(previous => ({ ...previous, [field]: event.target.value }))}
                          minLength={field !== 'currentPassword' ? 6 : undefined}
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                        <button
                          type="button"
                          onClick={() => toggle(value => !value)}
                          aria-label={visible ? `Nascondi ${label.toLowerCase()}` : `Mostra ${label.toLowerCase()}`}
                          className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-slate-400 transition hover:text-slate-700"
                        >
                          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] sm:min-w-36"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(245,158,11,0.22)] transition hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-44"
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isLoading ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
};
