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
  ShieldCheck,
  UserRoundPlus,
  Clock3,
  Sparkles,
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

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [
    focusedField,
    setFocusedField,
  ] = useState<
    'name' | 'email' | 'password' | null
  >(null);

  const { register } = useAuth();

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (loading) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (
        !cleanName ||
        !cleanEmail ||
        !password
      ) {
        throw new Error(
          'Compila tutti i campi obbligatori.',
        );
      }

      if (password.length < 6) {
        throw new Error(
          'La password deve essere di almeno 6 caratteri.',
        );
      }

      const parsedAvailability =
        parseAvailability(availability);

      const invalidDays =
        AVAILABILITY_DAYS.filter(([key]) => {
          const day =
            parsedAvailability[key];

          return (
            !day?.enabled ||
            !day.start ||
            !day.end ||
            day.start >= day.end
          );
        });

      if (invalidDays.length > 0) {
        throw new Error(
          'Imposta una disponibilità valida per tutti i 7 giorni della settimana.',
        );
      }

      const {
        data: pendingToken,
        error: availabilityError,
      } = await supabase.rpc(
        'save_registration_availability',
        {
          p_email: cleanEmail,
          p_availability:
            serializeAvailability(
              parsedAvailability,
            ),
        },
      );

      if (
        availabilityError ||
        !pendingToken
      ) {
        throw new Error(
          `Impossibile salvare la disponibilità: ${
            availabilityError?.message ||
            'errore database'
          }`,
        );
      }

      const result = await register(
        cleanEmail,
        password,
        cleanName,
      );

      if (!result.success) {
        throw new Error(
          result.message ||
            'Errore nella registrazione.',
        );
      }

      const {
        error: applyError,
      } = await supabase.rpc(
        'apply_registration_availability',
        {
          p_token: pendingToken,
        },
      );

      if (applyError) {
        console.warn(
          'Disponibilità registrazione non applicata immediatamente:',
          applyError,
        );
      }

      setSuccess(
        result.message ||
          'Registrazione completata! Ora puoi accedere.',
      );

      setEmail('');
      setPassword('');
      setName('');

      setAvailability(
        serializeAvailability(
          createDefaultAvailability(),
        ),
      );
    } catch (err: unknown) {
      console.error(
        'Registration form exception:',
        err,
      );

      setError(
        getErrorMessage(
          err,
          'Errore imprevisto durante la registrazione',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-viewport relative flex items-center justify-center overflow-y-auto bg-[#070707] px-4 py-6 sm:px-6 lg:px-8">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      >
        <source
          src="/backgrounds/concessionario.mp4"
          type="video/mp4"
        />
      </video>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.94)_0%,rgba(3,7,18,0.82)_45%,rgba(3,7,18,0.62)_100%)]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(245,158,11,0.16),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(245,158,11,0.08),transparent_26%)]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />

      <div className="relative z-10 grid w-full max-w-7xl items-start gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
        <div className="hidden pt-8 lg:sticky lg:top-8 lg:block">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            Join Aurum Motors
          </div>

          <img
            src="/aurum-motors-logo.svg"
            alt="Aurum Motors"
            className="h-auto w-[230px]"
            draggable={false}
          />

          <h1 className="mt-7 text-4xl font-black tracking-tight text-white xl:text-5xl">
            Crea il tuo
            <br />
            <span className="text-amber-400">
              profilo operativo.
            </span>
          </h1>

          <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
            Completa i tuoi dati e indica la
            tua disponibilità. I responsabili
            potranno visualizzare e
            organizzare i tuoi turni
            direttamente dal gestionale.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Profilo dipendente completo',
              'Disponibilità settimanale',
              'Gestione turni centralizzata',
              'Sincronizzazione in tempo reale',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 backdrop-blur-md"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />

                <span className="text-xs font-medium text-slate-200">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-slate-950/78 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7 lg:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

            <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                    Nuovo accesso
                  </p>

                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Crea il tuo account
                  </h2>

                  <p className="mt-1.5 text-sm text-slate-400">
                    Tutti i dati richiesti servono
                    per configurare il tuo profilo.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold text-slate-400 sm:self-auto">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Profilo dipendente
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-5"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span
                      className={`mb-2 block text-xs font-semibold ${
                        focusedField === 'name'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      Nome completo
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
                        onChange={(event) =>
                          setName(
                            event.target.value,
                          )
                        }
                        onFocus={() =>
                          setFocusedField('name')
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                        autoComplete="name"
                        className="h-14 w-full bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-600"
                        placeholder="Nome Cognome"
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
                        onChange={(event) =>
                          setEmail(
                            event.target.value,
                          )
                        }
                        onFocus={() =>
                          setFocusedField('email')
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                        autoComplete="email"
                        className="h-14 w-full bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-600"
                        placeholder="email@esempio.com"
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
                      Minimo 6 caratteri
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
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      minLength={6}
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      onFocus={() =>
                        setFocusedField(
                          'password',
                        )
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                      autoComplete="new-password"
                      className="h-14 w-full bg-transparent pl-12 pr-12 text-sm text-white outline-none placeholder:text-slate-600"
                      placeholder="Scegli una password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value,
                        )
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-white/5 hover:text-amber-300"
                      aria-label={
                        showPassword
                          ? 'Nascondi password'
                          : 'Mostra password'
                      }
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
                        Disponibilità settimanale
                      </h3>

                      <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                        Configura tutti i 7 giorni con gli orari in cui puoi essere disponibile.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <AvailabilityEditor
                      value={availability}
                      onChange={setAvailability}
                    />

                    <p className="mt-3 text-[11px] leading-5 text-slate-500">
                      Questi orari saranno visibili ai responsabili in Gestisci Dipendenti e potranno essere modificati successivamente.
                    </p>
                  </div>
                </section>

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3.5 text-sm text-red-200">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-400" />
                    <p className="leading-5">
                      {error}
                    </p>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                    <p className="leading-5">
                      {success}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3.5 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />

                  <span>
                    Registrazione protetta. Le
                    informazioni del profilo
                    saranno utilizzate
                    esclusivamente per la
                    gestione del concessionario.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative inline-flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 font-bold text-slate-950 shadow-[0_14px_35px_rgba(245,158,11,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(245,158,11,0.32)] active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100" />

                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900/25 border-t-slate-950" />
                      Registrazione in corso...
                    </>
                  ) : (
                    <>
                      <span>
                        Completa registrazione
                      </span>

                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.025] p-3.5 text-center text-xs text-slate-400">
                Hai già un account?

                <button
                  type="button"
                  onClick={onToggleMode}
                  className="ml-1 font-bold text-amber-300 hover:text-amber-200"
                >
                  Accedi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
