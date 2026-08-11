import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../ui/NotificationManager';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../Avatar';
import { AvatarUpload } from '../AvatarUpload';
import { AvailabilityEditor } from '../AvailabilityEditor';
import { X, User, Mail, Shield, Eye, EyeOff, Save, Crown, Award, UserCheck, Lock, Key, CheckCircle } from 'lucide-react';

interface ProfileModalProps { isOpen: boolean; onClose: () => void; }
type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUserProfile } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | undefined>(user?.avatar_url);
  const [formData, setFormData] = useState({ name: '', email: '', availability: '', currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (!user || !isOpen) return;
    setFormData({ name: user.name || '', email: user.email || '', availability: user.availability || '', currentPassword: '', newPassword: '', confirmPassword: '' });
    setCurrentAvatarUrl(user.avatar_url);
  }, [user, isOpen]);

  const handleAvatarUpdate = async (url: string) => {
    setCurrentAvatarUrl(url || undefined);
    await refreshUserProfile?.();
    showSuccess('Avatar aggiornato', 'La tua immagine profilo è stata aggiornata con successo');
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
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Inserisci un indirizzo email valido.');
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
        const { error: passwordError } = await supabase.auth.updateUser({ password: formData.newPassword, current_password: formData.currentPassword } as Parameters<typeof supabase.auth.updateUser>[0]);
        if (passwordError) {
          const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: formData.currentPassword });
          if (reauthError) throw new Error('Password attuale non corretta.');
          const { error: retryError } = await supabase.auth.updateUser({ password: formData.newPassword });
          if (retryError) throw new Error(`Impossibile cambiare password: ${retryError.message}`);
        }
      }

      if (Object.keys(updates).length === 0 && !formData.newPassword && email === user.email.toLowerCase()) {
        showError('Nessuna modifica', 'Non sono state rilevate modifiche da salvare.');
        return;
      }
      await refreshUserProfile?.();
      setFormData(prev => ({ ...prev, email: email || user.email, currentPassword: '', newPassword: '', confirmPassword: '' }));
      showSuccess('Profilo aggiornato', 'Le modifiche sono state salvate correttamente.');
    } catch (error) {
      console.error('Profile update error:', error);
      showError('Errore aggiornamento', error instanceof Error ? error.message : 'Errore imprevisto.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: user?.name || '', email: user?.email || '', availability: user?.availability || '', currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const roleIcon = {
    owner: <Crown className="h-5 w-5 text-yellow-600" />, director: <Shield className="h-5 w-5 text-blue-600" />, vice_director: <Award className="h-5 w-5 text-purple-600" />, employee: <UserCheck className="h-5 w-5 text-green-600" />, probation: <User className="h-5 w-5 text-orange-600" />,
  }[user?.role || 'probation'];
  const roleLabel = { owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In Prova' }[user?.role || 'probation'];

  const passwordFields: Array<{ field: PasswordField; label: string; visible: boolean; toggle: React.Dispatch<React.SetStateAction<boolean>>; icon: React.ElementType }> = [
    { field: 'currentPassword', label: 'Password attuale', visible: showCurrentPassword, toggle: setShowCurrentPassword, icon: Lock },
    { field: 'newPassword', label: 'Nuova password', visible: showNewPassword, toggle: setShowNewPassword, icon: Key },
    { field: 'confirmPassword', label: 'Conferma nuova password', visible: showConfirmPassword, toggle: setShowConfirmPassword, icon: CheckCircle },
  ];

  if (!isOpen || !user) return null;

  return (
    <div className="safe-area-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="modal-shell flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="shrink-0 bg-gradient-to-br from-slate-800 via-gray-800 to-slate-900 p-5 text-white sm:p-7">
          <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="rounded-2xl bg-blue-600 p-3"><User className="h-7 w-7" /></div><div><h2 className="text-2xl font-bold">Il Mio Profilo</h2><p className="text-sm text-blue-100">Dati personali, disponibilità e sicurezza</p></div></div><button type="button" onClick={handleClose} className="rounded-xl p-2 hover:bg-white/10"><X className="h-6 w-6" /></button></div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50 p-5 sm:p-7"><div className="flex flex-col items-center gap-4 sm:flex-row"><Avatar src={currentAvatarUrl} alt={user.name} size="xl" fallbackText={user.name} className="h-24 w-24 ring-4 ring-white shadow-xl" /><div className="text-center sm:text-left"><h3 className="text-2xl font-bold text-gray-900">{user.name}</h3><div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start"><span className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-blue-500" />{user.email}</span><span className="flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm font-semibold shadow-sm">{roleIcon}{roleLabel}</span></div></div></div></div>
          <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="space-y-5 rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><h4 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><User className="h-5 w-5 text-blue-500" />Informazioni personali</h4><div><label className="mb-2 block text-sm font-medium text-gray-700">Immagine profilo</label><AvatarUpload currentAvatarUrl={currentAvatarUrl} onAvatarUpdate={handleAvatarUpdate} size="md" /><p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-500">JPG, PNG, GIF o WEBP. Le immagini grandi vengono compresse automaticamente sotto 5 MB.</p></div><div><label className="mb-2 block text-sm font-medium text-gray-700">Nome completo</label><div className="relative"><input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" /><User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /></div></div><div><label className="mb-2 block text-sm font-medium text-gray-700">Email</label><div className="relative"><input required type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" /><Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /></div></div><div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><AvailabilityEditor value={formData.availability} onChange={availability => setFormData(p => ({ ...p, availability }))} /></div></section>
              <section className="space-y-5 rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><h4 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Lock className="h-5 w-5 text-green-500" />Sicurezza account</h4><div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Per cambiare password inserisci la password attuale e la nuova password. La verifica viene eseguita da Supabase.</div>{passwordFields.map(({ field, label, visible, toggle, icon: Icon }) => <div key={field}><label className="mb-2 block text-sm font-medium text-gray-700">{label}</label><div className="relative"><input type={visible ? 'text' : 'password'} value={formData[field]} onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))} minLength={field !== 'currentPassword' ? 6 : undefined} className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-10 pr-11 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500" /><Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><button type="button" onClick={() => toggle(value => !value)} className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-700">{visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>)}</section>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row"><button type="button" onClick={handleClose} className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50">Annulla</button><button type="submit" disabled={isLoading} className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 font-medium text-white shadow-lg transition hover:from-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <span className="mx-auto block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <span className="flex items-center justify-center gap-2"><Save className="h-5 w-5" />Salva Modifiche</span>}</button></div>
          </form>
        </div>
      </div>
    </div>
  );
};
