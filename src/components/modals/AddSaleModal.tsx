import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sale } from '../../types';
import { X, Package, DollarSign, Hash, Car } from 'lucide-react';
import { VehicleSearch } from '../VehicleSearch';
import { useNotifications } from '../ui/NotificationManager';

interface Vehicle {
  id: number | string;
  name: string;
  type: string;
  price: number;
}

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (sale: Omit<Sale, 'id'>) => void;
}

export const AddSaleModal: React.FC<AddSaleModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { user } = useAuth();
  const { showError } = useNotifications();

  const [itemName, setItemName] = useState('');
  const [carModel, setCarModel] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [discountType, setDiscountType] = useState<'employee' | 'collaboration' | null>(null);

  const category = 'concessionari';

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setItemName(vehicle.name);
    setPrice(vehicle.price.toString());
    setVehicleCategory(vehicle.type);
    if (!carModel.trim()) setCarModel(vehicle.name);
  };

  const calculateTotal = (vehiclePrice: number, qty: number) => {
    let total = vehiclePrice * qty;
    if (discountType === 'employee') total *= 0.8;
    if (discountType === 'collaboration') total *= 0.7;
    return total;
  };

  const resetForm = () => {
    setItemName('');
    setCarModel('');
    setVehicleCategory('');
    setPrice('');
    setQuantity('1');
    setSelectedVehicle(null);
    setDiscountType(null);
    setLoading(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (!user) throw new Error('Utente non autenticato');

      const priceNum = Number.parseFloat(price);
      const quantityNum = Number.parseInt(quantity, 10);

      if (!Number.isFinite(priceNum) || priceNum <= 0) throw new Error('Prezzo non valido');
      if (!Number.isInteger(quantityNum) || quantityNum <= 0) throw new Error('Quantità non valida');

      const newSale: Omit<Sale, 'id'> = {
        employeeId: user.id,
        employeeName: user.name,
        itemName: itemName.trim(),
        carModel: carModel.trim(),
        price: priceNum,
        quantity: quantityNum,
        total: calculateTotal(priceNum, quantityNum),
        date: new Date().toISOString().split('T')[0],
        type: 'sale',
        category,
        discountType: discountType || undefined,
        created_at: new Date().toISOString(),
      };

      await onAdd(newSale);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding sale:', error);
      showError('Errore', error instanceof Error ? error.message : 'Impossibile aggiungere la vendita');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const currentPrice = Number.parseFloat(price) || 0;
  const currentQuantity = Number.parseInt(quantity, 10) || 1;
  const total = calculateTotal(currentPrice, currentQuantity);

  const inputClass = 'h-10 w-full rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100';
  const iconInputClass = `${inputClass} pl-10 pr-3`;
  const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-600';
  const sectionClass = 'rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-2 sm:p-4"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-sale-title"
    >
      <div className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl ring-1 ring-black/5 sm:rounded-[22px]">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="min-w-0">
            <h2 id="add-sale-title" className="text-base font-bold tracking-tight text-gray-900 sm:text-lg">Nuova vendita</h2>
            <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">Registra una nuova vendita</p>
          </div>
          <button type="button" onClick={handleClose} disabled={loading} aria-label="Chiudi" className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          <form id="add-sale-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            <section className="rounded-2xl border border-gray-200 bg-gray-100/70 p-3 sm:p-3.5">
              <label className={labelClass}>Cerca veicolo</label>
              <VehicleSearch onVehicleSelect={handleVehicleSelect} disabled={loading} />
            </section>

            <section className={sectionClass}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Dati veicolo</h3>
                  <p className="mt-0.5 text-[11px] text-gray-500">Informazioni del veicolo venduto</p>
                </div>
                {vehicleCategory && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">{vehicleCategory}</span>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="itemName" className={labelClass}>Modello</label>
                  <div className="relative">
                    <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input id="itemName" type="text" required disabled={loading} value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Modello veicolo" className={iconInputClass} />
                  </div>
                </div>

                <div>
                  <label htmlFor="carType" className={labelClass}>Categoria</label>
                  <div className="relative">
                    <Car className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input id="carType" type="text" value={vehicleCategory} readOnly placeholder="Categoria veicolo" className={`${iconInputClass} bg-gray-50 text-gray-600`} />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="carModel" className={labelClass}>Modello auto</label>
                  <div className="relative">
                    <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input id="carModel" type="text" required disabled={loading} value={carModel} onChange={(event) => setCarModel(event.target.value)} placeholder="Es. BMW X5, Mercedes C-Class" className={iconInputClass} />
                  </div>
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-900">Pagamento</h3>
                <p className="mt-0.5 text-[11px] text-gray-500">Prezzo, quantità e totale</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Prezzo</label>
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <div className="flex h-10 w-full items-center rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm font-semibold text-gray-700">€{Math.round(currentPrice).toLocaleString('it-IT')}</div>
                  </div>
                </div>

                <div>
                  <label htmlFor="quantity" className={labelClass}>Quantità</label>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input id="quantity" type="number" min="1" required disabled={loading} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="1" className={iconInputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Totale</label>
                  <div className="flex h-10 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700">€{Math.round(total).toLocaleString('it-IT')}</div>
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-900">Sconto</h3>
                <p className="mt-0.5 text-[11px] text-gray-500">Seleziona una sola tipologia</p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button type="button" disabled={loading} onClick={() => setDiscountType('employee')} className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold transition active:scale-[0.98] disabled:opacity-50 ${discountType === 'employee' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Dipendente · 20%</button>
                <button type="button" disabled={loading} onClick={() => setDiscountType('collaboration')} className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold transition active:scale-[0.98] disabled:opacity-50 ${discountType === 'collaboration' ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Collaborazione · 30%</button>
                <button type="button" disabled={loading} onClick={() => setDiscountType(null)} className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold transition active:scale-[0.98] disabled:opacity-50 ${discountType === null ? 'bg-gray-700 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Nessuno</button>
              </div>
            </section>
          </form>
        </div>

        <footer className="shrink-0 border-t border-gray-200 bg-white px-3 py-3 sm:px-4 sm:py-3">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={handleClose} disabled={loading} className="min-h-10 w-full rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 sm:w-auto">Annulla</button>
            <button type="submit" form="add-sale-form" disabled={loading} className="min-h-10 w-full rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 sm:w-auto">{loading ? 'Aggiunta...' : 'Aggiungi vendita'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
