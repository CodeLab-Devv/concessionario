import React, { useEffect, useState } from 'react';
import { ArrowRight, Gauge, ShieldCheck } from 'lucide-react';

interface AnimatedIntroProps { onComplete: () => void; }

const INTRO_DURATION = 2400;
const EXIT_DURATION = 500;
const CAR_IMAGE = '/images/animated-intro-car.png';

export const AnimatedIntro: React.FC<AnimatedIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = window.setTimeout(() => setProgress(18), 120);
    const visible = window.setTimeout(() => { setProgress(64); setPhase('visible'); }, 650);
    const end = window.setTimeout(() => setProgress(100), 1450);
    const exit = window.setTimeout(() => setPhase('exit'), INTRO_DURATION);
    const complete = window.setTimeout(onComplete, INTRO_DURATION + EXIT_DURATION);
    return () => { window.clearTimeout(start); window.clearTimeout(visible); window.clearTimeout(end); window.clearTimeout(exit); window.clearTimeout(complete); };
  }, [onComplete]);

  return (
    <div className={['fixed inset-0 z-[9999] overflow-hidden bg-[#070707] transition-opacity duration-500 ease-out', phase === 'exit' ? 'pointer-events-none opacity-0' : 'opacity-100'].join(' ')}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.13),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.08),transparent_48%)]" />
      <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/10 blur-[120px]" />
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'radial-gradient(circle at center, black 20%, transparent 85%)', WebkitMaskImage: 'radial-gradient(circle at center, black 20%, transparent 85%)' }} />

      <div className="relative z-20 flex min-h-full items-center justify-center px-5">
        <div className="w-full max-w-6xl">
          <div className={['mx-auto text-center transition-all duration-[900ms] ease-out', phase === 'enter' ? 'translate-y-4 opacity-0' : phase === 'visible' ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'].join(' ')}>
            <div className="mx-auto mb-7 flex justify-center"><div className="relative"><div className="absolute inset-0 scale-125 rounded-3xl bg-amber-400/10 blur-2xl" /><div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] px-7 py-5 shadow-2xl backdrop-blur-xl"><img src="/aurum-motors-logo.svg" alt="Aurum Motors" className="h-auto w-[210px] sm:w-[250px]" draggable={false} /></div></div></div>
            <div className="flex items-center justify-center gap-3"><span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/70 sm:w-16" /><p className="text-[10px] font-extrabold uppercase tracking-[0.42em] text-amber-300/90 sm:text-xs">Aurum Motors</p><span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/70 sm:w-16" /></div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-4xl">Il tuo prossimo<span className="block text-amber-400">viaggio inizia qui.</span></h1>
            <p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-slate-400 sm:text-sm">Benvenuto in Aurum Motors</p>
          </div>

          <div className="relative mx-auto mt-10 h-[230px] w-full max-w-6xl sm:mt-12 sm:h-[330px]">
            <div className="absolute bottom-10 left-1/2 h-24 w-[82%] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="absolute bottom-10 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
            <div className="absolute bottom-5 left-1/2 h-px w-[82%] -translate-x-1/2 bg-white/10" />
            <div className="absolute bottom-6 left-1/2 w-[min(92vw,980px)] -translate-x-1/2 opacity-100">
              <div className="relative mx-auto w-fit max-w-full">
                <div className="pointer-events-none absolute -inset-x-24 top-1/2 h-28 -translate-y-1/2 rounded-full bg-amber-400/10 blur-3xl" />
                <img src={CAR_IMAGE} alt="Aurum Motors" draggable={false} className="relative block h-auto w-[min(94vw,1000px)] select-none object-contain drop-shadow-[0_25px_55px_rgba(245,158,11,0.18)]" />
                <div className="pointer-events-none absolute inset-x-[12%] bottom-[7%] h-2 rounded-full bg-amber-300/60 blur-md" />
                <div className="pointer-events-none absolute inset-x-[8%] bottom-[4%] h-px bg-gradient-to-r from-transparent via-amber-300/90 to-transparent shadow-[0_0_18px_rgba(245,158,11,0.8)]" />
              </div>
            </div>
          </div>

          <div className={['mx-auto mt-4 max-w-xl transition-all duration-700', phase === 'enter' ? 'translate-y-2 opacity-0' : phase === 'visible' ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'].join(' ')}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl backdrop-blur-xl sm:p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><ShieldCheck className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold text-white sm:text-xs">Preparazione</p><span className="text-[10px] font-bold tabular-nums text-amber-300">{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.45)] transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} /></div></div><div className="hidden items-center gap-2 text-[10px] text-slate-500 sm:flex"><Gauge className="h-3.5 w-3.5" /><span>START</span></div></div></div>
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500"><span>Aurum Motors</span><ArrowRight className="h-3 w-3 text-amber-400/70" /><span>Benvenuto</span></div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
    </div>
  );
};
