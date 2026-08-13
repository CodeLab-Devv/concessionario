import React, { useEffect, useState } from 'react';
import { ArrowRight, Gauge, ShieldCheck } from 'lucide-react';

interface AnimatedIntroProps {
  onComplete: () => void;
}

const INTRO_DURATION = 2400;
const EXIT_DURATION = 500;
const CAR_IMAGE =
  'https://unsplash.com/photos/a-black-car-is-shown-in-a-dark-room-IpaxNBWlhjw/download?force=true&auto=format&fit=crop&w=1400&q=90';

const SPEED_LINES = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  top: `${8 + index * 6.5}%`,
  width: `${70 + ((index * 37) % 110)}px`,
  delay: `${(index * 90) % 700}ms`,
  duration: `${850 + ((index * 73) % 500)}ms`,
  opacity: 0.12 + ((index * 17) % 30) / 100,
}));

const PARTICLES = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 100}%`,
  size: 1 + ((index * 13) % 3),
  delay: `${(index * 120) % 1400}ms`,
  duration: `${1400 + ((index * 97) % 1300)}ms`,
}));

export const AnimatedIntro: React.FC<AnimatedIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'enter' | 'drive' | 'exit'>('enter');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressStart = window.setTimeout(() => setProgress(18), 120);
    const progressMid = window.setTimeout(() => {
      setProgress(64);
      setPhase('drive');
    }, 650);
    const progressEnd = window.setTimeout(() => setProgress(100), 1450);
    const exitTimer = window.setTimeout(() => setPhase('exit'), INTRO_DURATION);
    const completeTimer = window.setTimeout(
      () => onComplete(),
      INTRO_DURATION + EXIT_DURATION,
    );

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
        'fixed inset-0 z-[9999] overflow-hidden bg-[#070707]',
        'transition-opacity duration-500 ease-out',
        phase === 'exit'
          ? 'pointer-events-none opacity-0'
          : 'opacity-100',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.12),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.07),transparent_45%)]" />

      <div
        className={[
          'absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/10 blur-[110px] transition-all duration-[1800ms] ease-out',
          phase === 'drive'
            ? 'scale-125 opacity-100'
            : 'scale-90 opacity-70',
        ].join(' ')}
      />

      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.35) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(circle at center, black 20%, transparent 85%)',
          WebkitMaskImage:
            'radial-gradient(circle at center, black 20%, transparent 85%)',
        }}
      />

      <div className="absolute inset-0">
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="absolute animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-amber-300/60"
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

      <div
        className={[
          'absolute inset-0 transition-opacity duration-700',
          phase === 'drive' ? 'opacity-100' : 'opacity-40',
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

      <div className="relative z-20 flex min-h-full items-center justify-center px-5">
        <div className="w-full max-w-5xl">
          <div
            className={[
              'mx-auto text-center transition-all duration-[900ms] ease-out',
              phase === 'enter'
                ? 'translate-y-4 opacity-0'
                : phase === 'drive'
                  ? 'translate-y-0 opacity-100'
                  : '-translate-y-4 opacity-0',
            ].join(' ')}
          >
            <div className="mx-auto mb-7 flex justify-center">
              <div className="relative">
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
                Aurum Motors
              </p>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/70 sm:w-16" />
            </div>

            <p className="mx-auto mt-4 max-w-lg text-xs leading-6 text-slate-400 sm:text-sm">
              Il tuo percorso inizia qui
            </p>
          </div>

          <div className="relative mx-auto mt-10 h-[230px] w-full max-w-5xl sm:mt-12 sm:h-[300px]">
            <div
              className={[
                'absolute bottom-12 left-1/2 h-24 w-[72%] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl transition-all duration-[1200ms]',
                phase === 'drive'
                  ? 'scale-110 opacity-100'
                  : 'scale-90 opacity-70',
              ].join(' ')}
            />

            <div className="absolute bottom-9 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
            <div className="absolute bottom-5 left-1/2 h-px w-[82%] -translate-x-1/2 bg-white/10" />

            <div className="absolute bottom-0 left-1/2 flex w-[90%] -translate-x-1/2 justify-between opacity-40">
              <span className="h-1 w-20 rounded-full bg-amber-300/20 blur-sm" />
              <span className="h-1 w-32 rounded-full bg-amber-300/20 blur-sm" />
              <span className="h-1 w-24 rounded-full bg-amber-300/20 blur-sm" />
            </div>

            <div
              className={[
                'absolute bottom-8 left-1/2 -translate-x-1/2 transition-all ease-[cubic-bezier(0.16,1,0.3,1)] duration-[1700ms]',
                phase === 'enter'
                  ? 'translate-y-8 scale-[0.82] opacity-0'
                  : phase === 'drive'
                    ? 'translate-y-0 scale-100 opacity-100'
                    : 'translate-x-[110vw] scale-[1.12] opacity-0',
              ].join(' ')}
            >
              <div className="relative">
                <div className="absolute -inset-12 rounded-[40%] bg-amber-400/10 blur-3xl" />

                <div className="absolute -left-36 top-1/2 hidden -translate-y-1/2 flex-col gap-2 opacity-60 sm:flex">
                  <span className="h-px w-28 rounded-full bg-gradient-to-r from-transparent to-amber-200" />
                  <span className="h-px w-20 rounded-full bg-gradient-to-r from-transparent to-amber-200/70" />
                  <span className="h-px w-12 rounded-full bg-gradient-to-r from-transparent to-amber-200/50" />
                </div>

                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                  <img
                    src={CAR_IMAGE}
                    alt="Auto di lusso Aurum Motors"
                    className="block h-[210px] w-[340px] object-cover object-center sm:h-[270px] sm:w-[500px]"
                    loading="eager"
                    draggable={false}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(7,7,7,0.45))]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#070707] to-transparent" />
                </div>
              </div>
            </div>
          </div>

          <div
            className={[
              'mx-auto mt-3 max-w-xl transition-all duration-700',
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
                      Apertura in corso
                    </p>
                    <span className="text-[10px] font-bold tabular-nums text-amber-300">
                      {progress}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.45)] transition-[width] duration-700 ease-out"
                      style={{ width: `${progress}%` }}
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
              <span>Concessionaria</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />

      <style>{`
        @keyframes intro-speed {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 0.8; }
          100% { transform: translateX(-135vw); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
