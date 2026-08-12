import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../ui/NotificationManager';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../Avatar';
import { AvatarUpload } from '../AvatarUpload';
import { AvailabilityEditor } from '../AvailabilityEditor';
import {
  Award,
  CheckCircle2,
  ChevronRight,
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
type ProfileTab = 'profile' | 'security';

type RoleMeta = {
  label: string;
  className: string;
  icon: React.ReactNode;
};

const ROLE_META: Record<string, RoleMeta> = {
  owner: {
    label: 'Proprietario',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: <Crown className="h-3.5 w-3.5" />,
  },
  director: {
    label: 'Direttore',
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
  vice_director: {
    label: 'Vice Direttore',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: <Award className="h-3.5 w-3.5" />,
  },
  employee: {
    label: 'Dipendente',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: <UserCheck className="h-3.5 w-3.5" />,
  },
  probation: {
    label: 'In Prova',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
    icon: <User className="h-3.5 w-3.5" />,
  },
};

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100';

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUserProfile } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
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

  const roleMeta = ROLE_META[user?.role || 'probation'] || ROLE_META.probation;
  const initials = useMemo(() => {
    const parts = (user?.name || 'Utente').trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
  }, [user?.name]);

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
    setActiveTab('profile');
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
      setFormData(previous => ({
        ...previous,
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

  const passwordFields: Array<{
    field: PasswordField;
    label: string;
    visible: boolean;
    toggle: React.Dispatch<React.SetStateAction<boolean>>;
    icon: React.ElementType;
  }> = [
    { field: 'currentPassword', label: 'Password attuale', visible: showCurrentPassword, toggle: setShowCurrentPassword, icon: LockKeyhole },
    { field: 'newPassword', label: 'Nuova password', visible: showNewPassword, toggle: setShowNewPassword, icon: KeyRound },
    { field: 'confirmPassword', label: 'Conferma nuova password', visible: showConfirmPassword, toggle: setShowConfirmPassword, icon: CheckCircle2 },
  ];

  if (!isOpen || !user || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 sm:mx-auto sm:my-5 sm:h-[calc(100dvh-2.5rem)] sm:max-w-6xl sm:rounded-[30px] sm:border sm:border-white/70 sm:shadow-[0_30px_100px_rgba(15,23,42,0.3)]"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="relative px-5 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:py-7 sm:pt-7">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Aurum Motors</p>
                <h2 id="profile-modal-title" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Il mio profilo</h2>
                <p className="mt-1 max-w-xl text-xs text-slate-300 sm:text-sm">Tutto ciò che riguarda il tuo account, in un unico posto.</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Chiudi profilo"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/15 hover:text-white active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex items-center gap-4 sm:mt-6 sm:gap-5">
              <div className="relative shrink-0">
                <Avatar
                  src={currentAvatarUrl}
                  alt={user.name}
                  size="xl"
                  fallbackText={initials}
                  className="h-20 w-20 rounded-[24px] border-2 border-white/20 shadow-2xl sm:h-24 sm:w-24"
                />
                <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-slate-900 ${user.isOnService ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="max-w-full truncate text-2xl font-bold tracking-tight sm:text-3xl">{user.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${roleMeta.className}`}>
                    {roleMeta.icon}
                    {roleMeta.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 sm:text-sm">
                  <span className="inline-flex min-w-0 items-center gap-1.5"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{user.email}</span></span>
                  <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${user.isOnService ? 'bg-emerald-400' : 'bg-slate-400'}`} />{user.isOnService ? 'In servizio' : 'Fuori servizio'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative border-t border-white/10 px-3 pt-2 sm:px-8 sm:pt-3">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/5 p-1 sm:flex sm:w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition sm:min-w-40 sm:text-sm ${activeTab === 'profile' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                <User className="h-4 w-4" />
                Profilo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition sm:min-w-40 sm:text-sm ${activeTab === 'security' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                <LockKeyhole className="h-4 w-4" />
                Sicurezza
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
            {activeTab === 'profile' ? (
              <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Immagine</p>
                    <h4 className="mt-1 text-lg font-bold text-slate-900">La tua identità</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Personalizza il profilo visibile nel concessionario.</p>
                  </div>

                  <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-amber-50 p-6 text-center">
                    <AvatarUpload currentAvatarUrl={currentAvatarUrl} onAvatarUpdate={handleAvatarUpdate} size="md" />
                    <p className="mt-4 text-sm font-semibold text-slate-800">Immagine profilo</p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">JPG, PNG, GIF o WEBP. Le immagini grandi vengono compresse automaticamente.</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Ruolo</p>
                      <p className="mt-1 text-sm font-bold text-slate-800">{roleMeta.label}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Servizio</p>
                      <p className={`mt-1 text-sm font-bold ${user.isOnService ? 'text-emerald-700' : 'text-slate-700'}`}>{user.isOnService ? 'Attivo' : 'Non attivo'}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Account</p>
                    <h4 className="mt-1 text-lg font-bold text-slate-900">Informazioni personali</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Aggiorna i dati con cui il team ti identifica.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Nome completo</label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input required value={formData.name} onChange={event => setFormData(previous => ({ ...previous, name: event.target.value }))} className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input required type="email" value={formData.email} onChange={event => setFormData(previous => ({ ...previous, email: event.target.value }))} className={inputClass} />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">Disponibilità</p>
                          <p className="text-xs text-slate-500">Come sei normalmente disponibile per il team.</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-amber-500" />
                      </div>
                      <AvailabilityEditor value={formData.availability} onChange={availability => setFormData(previous => ({ ...previous, availability }))} />
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-sm sm:p-6">
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
                      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Protezione</p>
                      <h4 className="mt-1 text-xl font-bold text-slate-900">Sicurezza account</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-500">Aggiorna la password e mantieni protetto il tuo accesso.</p>
                    </div>
                    <div className="mt-8 rounded-2xl border border-white bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                      <p className="text-xs font-bold text-emerald-800">Consiglio</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Usa una password che non riutilizzi su altri servizi.</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><KeyRound className="h-5 w-5" /></div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Cambia password</h4>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Inserisci la password attuale e scegli quella nuova.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {passwordFields.map(({ field, label, visible, toggle, icon: Icon }) => (
                      <div key={field}>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
                        <div className="relative">
                          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input type={visible ? 'text' : 'password'} value={formData[field]} onChange={event => setFormData(previous => ({ ...previous, [field]: event.target.value }))} minLength={field !== 'currentPassword' ? 6 : undefined} className={`${inputClass} pr-12 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100`} />
                          <button type="button" onClick={() => toggle(value => !value)} aria-label={visible ? `Nascondi ${label.toLowerCase()}` : `Mostra ${label.toLowerCase()}`} className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:text-slate-700">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleClose} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] sm:min-w-36">Annulla</button>
              <button type="submit" disabled={isLoading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-sm font-bold text-white shadow-[0_10px_25px_rgba(245,158,11,0.22)] transition hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-48">
                {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save className="h-4 w-4" />}
                {isLoading ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
