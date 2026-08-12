import React from 'react';
import { Sale } from '../../types';
import { X, Car, Euro, Hash, CalendarDays, UserRound, Tag } from 'lucide-react';

interface ViewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

const euro = (value: number) => new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
}).format(value);

export const ViewSaleModal: React.FC<ViewSaleModalProps> = ({ isOpen, onClose, sale }) => {
  if (!isOpen || !sale) return null;

  const item = sale.itemName?.trim() || 'Veicolo';
  const model = sale.carModel?.trim();
  const hasModel = Boolean(model && model.toLowerCase() !== item.toLowerCase());
  const date = new Date(sale.created_at || sale.date);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-details-title"
    >
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-xl sm:rounded-[2rem]">
        <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 px-5 pb-6 pt-5 text-white sm:px-7">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 ring-1 ring-amber-300/20">
                <Car className="h-6 w-6 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Aurum Motors</p>
                <h2 id="sale-details-title" className="mt-1 text-xl font-bold sm:text-2xl">Dettagli vendita</h2>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Veicolo venduto</p>
            <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-white">{item}</p>
            {hasModel && <p className="mt-0.5 truncate text-sm font-medium text-white/60">{model}</p>}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Euro className="h-4 w-4 text-emerald-600" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Prezzo</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{euro(sale.price)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Hash className="h-4 w-4 text-indigo-600" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Quantità</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{sale.quantity}</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:col-span-1">
              <Tag className="h-4 w-4 text-emerald-600" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-emerald-700/60">Totale</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-700">{euro(sale.total)}</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><UserRound className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Venduta da</p>
                <p className="truncate text-sm font-bold text-slate-900">{sale.employeeName || 'Utente'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><CalendarDays className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Data e ora</p>
                <p className="text-sm font-semibold text-slate-900">{date.toLocaleDateString('it-IT')} · {date.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-100 bg-white p-4 sm:p-5">
          <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Chiudi</button>
        </footer>
      </div>
    </div>
  );
};