import React, { useState, useEffect } from 'react';
import { Sale } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, Package, DollarSign, Hash } from 'lucide-react';
import { calculateSaleTotal } from '../../utils/saleCalculations';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (sale: Sale) => void;
  sale: Sale | null;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({ isOpen, onClose, onEdit, sale }) => {
  const { user } = useAuth();
  const [itemName, setItemName] = useState('');
  const [carModel, setCarModel] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [discountType, setDiscountType] = useState<'employee' | 'collaboration' | null>(sale?.discountType || null);
  const [loading, setLoading] = useState(false);

  // Check if user can edit price (only owner and director)
  const canEditPrice = ['owner', 'director'].includes(user?.role || '');
  // Check if user is owner (can only edit quantity and price)
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (sale) {
      setItemName(sale.itemName);
      setCarModel(sale.carModel || '');
      setPrice(sale.price.toString());
      setQuantity(sale.quantity.toString());
      setDiscountType(sale.discountType || null);
    }
  }, [sale]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    
    setLoading(true);

    const priceNum = parseFloat(price);
    const quantityNum = parseInt(quantity);
    const total = calculateSaleTotal(priceNum, quantityNum, discountType);

    const updatedSale: Sale = {
      ...sale,
      itemName,
      carModel,
      price: priceNum,
      quantity: quantityNum,
      total,
      category: 'concessionari',
      discountType: discountType || undefined
    };

    onEdit(updatedSale);
    setLoading(false);
    onClose();
  };

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Modifica Vendita Concessionario</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {!isOwner && (
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Prodotto
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
                  placeholder="Es. Kit pulizia"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prezzo ($)
              {!canEditPrice && (
                <span className="text-xs text-gray-500 ml-2">(Solo proprietario e direttore possono modificare)</span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              {canEditPrice ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              ) : (
                <div className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
                  ${Math.round(parseFloat(price) || 0).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantità
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Totale ($)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <div className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-semibold">
                ${Math.round(calculateSaleTotal(parseFloat(price) || 0, parseInt(quantity) || 1, discountType)).toLocaleString()}
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
              {loading ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};