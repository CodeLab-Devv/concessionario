import React from 'react';
import { Sale } from '../../types';
import { X, Package, DollarSign, Hash, Calendar, User } from 'lucide-react';

interface ViewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const ViewSaleModal: React.FC<ViewSaleModalProps> = ({ isOpen, onClose, sale }) => {
  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Dettagli Vendita Concessionario</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Prodotto</p>
              <p className="font-medium text-gray-900">{sale.itemName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <DollarSign className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Prezzo Unitario</p>
              <p className="font-medium text-gray-900">${Math.round(sale.price).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Hash className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Quantità</p>
              <p className="font-medium text-gray-900">{sale.quantity}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Modello Auto</p>
              <p className="font-medium text-gray-900">{sale.carModel || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <DollarSign className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Totale</p>
              <p className="font-semibold text-green-600 text-lg">${Math.round(sale.total).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm text-gray-500">Dipendente</p>
              <p className="font-medium text-gray-900">{sale.employeeName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Data</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(sale.date).toLocaleDateString('it-IT')} • 
                {new Date(sale.created_at).toLocaleTimeString('it-IT', {
                  timeZone: 'Europe/Rome',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>


        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};