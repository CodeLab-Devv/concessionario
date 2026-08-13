import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, CarFront, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { getErrorMessage } from '../utils/errorHandling';

interface LoginFormProps {
  onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    if (!email.trim() || !password) {
      setError('Inserisci email e password.');
      setLoading(false);
      return;
    }

    try {
      const result = await login(email.trim(), password);
      if (!result.success) setError(result.message || 'Email o password non corretti.');
    } catch (error: unknown) {
      console.error('Login form exception:', error);
      setError(getErrorMessage(error, "Errore imprevisto durante l'accesso."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-viewport relative flex items-center justify-center overflow-hidden bg-[#070707] px-4 py-6 sm:px-6 lg:px-8">
      <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" aria-hidden="true">
        <source src="/backgrounds/concessionario.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.94)_0%,rgba(3,7,18,0.80)_42%,rgba(3,7,18,0.54)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_80%_75%,rgba(245,158,11,0.10),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="hidden max-w-xl lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" /> Control Center
          </div>
          <img src="/aurum-motors-logo.svg" alt="Aurum Motors" className="h-auto w-[250px]" draggable={false} />
          <h1 className="mt-7 text-4xl font-black tracking-tight text-white xl:text-5xl">
            Tutto il tuo
            <span className="block text-amber-400">concessionario.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Gestisci vendite, dipendenti, turni e attività in un unico ambiente operativo, sincronizzato in tempo reale.</p>
          <div className="mt-8 grid max-w-md gap-3 sm:grid-cols-2">
            {['Dati sincronizzati in tempo reale', 'Gestione operativa centralizzata', 'Ruoli e permessi avanzati', 'Interfaccia ottimizzata mobile'].map((item) => (
              <div key={item} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 backdrop-blur-md">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-xs font-medium text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[470px]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-slate-950/75 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300"><CarFront className="h-6 w-6" /></div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Area riservata</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Bentornato.</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-400">Accedi al pannello gestionale di Aurum Motors.</p>
                </div>
                <div className="hidden rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-right sm:block">
                  <div className="mb-1 flex items-center justify-end gap-1.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.6)]" />Protetto</div>
                  <p className="text-[10px] text-slate-500">Sessione sicura</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <label className="block">
                  <span className={`mb-2 block text-xs font-semibold transition-colors ${focusedField === 'email' ? 'text-amber-300' : 'text-slate-300'}`}>Email</span>
                  <div className={`relative overflow-hidden rounded-2xl border bg-white/[0.045] transition ${focusedField === 'email' ? 'border-amber-400/70 ring-4 ring-amber-400/10' : 'border-white/10 hover:border-white/20'}`}>
                    <Mail className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${focusedField === 'email' ? 'text-amber-300' : 'text-slate-500'}`} />
                    <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} className="h-14 w-full bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-600" placeholder="nome@aurummotors.com" />
                  </div>
                </label>

                <label className="block">
                  <span className={`mb-2 block text-xs font-semibold transition-colors ${focusedField === 'password' ? 'text-amber-300' : 'text-slate-300'}`}>Password</span>
                  <div className={`relative overflow-hidden rounded-2xl border bg-white/[0.045] transition ${focusedField === 'password' ? 'border-amber-400/70 ring-4 ring-amber-400/10' : 'border-white/10 hover:border-white/20'}`}>
                    <LockKeyhole className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${focusedField === 'password' ? 'text-amber-300' : 'text-slate-500'}`} />
                    <input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} className="h-14 w-full bg-transparent pl-12 pr-12 text-sm text-white outline-none placeholder:text-slate-600" placeholder="Inserisci la tua password" />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-amber-300" aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3.5 text-sm text-red-200">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-400" />
                    <p className="leading-5">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="group relative mt-2 inline-flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 font-bold text-slate-950 shadow-[0_14px_35px_rgba(245,158,11,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(245,158,11,0.32)] active:translate-y-0 disabled:cursor-wait disabled:opacity-60">
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100" />
                  {loading ? (
                    <span className="relative flex items-center gap-2.5 text-sm"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900/25 border-t-slate-950" />Accesso in corso...</span>
                  ) : (
                    <span className="relative flex items-center gap-2.5 text-sm">Accedi al gestionale<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-white/8" /><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">oppure</span><span className="h-px flex-1 bg-white/8" /></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3.5"><p className="text-center text-xs text-slate-400">Non hai ancora un account?<button type="button" onClick={onToggleMode} className="ml-1 font-bold text-amber-300 transition hover:text-amber-200">Registrati</button></p></div>
              <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />Accesso protetto e sincronizzato in tempo reale</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
