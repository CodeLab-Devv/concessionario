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
  const category = 'concessionari';
  const [discountType, setDiscountType] = useState<'employee' | 'collaboration' | null>(null);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setItemName(vehicle.name);
    setPrice(vehicle.price.toString());
    setVehicleCategory(vehicle.type);
    if (!carModel.trim()) {
      setCarModel(vehicle.name);
    }
  };

  const calculateTotal = (price: number, qty: number) => {
    let total = price * qty;
    if (discountType === 'employee') {
      total *= 0.8;
    } else if (discountType === 'collaboration') {
      total *= 0.7;
    }
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        throw new Error('Utente non autenticato');
      }
      const priceNum = parseFloat(price);
      const quantityNum = parseInt(quantity);
      if (isNaN(priceNum) || priceNum <= 0) {
        throw new Error('Prezzo non valido');
      }
      if (isNaN(quantityNum) || quantityNum <= 0) {
        throw new Error('Quantità non valida');
      }
      const total = calculateTotal(priceNum, quantityNum);

      const newSale: Omit<Sale, 'id'> = {
        employeeId: user.id,
        employeeName: user.name,
        itemName: itemName.trim(),
        carModel: carModel.trim(),
        price: priceNum,
        quantity: quantityNum,
        total,
        date: new Date().toISOString().split('T')[0],
        type: 'sale',
        category,
        discountType: discountType || undefined,
        created_at: new Date().toISOString()
      };

      await onAdd(newSale);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding sale:', error);
      showError('Errore', (error as Error).message || 'Impossibile aggiungere la vendita');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItemName('');
    setCarModel('');
    setVehicleCategory('');
    setPrice('');
    setQuantity('1');
    setSelectedVehicle(null);
    setLoading(false);
    setDiscountType(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">Report vendita</h3>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Ricerca veicoli */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cerca Veicolo
            </label>
            <VehicleSearch 
              onVehicleSelect={handleVehicleSelect}
              disabled={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-2">
                Modello
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="itemName"
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Modello veicolo"
                />
              </div>
            </div>

            <div>
              <label htmlFor="carType" className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Car className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="carType"
                  type="text"
                  value={vehicleCategory}
                  readOnly
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Categoria veicolo"
                />
              </div>
            </div>
          </div>

          {/* Campo Modello Auto */}
          <div>
            <label htmlFor="carModel" className="block text-sm font-medium text-gray-700 mb-2">
              Modello Auto
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Package className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="carModel"
                type="text"
                required
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Es. BMW X5, Mercedes C-Class"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prezzo (€)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <div className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
                €{Math.round(parseFloat(price) || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantità
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="quantity"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Totale (€)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <div className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-semibold">
                €{Math.round(calculateTotal(parseFloat(price) || 0, parseInt(quantity) || 1)).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sconto</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setDiscountType('employee')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium ${discountType === 'employee' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'}`}
              >
                Dipendente (20%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('collaboration')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium ${discountType === 'collaboration' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-700'}`}
              >
                Collaborazione (30%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType(null)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium ${!discountType 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-200 text-gray-700'}`}
              >
                Nessuno
              </button>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Aggiunta...' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};