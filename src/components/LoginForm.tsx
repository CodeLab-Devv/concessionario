import React, { useState } from 'react';
import {
  ArrowRight,
  CarFront,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errorHandling';

interface LoginFormProps {
  onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onToggleMode,
}) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [focusedField, setFocusedField] =
    useState<'email' | 'password' | null>(null);

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError(
        'Inserisci email e password per continuare.',
      );
      return;
    }

    setLoading(true);

    try {
      const result = await login(
        cleanEmail,
        password,
      );

      if (!result.success) {
        setError(
          result.message ||
            'Email o password non corretti.',
        );
      }
    } catch (error: unknown) {
      console.error(
        'Login form exception:',
        error,
      );

      setError(
        getErrorMessage(
          error,
          'Si è verificato un errore durante l’accesso.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-viewport relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-4 py-6 sm:px-6 lg:px-8">
      {/* Video background */}
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

      {/* Background overlays */}
      <div className="absolute inset-0 bg-black/70" />

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.92)_0%,rgba(3,7,18,0.72)_45%,rgba(3,7,18,0.55)_100%)]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_35%,rgba(245,158,11,0.14),transparent_30%),radial-gradient(circle_at_85%_75%,rgba(245,158,11,0.08),transparent_28%)]" />

      {/* Main layout */}
      <div className="relative z-10 grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_440px] lg:gap-20">
        {/* Brand side */}
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <img
              src="/aurum-motors-logo.svg"
              alt="Aurum Motors"
              className="h-auto w-[240px]"
              draggable={false}
            />

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
              Aurum Motors
            </p>

            <h1 className="mt-3 text-5xl font-black leading-[1.05] tracking-tight text-white xl:text-6xl">
              Il tuo prossimo
              <span className="block text-amber-400">
                viaggio inizia qui.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
              Accedi al tuo account per
              continuare a gestire il tuo
              profilo.
            </p>

            <div className="mt-8 flex items-center gap-3 text-sm text-slate-400">
              <span className="h-px w-12 bg-amber-400/60" />
              <span>
                Benvenuto in Aurum Motors
              </span>
            </div>
          </div>
        </section>

        {/* Login card */}
        <section className="w-full">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-7">
            {/* Top accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            {/* Ambient glow */}
            <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative">
              {/* Mobile brand */}
              <div className="mb-7 text-center lg:hidden">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  <CarFront className="h-8 w-8" />
                </div>

                <img
                  src="/aurum-motors-logo.svg"
                  alt="Aurum Motors"
                  className="mx-auto h-auto w-[190px]"
                  draggable={false}
                />
              </div>

              {/* Heading */}
              <div className="mb-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
                  Area personale
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Bentornato
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Accedi al tuo account per
                  continuare.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Email */}
                <label className="block">
                  <span
                    className={`mb-2 block text-xs font-semibold transition-colors ${
                      focusedField === 'email'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    Email
                  </span>

                  <div
                    className={[
                      'relative overflow-hidden rounded-2xl border',
                      'bg-white/[0.045] transition-all duration-200',
                      focusedField === 'email'
                        ? 'border-amber-400/70 ring-4 ring-amber-400/10'
                        : 'border-white/10 hover:border-white/20',
                    ].join(' ')}
                  >
                    <Mail
                      className={[
                        'absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors',
                        focusedField === 'email'
                          ? 'text-amber-300'
                          : 'text-slate-500',
                      ].join(' ')}
                    />

                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      spellCheck={false}
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
                      className="h-14 w-full bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-600"
                      placeholder="Inserisci la tua email"
                    />
                  </div>
                </label>

                {/* Password */}
                <label className="block">
                  <span
                    className={`mb-2 block text-xs font-semibold transition-colors ${
                      focusedField ===
                      'password'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    Password
                  </span>

                  <div
                    className={[
                      'relative overflow-hidden rounded-2xl border',
                      'bg-white/[0.045] transition-all duration-200',
                      focusedField ===
                      'password'
                        ? 'border-amber-400/70 ring-4 ring-amber-400/10'
                        : 'border-white/10 hover:border-white/20',
                    ].join(' ')}
                  >
                    <LockKeyhole
                      className={[
                        'absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors',
                        focusedField ===
                        'password'
                          ? 'text-amber-300'
                          : 'text-slate-500',
                      ].join(' ')}
                    />

                    <input
                      id="login-password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      required
                      autoComplete="current-password"
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
                      className="h-14 w-full bg-transparent pl-12 pr-12 text-sm text-white outline-none placeholder:text-slate-600"
                      placeholder="Inserisci la tua password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value,
                        )
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-amber-300"
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

                {/* Error */}
                {error && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3.5">
                    <p className="text-sm leading-5 text-red-200">
                      {error}
                    </p>
                  </div>
                )}

                {/* Login */}
                <button
                  type="submit"
                  disabled={loading}
                  className={[
                    'group relative mt-2 inline-flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl',
                    'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600',
                    'font-bold text-slate-950',
                    'shadow-[0_14px_35px_rgba(245,158,11,0.22)]',
                    'transition-all duration-200',
                    'hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(245,158,11,0.32)]',
                    'active:translate-y-0',
                    'disabled:cursor-wait disabled:opacity-60',
                  ].join(' ')}
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />

                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900/20 border-t-slate-950" />

                      <span className="text-sm">
                        Accesso in corso...
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">
                        Accedi
                      </span>

                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Register */}
              <div className="mt-6 border-t border-white/8 pt-6 text-center">
                <p className="text-xs text-slate-500">
                  Non hai ancora un account?
                </p>

                <button
                  type="button"
                  onClick={onToggleMode}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-300 transition-colors hover:text-amber-200"
                >
                  Crea un account
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
