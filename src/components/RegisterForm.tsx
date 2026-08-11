import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './ui/NotificationManager';
import { supabase } from '../lib/supabase';
import { AvailabilityEditor, createDefaultAvailability, serializeAvailability } from './AvailabilityEditor';
import { UserPlus, Mail, Lock, Eye, EyeOff, Car, Clock3 } from 'lucide-react';
import { getErrorMessage } from '../utils/errorHandling';

interface RegisterFormProps { onToggleMode: () => void; }

export const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [availability, setAvailability] = useState(() => serializeAvailability(createDefaultAvailability()));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError(''); setSuccess(''); setLoading(true);

    try {
      if (!name.trim() || !email.trim() || !password) throw new Error('Compila tutti i campi.');
      if (password.length < 6) throw new Error('La password deve essere di almeno 6 caratteri.');

      const { data: pendingToken, error: availabilityError } = await supabase.rpc('save_registration_availability', {
        p_email: email.trim().toLowerCase(),
        p_availability: availability,
      });
      if (availabilityError || !pendingToken) {
        throw new Error(`Impossibile salvare la disponibilità: ${availabilityError?.message || 'errore database'}`);
      }

      const result = await register(email.trim(), password, name.trim());
      if (!result.success) throw new Error(result.message || 'Errore nella registrazione.');

      const { error: applyError } = await supabase.rpc('apply_registration_availability', { p_token: pendingToken });
      if (applyError) console.warn('Disponibilità registrazione non applicata immediatamente:', applyError);

      setSuccess(result.message || 'Registrazione completata! Ora puoi accedere.');
      setEmail(''); setPassword(''); setName('');
      setAvailability(serializeAvailability(createDefaultAvailability()));
    } catch (err: unknown) {
      console.error('Registration form exception:', err);
      setError(getErrorMessage(err, 'Errore imprevisto durante la registrazione'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-viewport flex items-center justify-center overflow-y-auto bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 px-4 py-8">
      <div className="relative z-10 w-full max-w-2xl">
        <div className="rounded-2xl border border-gray-700/50 bg-gray-800/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 shadow-xl">
              <Car className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold tracking-wide text-white">AURUM MOTORS</h2>
            <p className="mt-1 text-sm font-semibold tracking-widest text-yellow-400">CONCESSIONARIO</p>
            <p className="mt-2 text-sm text-gray-400">Crea il tuo profilo dipendente</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Nome Completo</label>
                <div className="relative"><UserPlus className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" /><input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700/60 py-3 pl-10 pr-3 text-white outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Nome Cognome" /></div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Email</label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" /><input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700/60 py-3 pl-10 pr-3 text-white outline-none focus:ring-2 focus:ring-yellow-500" placeholder="email@esempio.com" /></div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Password</label>
              <div className="relative"><Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" /><input required type={showPassword ? 'text' : 'password'} minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700/60 py-3 pl-10 pr-11 text-white outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Password (min. 6 caratteri)" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-yellow-400">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-gray-900/40 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-white"><Clock3 className="h-5 w-5 text-blue-400" /><span className="font-semibold">Disponibilità dipendente</span></div>
              <AvailabilityEditor value={availability} onChange={setAvailability} compact />
              <p className="mt-3 text-xs text-gray-400">Questi orari saranno visibili ai responsabili in Gestisci Dipendenti e potranno essere modificati successivamente nelle impostazioni.</p>
            </div>

            <div className="flex items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm font-semibold text-yellow-300"><Car className="mr-2 h-5 w-5" />Concessionario — Aurum Motors</div>

            {error && <div className="rounded-lg border border-red-500/50 bg-red-900/40 p-3 text-sm text-red-300">{error}</div>}
            {success && <div className="rounded-lg border border-green-500/50 bg-green-900/40 p-3 text-sm text-green-300">{success}</div>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-yellow-600 to-amber-700 px-4 py-4 font-semibold text-white shadow-xl transition hover:from-yellow-700 hover:to-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? <span className="flex items-center justify-center gap-3"><span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />Registrazione in corso...</span> : <span className="flex items-center justify-center gap-3"><UserPlus className="h-5 w-5" />UNISCITI AD AURUM MOTORS</span>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">Hai già un account? <button type="button" onClick={onToggleMode} className="font-medium text-yellow-400 hover:text-yellow-300 hover:underline">Accedi</button></div>
        </div>
      </div>
    </div>
  );
};