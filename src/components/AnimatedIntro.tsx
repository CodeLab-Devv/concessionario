import React, { useEffect, useState } from 'react';
import { ArrowRight, Gauge, ShieldCheck } from 'lucide-react';

interface AnimatedIntroProps {
  onComplete: () => void;
}

const INTRO_DURATION = 2400;
const EXIT_DURATION = 500;

const SPEED_LINES = Array.from(
  { length: 14 },
  (_, index) => ({
    id: index,
    top: `${8 + index * 6.5}%`,
    width: `${70 + ((index * 37) % 110)}px`,
    delay: `${(index * 90) % 700}ms`,
    duration: `${850 + ((index * 73) % 500)}ms`,
    opacity: 0.12 + ((index * 17) % 30) / 100,
  }),
);

const PARTICLES = Array.from(
  { length: 28 },
  (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    top: `${(index * 61) % 100}%`,
    size: 1 + ((index * 13) % 3),
    delay: `${(index * 120) % 1400}ms`,
    duration: `${1400 + ((index * 97) % 1300)}ms`,
  }),
);

export const AnimatedIntro: React.FC<AnimatedIntroProps> = ({
  onComplete,
}) => {
  const [phase, setPhase] = useState<
    'enter' | 'drive' | 'exit'
  >('enter');

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressStart = window.setTimeout(() => {
      setProgress(18);
    }, 120);

    const progressMid = window.setTimeout(() => {
      setProgress(64);
      setPhase('drive');
    }, 650);

    const progressEnd = window.setTimeout(() => {
      setProgress(100);
    }, 1450);

    const exitTimer = window.setTimeout(() => {
      setPhase('exit');
    }, INTRO_DURATION);

    const completeTimer = window.setTimeout(() => {
      onComplete();
    }, INTRO_DURATION + EXIT_DURATION);

    return () => {
      window.clearTimeout(progressStart);
      window.clearTimeout(progressMid);
      window.clearTimeout(progressEnd);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={[
        'fixed inset-0 z-[9999] overflow-hidden',
        'bg-[#070707]',
        'transition-opacity duration-500 ease-out',
        phase === 'exit'
          ? 'pointer-events-none opacity-0'
          : 'opacity-100',
      ].join(' ')}
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.12),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.07),transparent_45%)]" />

      {/* Ambient glow */}
      <div
        className={[
          'absolute left-1/2 top-1/2 h-[28rem] w-[28rem]',
          '-translate-x-1/2 -translate-y-1/2',
          'rounded-full bg-amber-400/10 blur-[110px]',
          'transition-all duration-[1800ms] ease-out',
          phase === 'drive'
            ? 'scale-125 opacity-100'
            : 'scale-90 opacity-70',
        ].join(' ')}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(255,255,255,0.35) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.35) 1px,
              transparent 1px
            )
          `,
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(circle at center, black 20%, transparent 85%)',
          WebkitMaskImage:
            'radial-gradient(circle at center, black 20%, transparent 85%)',
        }}
      />

      {/* Particles */}
      <div className="absolute inset-0">
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="absolute rounded-full bg-amber-300/60 animate-[pulse_2s_ease-in-out_infinite]"
            style={{
              left: particle.left,
              top: particle.top,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      {/* Speed lines */}
      <div
        className={[
          'absolute inset-0',
          'transition-opacity duration-700',
          phase === 'drive'
            ? 'opacity-100'
            : 'opacity-40',
        ].join(' ')}
      >
        {SPEED_LINES.map((line) => (
          <span
            key={line.id}
            className="absolute right-[-180px] h-px rounded-full bg-gradient-to-l from-transparent via-amber-300 to-transparent animate-[intro-speed_1.3s_linear_infinite]"
            style={{
              top: line.top,
              width: line.width,
              animationDelay: line.delay,
              animationDuration: line.duration,
              opacity: line.opacity,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-20 flex min-h-full items-center justify-center px-5">
        <div className="w-full max-w-5xl">
          {/* Brand */}
          <div
            className={[
              'mx-auto text-center',
              'transition-all duration-[900ms] ease-out',
              phase === 'enter'
                ? 'translate-y-4 opacity-0'
                : phase === 'drive'
                  ? 'translate-y-0 opacity-100'
                  : '-translate-y-4 opacity-0',
            ].join(' ')}
          >
            <div className="mx-auto mb-7 flex justify-center">
              <div className="relative">
                {/* halo */}
                <div className="absolute inset-0 scale-125 rounded-3xl bg-amber-400/10 blur-2xl" />

                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] px-7 py-5 shadow-2xl backdrop-blur-xl">
                  <img
                    src="/aurum-motors-logo.svg"
                    alt="Aurum Motors"
                    className="h-auto w-[210px] sm:w-[250px]"
                    draggable={false}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/70 sm:w-16" />

              <p className="text-[10px] font-extrabold uppercase tracking-[0.42em] text-amber-300/90 sm:text-xs">
                Gestionale Concessionario
              </p>

              <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/70 sm:w-16" />
            </div>

            <p className="mx-auto mt-4 max-w-lg text-xs leading-6 text-slate-400 sm:text-sm">
              Accesso all&apos;ambiente operativo
              <span className="mx-1.5 text-amber-400">•</span>
              sincronizzazione in tempo reale
            </p>
          </div>

          {/* Car scene */}
          <div className="relative mx-auto mt-12 h-[180px] w-full max-w-4xl sm:mt-14 sm:h-[220px]">
            {/* Horizon glow */}
            <div
              className={[
                'absolute bottom-12 left-1/2 h-20 w-[75%]',
                '-translate-x-1/2 rounded-full',
                'bg-amber-400/10 blur-3xl',
                'transition-all duration-[1200ms]',
                phase === 'drive'
                  ? 'scale-110 opacity-100'
                  : 'scale-90 opacity-70',
              ].join(' ')}
            />

            {/* Road */}
            <div className="absolute bottom-8 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />

            <div className="absolute bottom-4 left-1/2 h-px w-[82%] -translate-x-1/2 bg-white/10" />

            {/* Road reflections */}
            <div className="absolute bottom-0 left-1/2 flex w-[90%] -translate-x-1/2 justify-between opacity-40">
              <span className="h-1 w-20 rounded-full bg-amber-300/20 blur-sm" />
              <span className="h-1 w-32 rounded-full bg-amber-300/20 blur-sm" />
              <span className="h-1 w-24 rounded-full bg-amber-300/20 blur-sm" />
            </div>

            {/* Car wrapper */}
            <div
              className={[
                'absolute bottom-8 left-1/2',
                '-translate-x-1/2',
                'transition-all ease-[cubic-bezier(0.16,1,0.3,1)]',
                'duration-[1700ms]',
                phase === 'enter'
                  ? 'translate-y-8 scale-[0.82] opacity-0'
                  : phase === 'drive'
                    ? 'translate-y-0 scale-100 opacity-100'
                    : 'translate-x-[110vw] scale-[1.12] opacity-0',
              ].join(' ')}
            >
              <div className="relative">
                {/* light aura */}
                <div className="absolute -inset-10 rounded-full bg-amber-400/10 blur-3xl" />

                {/* speed trails */}
                <div className="absolute -left-36 top-1/2 hidden -translate-y-1/2 flex-col gap-2 opacity-60 sm:flex">
                  <span className="h-px w-28 rounded-full bg-gradient-to-r from-transparent to-amber-200" />
                  <span className="h-px w-20 rounded-full bg-gradient-to-r from-transparent to-amber-200/70" />
                  <span className="h-px w-12 rounded-full bg-gradient-to-r from-transparent to-amber-200/50" />
                </div>

                {/* Car */}
                <svg
                  viewBox="0 0 520 220"
                  className="relative h-auto w-[290px] text-amber-400 drop-shadow-[0_0_35px_rgba(245,158,11,0.24)] sm:w-[410px]"
                  fill="none"
                  aria-hidden="true"
                >
                  {/* ground shadow */}
                  <ellipse
                    cx="260"
                    cy="194"
                    rx="190"
                    ry="13"
                    fill="rgba(0,0,0,0.6)"
                  />

                  {/* rear body */}
                  <path
                    d="M92 153
                       L118 116
                       C130 98 148 87 170 81
                       L241 62
                       C264 56 292 58 314 72
                       L377 112
                       C392 122 411 132 426 137
                       C441 142 451 153 454 163
                       L458 176
                       L430 176
                       C424 154 408 142 387 142
                       C363 142 345 156 339 176
                       L181 176
                       C175 156 157 142 134 142
                       C112 142 95 155 90 176
                       L72 176
                       L72 159
                       C72 156 79 154 92 153Z"
                    fill="url(#carBody)"
                  />

                  {/* roof */}
                  <path
                    d="M160 92
                       L228 72
                       C252 65 279 67 302 80
                       L351 109
                       L169 109
                       Z"
                    fill="url(#carGlass)"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="2"
                  />

                  {/* front windshield */}
                  <path
                    d="M307 81
                       C323 87 339 97 351 109
                       L320 109
                       L287 75
                       C294 76 301 78 307 81Z"
                    fill="rgba(255,255,255,0.13)"
                  />

                  {/* side window */}
                  <path
                    d="M176 91
                       L229 77
                       C247 73 269 73 283 79
                       L312 108
                       L174 108
                       Z"
                    fill="rgba(255,255,255,0.08)"
                  />

                  {/* body highlight */}
                  <path
                    d="M111 125
                       C173 116 285 117 392 126"
                    stroke="rgba(255,255,255,0.38)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* lower line */}
                  <path
                    d="M96 151
                       C183 145 314 145 422 153"
                    stroke="rgba(255,193,7,0.65)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* front light */}
                  <path
                    d="M423 134
                       C441 138 450 146 456 157
                       L431 153
                       C428 146 425 141 423 134Z"
                    fill="#fff7cf"
                  />

                  {/* back light */}
                  <path
                    d="M85 145
                       L102 140
                       L99 153
                       L81 158
                       Z"
                    fill="#ff5757"
                  />

                  {/* wheels */}
                  <g>
                    <circle
                      cx="136"
                      cy="174"
                      r="34"
                      fill="#101010"
                      stroke="#2c2c2c"
                      strokeWidth="5"
                    />
                    <circle
                      cx="136"
                      cy="174"
                      r="17"
                      fill="#262626"
                    />
                    <circle
                      cx="136"
                      cy="174"
                      r="7"
                      fill="#d3d3d3"
                    />
                  </g>

                  <g>
                    <circle
                      cx="386"
                      cy="174"
                      r="34"
                      fill="#101010"
                      stroke="#2c2c2c"
                      strokeWidth="5"
                    />
                    <circle
                      cx="386"
                      cy="174"
                      r="17"
                      fill="#262626"
                    />
                    <circle
                      cx="386"
                      cy="174"
                      r="7"
                      fill="#d3d3d3"
                    />
                  </g>

                  {/* rim details */}
                  <circle
                    cx="136"
                    cy="174"
                    r="23"
                    stroke="rgba(245,158,11,0.45)"
                    strokeWidth="2"
                  />

                  <circle
                    cx="386"
                    cy="174"
                    r="23"
                    stroke="rgba(245,158,11,0.45)"
                    strokeWidth="2"
                  />

                  <defs>
                    <linearGradient
                      id="carBody"
                      x1="90"
                      y1="55"
                      x2="430"
                      y2="185"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop
                        stopColor="#ffe58a"
                      />
                      <stop
                        offset="0.32"
                        stopColor="#fbbf24"
                      />
                      <stop
                        offset="0.68"
                        stopColor="#f59e0b"
                      />
                      <stop
                        offset="1"
                        stopColor="#b45309"
                      />
                    </linearGradient>

                    <linearGradient
                      id="carGlass"
                      x1="150"
                      y1="70"
                      x2="310"
                      y2="112"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop
                        stopColor="#dbeafe"
                        stopOpacity="0.42"
                      />
                      <stop
                        offset="1"
                        stopColor="#0f172a"
                        stopOpacity="0.85"
                      />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom status */}
          <div
            className={[
              'mx-auto mt-4 max-w-xl',
              'transition-all duration-700',
              phase === 'enter'
                ? 'translate-y-2 opacity-0'
                : phase === 'drive'
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-2 opacity-0',
            ].join(' ')}
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl backdrop-blur-xl sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold text-white sm:text-xs">
                      Inizializzazione gestionale
                    </p>

                    <span className="text-[10px] font-bold tabular-nums text-amber-300">
                      {progress}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.45)] transition-[width] duration-700 ease-out"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="hidden items-center gap-2 text-[10px] text-slate-500 sm:flex">
                  <Gauge className="h-3.5 w-3.5" />
                  <span>LIVE</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
              <span>Aurum Motors</span>
              <ArrowRight className="h-3 w-3 text-amber-400/70" />
              <span>Control Center</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom vignette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black via-black/30 to-transparent" />

      {/* Top vignette */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />

      <style>{`
        @keyframes intro-speed {
          0% {
            transform: translateX(0);
            opacity: 0;
          }

          15% {
            opacity: 0.8;
          }

          100% {
            transform: translateX(-135vw);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
