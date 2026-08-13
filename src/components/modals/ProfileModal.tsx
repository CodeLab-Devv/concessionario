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
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Save,
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

      const changedEmail = email !== user.email.toLowerCase();
      let emailChanged = false;

      if (changedEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Inserisci un indirizzo email valido.');
        }

        const { data, error: emailError } = await supabase.functions.invoke('update-own-email', {
          body: { email },
        });

        if (emailError) {
          throw new Error(`Impossibile cambiare email: ${emailError.message}`);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Impossibile cambiare email.');
        }

        emailChanged = true;
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
      const changedPassword = Boolean(formData.newPassword);

      if (!changedProfile && !emailChanged && !changedPassword) {
        showError('Nessuna modifica', 'Non sono state rilevate modifiche da salvare.');
        return;
      }

      await refreshUserProfile?.();
      setFormData(prev => ({
        ...prev,
        email: emailChanged ? email : email || user.email,
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
    { field: 'confirmPassword', label: 'Conferma nuova password', visible: showConfirmPassword, toggle: setShowConfirmPassword, icon: CheckCircle2 },
  ];

  if (!isOpen || !user || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-[30px] sm:border sm:border-white/70 sm:shadow-[0_35px_110px_rgba(15,23,42,0.30)]"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="shrink-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_34%),linear-gradient(135deg,#0f172a,#1e293b)] px-5 pb-5 pt-[calc(1rem+env(safe-area-inset-top))] text-white sm:px-8 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Aurum Motors</p>
              <h2 id="profile-modal-title" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Il mio profilo</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-300 sm:text-sm">Gestisci il tuo account, la disponibilità e la sicurezza da un unico spazio.</p>
            </div>
            <button type="button" onClick={handleClose} aria-label="Chiudi profilo" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/15 hover:text-white active:scale-95"><X className="h-5 w-5" /></button>
          </div>

          <div className="mt-5 flex items-center gap-3 overflow-x-auto pb-1 sm:mt-6 sm:max-w-md">
            {(['profile', 'security'] as const).map(tab => {
              const active = activeTab === tab;
              return <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                {tab === 'profile' ? <User className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                {tab === 'profile' ? 'Profilo' : 'Sicurezza'}
              </button>;
            })}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="relative shrink-0">
                <Avatar src={currentAvatarUrl} alt={user.name} size="xl" fallbackText={user.name} className="h-24 w-24 rounded-[24px] ring-4 ring-amber-50 shadow-[0_12px_35px_rgba(15,23,42,0.14)]" />
                <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white ${user.isOnService ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-start"><h3 className="max-w-full truncate text-2xl font-bold text-slate-900">{user.name}</h3><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${roleMeta.className}`}>{roleMeta.icon}{roleMeta.label}</span></div>
                <div className="mt-2 flex flex-col gap-1.5 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-4"><span className="inline-flex min-w-0 items-center justify-center gap-1.5 sm:justify-start"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{user.email}</span></span><span className="inline-flex items-center justify-center gap-1.5 sm:justify-start"><span className={`h-2 w-2 rounded-full ${user.isOnService ? 'bg-emerald-500' : 'bg-slate-300'}`} />{user.isOnService ? 'In servizio' : 'Fuori servizio'}</span></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-8">
            {activeTab === 'profile' ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">Immagine</p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900">Foto profilo</h4>
                  <div className="mt-5 flex flex-col items-center text-center"><AvatarUpload currentAvatarUrl={currentAvatarUrl} onAvatarUpdate={handleAvatarUpdate} size="md" /><p className="mt-4 max-w-xs text-xs leading-5 text-slate-500">Usa JPG, PNG, GIF o WEBP. Le immagini grandi vengono compresse automaticamente.</p></div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600">Account</p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900">Informazioni personali</h4>
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Nome completo</span><div className="relative"><User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required value={formData.name} onChange={event => setFormData(previous => ({ ...previous, name: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" /></div></label>
                    <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Email</span><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required type="email" value={formData.email} onChange={event => setFormData(previous => ({ ...previous, email: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" /></div></label>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">Disponibilità</p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900">Turni e disponibilità</h4>
                  <div className="mt-5"><AvailabilityEditor value={formData.availability} onChange={availability => setFormData(previous => ({ ...previous, availability }))} /></div>
                </section>
              </div>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><LockKeyhole className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Sicurezza</p><h4 className="mt-1 text-lg font-bold text-slate-900">Password account</h4><p className="mt-1 text-sm leading-5 text-slate-500">La password attuale viene verificata prima di applicare quella nuova.</p></div></div>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {passwordFields.map(({ field, label, visible, toggle, icon: Icon }) => (
                    <label key={field} className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><div className="relative"><Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type={visible ? 'text' : 'password'} value={formData[field]} onChange={event => setFormData(previous => ({ ...previous, [field]: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} /><button type="button" onClick={() => toggle(previous => !previous)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700" aria-label={visible ? 'Nascondi password' : 'Mostra password'}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={handleClose} className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Annulla</button>
              <button type="submit" disabled={isLoading} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 text-sm font-bold text-white shadow-lg transition hover:from-yellow-600 hover:to-amber-700 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{isLoading ? 'Salvataggio...' : 'Salva modifiche'}</button>
            </div>
          </form>
        </main>
      </div>
    </div>,
    document.body,
  );
};
