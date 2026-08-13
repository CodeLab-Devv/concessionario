import React, { useEffect, useState } from 'react';
import { ArrowRight, Gauge, ShieldCheck } from 'lucide-react';

interface AnimatedIntroProps {
  onComplete: () => void;
}

const INTRO_DURATION = 2400;
const EXIT_DURATION = 500;
const CAR_IMAGE = '/images/animated-intro-car.png';

const SPEED_LINES = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  top: `${10 + index * 4.8}%`,
  width: `${80 + ((index * 37) % 150)}px`,
  delay: `${(index * 75) % 650}ms`,
  duration: `${650 + ((index * 73) % 450)}ms`,
  opacity: 0.12 + ((index * 17) % 32) / 100,
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
    const completeTimer = window.setTimeout(onComplete, INTRO_DURATION + EXIT_DURATION);

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
        phase === 'exit' ? 'pointer-events-none opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.13),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.08),transparent_48%)]" />

      <div
        className={[
          'absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2',
          'rounded-full bg-amber-400/10 blur-[120px] transition-all duration-[1800ms] ease-out',
          phase === 'drive' ? 'scale-125 opacity-100' : 'scale-90 opacity-70',
        ].join(' ')}
      />

      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(circle at center, black 20%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 20%, transparent 85%)',
        }}
      />

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

      <div className={['absolute inset-0 transition-opacity duration-700', phase === 'drive' ? 'opacity-100' : 'opacity-35'].join(' ')}>
        {SPEED_LINES.map((line) => (
          <span
            key={line.id}
            className="absolute right-[-220px] h-px rounded-full bg-gradient-to-l from-transparent via-amber-300 to-transparent animate-[intro-speed_1.1s_linear_infinite]"
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
        <div className="w-full max-w-6xl">
          <div
            className={[
              'mx-auto text-center transition-all duration-[900ms] ease-out',
              phase === 'enter' ? 'translate-y-4 opacity-0' : phase === 'drive' ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
            ].join(' ')}
          >
            <div className="mx-auto mb-7 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 scale-125 rounded-3xl bg-amber-400/10 blur-2xl" />
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] px-7 py-5 shadow-2xl backdrop-blur-xl">
                  <img src="/aurum-motors-logo.svg" alt="Aurum Motors" className="h-auto w-[210px] sm:w-[250px]" draggable={false} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/70 sm:w-16" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.42em] text-amber-300/90 sm:text-xs">Aurum Motors</p>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/70 sm:w-16" />
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-4xl">
              Il tuo prossimo
              <span className="block text-amber-400">viaggio inizia qui.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-slate-400 sm:text-sm">Benvenuto in Aurum Motors</p>
          </div>

          <div className="relative mx-auto mt-10 h-[230px] w-full max-w-6xl sm:mt-12 sm:h-[330px]">
            <div
              className={[
                'absolute bottom-10 left-1/2 h-24 w-[82%] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl transition-all duration-[1200ms]',
                phase === 'drive' ? 'scale-110 opacity-100' : 'scale-90 opacity-70',
              ].join(' ')}
            />

            <div className="absolute bottom-10 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
            <div className="absolute bottom-5 left-1/2 h-px w-[82%] -translate-x-1/2 bg-white/10" />

            <div className="absolute bottom-1 left-1/2 flex w-[88%] -translate-x-1/2 justify-between opacity-50">
              <span className="h-1 w-20 rounded-full bg-amber-300/20 blur-sm" />
              <span className="h-1 w-32 rounded-full bg-amber-300/20 blur-sm" />
              <span className="h-1 w-24 rounded-full bg-amber-300/20 blur-sm" />
            </div>

            <div
              className={[
                'absolute bottom-6 left-1/2 w-[min(92vw,980px)] -translate-x-1/2',
                phase === 'enter' ? 'opacity-0' : 'opacity-100',
                phase === 'drive' ? 'animate-[car-drive_1.55s_cubic-bezier(0.16,1,0.3,1)_both]' : '',
                phase === 'exit' ? 'animate-[car-exit_0.5s_cubic-bezier(0.7,0,0.84,0)_both]' : '',
              ].join(' ')}
            >
              <div className="relative mx-auto w-fit max-w-full">
                <div className="pointer-events-none absolute -inset-x-24 top-1/2 h-28 -translate-y-1/2 rounded-full bg-amber-400/10 blur-3xl" />

                <div className="pointer-events-none absolute -left-40 top-1/2 hidden -translate-y-1/2 sm:block">
                  <div className="flex flex-col items-end gap-2 opacity-90">
                    <span className="h-[2px] w-44 rounded-full bg-gradient-to-r from-transparent via-amber-200/30 to-amber-200" />
                    <span className="h-[2px] w-32 rounded-full bg-gradient-to-r from-transparent via-amber-200/20 to-amber-200/80" />
                    <span className="h-[2px] w-20 rounded-full bg-gradient-to-r from-transparent via-amber-200/10 to-amber-200/60" />
                  </div>
                </div>

                <img
                  src={CAR_IMAGE}
                  alt="Aurum Motors"
                  draggable={false}
                  className="relative block h-auto w-[min(94vw,1000px)] select-none object-contain drop-shadow-[0_25px_55px_rgba(245,158,11,0.18)]"
                />

                <div className="pointer-events-none absolute inset-x-[12%] bottom-[7%] h-2 rounded-full bg-amber-300/60 blur-md" />
                <div className="pointer-events-none absolute inset-x-[8%] bottom-[4%] h-px bg-gradient-to-r from-transparent via-amber-300/90 to-transparent shadow-[0_0_18px_rgba(245,158,11,0.8)]" />
              </div>
            </div>
          </div>

          <div
            className={[
              'mx-auto mt-4 max-w-xl transition-all duration-700',
              phase === 'enter' ? 'translate-y-2 opacity-0' : phase === 'drive' ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
            ].join(' ')}
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl backdrop-blur-xl sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><ShieldCheck className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold text-white sm:text-xs">Preparazione</p>
                    <span className="text-[10px] font-bold tabular-nums text-amber-300">{progress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.45)] transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="hidden items-center gap-2 text-[10px] text-slate-500 sm:flex"><Gauge className="h-3.5 w-3.5" /><span>START</span></div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
              <span>Aurum Motors</span><ArrowRight className="h-3 w-3 text-amber-400/70" /><span>Benvenuto!</span>
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
        @keyframes car-drive {
          0% { transform: translate3d(-72vw, 18px, 0) scale(0.72); opacity: 0; }
          12% { opacity: 1; }
          42% { transform: translate3d(-4vw, 0, 0) scale(0.92); }
          58% { transform: translate3d(2vw, -2px, 0) scale(1); }
          100% { transform: translate3d(8vw, 0, 0) scale(1); opacity: 1; }
        }
        @keyframes car-exit {
          0% { transform: translate3d(8vw, 0, 0) scale(1); opacity: 1; }
          100% { transform: translate3d(115vw, -4px, 0) scale(1.08); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
