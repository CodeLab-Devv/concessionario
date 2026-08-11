import React, { useState, useEffect } from 'react';
import { Search, Car, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from './ui/NotificationManager';

interface Vehicle {
  id: number | string;
  name: string;
  type: string;
  price: number;
}

interface VehicleSearchProps {
  onVehicleSelect: (vehicle: Vehicle) => void;
  disabled?: boolean;
}

export const VehicleSearch: React.FC<VehicleSearchProps> = ({ onVehicleSelect, disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const { showError } = useNotifications();

  useEffect(() => {
    const fetchVehicles = async () => {
      if (searchTerm.length < 2) {
        setVehicles([]);
        setShowNoResults(false);
        return;
      }
      setLoading(true);
      setShowNoResults(false);
      try {
        const { data, error } = await supabase.from('vehicles').select('*').ilike('name', `%${searchTerm}%`).limit(10);
        if (error) throw error;
        const normalized = (data || []).map(v => ({ ...v, price: typeof v.price === 'number' ? v.price : Number.parseFloat(String(v.price)) || 0 }));
        setVehicles(normalized);
        if (normalized.length === 0) setShowNoResults(true);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        showError('Errore ricerca', 'Impossibile recuperare l\'elenco veicoli');
        setVehicles([]);
      } finally { setLoading(false); }
    };
    const timer = setTimeout(fetchVehicles, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, showError]);

  const handleSelect = (vehicle: Vehicle) => {
    onVehicleSelect(vehicle);
    setSearchTerm('');
    setVehicles([]);
    setShowNoResults(false);
    setIsOpen(false);
  };

  return <div className="relative w-full"><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsOpen(true)} onBlur={() => setTimeout(() => setIsOpen(false), 200)} className={`block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} placeholder="Cerca veicolo..." disabled={disabled} /></div>
    {isOpen && (vehicles.length > 0 || loading || showNoResults) && <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
      {loading ? <div className="px-4 py-2 text-gray-500">Caricamento...</div> : showNoResults ? <div className="px-4 py-3 text-gray-500 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-gray-400" />Nessun veicolo trovato per "{searchTerm}"</div> : vehicles.map(vehicle => <div key={String(vehicle.id)} className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50" onMouseDown={e => { e.preventDefault(); handleSelect(vehicle); }}><div className="flex items-center"><Car className="h-5 w-5 text-gray-500 mr-2" /><span className="font-normal block truncate">{vehicle.name}</span><span className="ml-2 text-gray-500 text-sm">({vehicle.type})</span><span className="ml-auto font-semibold text-green-700 whitespace-nowrap">${vehicle.price.toLocaleString('it-IT')}</span></div></div>)}
    </div>}
  </div>;
};
