import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  AvailabilityEditor,
  createDefaultAvailability,
  parseAvailability,
  serializeAvailability,
  AVAILABILITY_DAYS,
} from './AvailabilityEditor';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRoundPlus,
  Clock3,
} from 'lucide-react';
import { getErrorMessage } from '../utils/errorHandling';

interface RegisterFormProps {
  onToggleMode: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onToggleMode,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [availability, setAvailability] = useState(() =>
    serializeAvailability(createDefaultAvailability()),
  );

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<
    'name' | 'email' | 'password' | null
  >(null);

  const { register } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (loading) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanName || !cleanEmail || !password) {
        throw new Error('Compila tutti i campi richiesti.');
      }

      if (password.length < 6) {
        throw new Error('La password deve avere almeno 6 caratteri.');
      }

      const parsedAvailability = parseAvailability(availability);
      const invalidDays = AVAILABILITY_DAYS.filter(([key]) => {
        const day = parsedAvailability[key];

        return (
          !day?.enabled ||
          !day.start ||
          !day.end ||
          day.start >= day.end
        );
      });

      if (invalidDays.length > 0) {
        throw new Error(
          'Indica un orario valido per tutti i giorni della settimana.',
        );
      }

      const {
        data: pendingToken,
        error: availabilityError,
      } = await supabase.rpc('save_registration_availability', {
        p_email: cleanEmail,
        p_availability: serializeAvailability(parsedAvailability),
      });

      if (availabilityError || !pendingToken) {
        throw new Error(
          'Non è stato possibile salvare i tuoi orari. Riprova.',
        );
      }

      const result = await register(
        cleanEmail,
        password,
        cleanName,
      );

      if (!result.success) {
        throw new Error(
          result.message || 'Non è stato possibile creare l’account.',
        );
      }

      const { error: applyError } = await supabase.rpc(
        'apply_registration_availability',
        {
          p_token: pendingToken,
        },
      );

      if (applyError) {
        console.warn(
          'Unable to apply registration availability:',
          applyError,
        );
      }

      setSuccess(
        result.message || 'Account creato. Ora puoi accedere.',
      );

      setEmail('');
      setPassword('');
      setName('');
      setAvailability(
        serializeAvailability(createDefaultAvailability()),
      );
    } catch (err: unknown) {
      console.error('Registration error:', err);

      setError(
        getErrorMessage(
          err,
          'Non è stato possibile completare la registrazione.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-viewport relative flex min-h-screen items-center justify-center overflow-y-auto bg-[#070707] px-4 py-6 sm:px-6 lg:px-8">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      >
        <source
          src="/backgrounds/concessionario.mp4"
          type="video/mp4"
        />
      </video>

      <div className="absolute inset-0 bg-black/72" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.94)_0%,rgba(3,7,18,0.78)_48%,rgba(3,7,18,0.58)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(245,158,11,0.14),transparent_30%),radial-gradient(circle_at_82%_78%,rgba(245,158,11,0.08),transparent_28%)]" />

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <img
              src="/aurum-motors-logo.svg"
              alt="Aurum Motors"
              className="h-auto w-[235px]"
              draggable={false}
            />

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.24em] text-amber-400">
              Aurum Motors
            </p>

            <h1 className="mt-3 text-5xl font-black leading-[1.04] tracking-tight text-white xl:text-6xl">
              Inizia il tuo
              <span className="block text-amber-400">
                nuovo percorso.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
              Crea il tuo account e indicaci i giorni e gli orari in cui sei disponibile.
            </p>

            <div className="mt-8 flex items-center gap-3 text-sm text-slate-400">
              <span className="h-px w-12 bg-amber-400/60" />
              <span>Benvenuto in Aurum Motors</span>
            </div>
          </div>
        </section>

        <section className="w-full">
          <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-7 lg:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative">
              <div className="mb-7 text-center lg:hidden">
                <img
                  src="/aurum-motors-logo.svg"
                  alt="Aurum Motors"
                  className="mx-auto h-auto w-[190px]"
                  draggable={false}
                />
              </div>

              <div className="mb-7 border-b border-white/8 pb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
                  Nuovo account
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Crea il tuo account
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Inserisci i tuoi dati e scegli i tuoi orari disponibili.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span
                      className={`mb-2 block text-xs font-semibold ${
                        focusedField === 'name'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      Nome e cognome
                    </span>

                    <div
                      className={`relative overflow-hidden rounded-2xl border bg-white/[0.045] transition ${
                        focusedField === 'name'
                          ? 'border-amber-400/70 ring-4 ring-amber-400/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <UserRoundPlus
                        className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                          focusedField === 'name'
                            ? 'text-amber-300'
                            : 'text-slate-500'
                        }`}
                      />

                      <input
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        autoComplete="name"
                        className="h-14 w-full bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-600"
                        placeholder="Mario Rossi"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span
                      className={`mb-2 block text-xs font-semibold ${
                        focusedField === 'email'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      Email
                    </span>

                    <div
                      className={`relative overflow-hidden rounded-2xl border bg-white/[0.045] transition ${
                        focusedField === 'email'
                          ? 'border-amber-400/70 ring-4 ring-amber-400/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Mail
                        className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                          focusedField === 'email'
                            ? 'text-amber-300'
                            : 'text-slate-500'
                        }`}
                      />

                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        autoComplete="email"
                        inputMode="email"
                        spellCheck={false}
                        className="h-14 w-full bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-600"
                        placeholder="nome@email.com"
                      />
                    </div>
                  </label>
                </div>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        focusedField === 'password'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      Password
                    </span>

                    <span className="text-[10px] text-slate-500">
                      Almeno 6 caratteri
                    </span>
                  </div>

                  <div
                    className={`relative overflow-hidden rounded-2xl border bg-white/[0.045] transition ${
                      focusedField === 'password'
                        ? 'border-amber-400/70 ring-4 ring-amber-400/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <LockKeyhole
                      className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                        focusedField === 'password'
                          ? 'text-amber-300'
                          : 'text-slate-500'
                      }`}
                    />

                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="new-password"
                      className="h-14 w-full bg-transparent pl-12 pr-12 text-sm text-white outline-none placeholder:text-slate-600"
                      placeholder="Scegli una password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-amber-300"
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </label>

                <section className="overflow-hidden rounded-2xl border border-amber-400/15 bg-amber-400/[0.035]">
                  <div className="flex items-start gap-3 border-b border-white/8 px-4 py-4 sm:px-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                      <Clock3 className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">
                        I tuoi orari
                      </h3>

                      <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                        Indica i giorni e gli orari in cui sei disponibile.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <AvailabilityEditor
                      value={availability}
                      onChange={setAvailability}
                    />

                    <p className="mt-3 text-[11px] leading-5 text-slate-500">
                      Scegli gli orari con cui ti senti più a tuo agio.
                    </p>
                  </div>
                </section>

                {error && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3.5">
                    <p className="text-sm leading-5 text-red-200">
                      {error}
                    </p>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="leading-5">{success}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative inline-flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 font-bold text-slate-950 shadow-[0_14px_35px_rgba(245,158,11,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(245,158,11,0.32)] active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100" />

                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900/25 border-t-slate-950" />
                      Creazione account...
                    </>
                  ) : (
                    <>
                      <span>Crea il mio account</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-white/8 pt-6 text-center">
                <p className="text-xs text-slate-500">
                  Hai già un account?
                </p>

                <button
                  type="button"
                  onClick={onToggleMode}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-300 transition-colors hover:text-amber-200"
                >
                  Accedi
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
