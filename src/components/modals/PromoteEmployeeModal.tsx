import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { X, UserCheck, Crown, Star, Award, Shield, Trash2, Clock, CheckCircle2, XCircle, Car } from 'lucide-react';
import { useNotifications } from '../ui/NotificationManager';
import { useDialogs } from '../ui/DialogManager';

interface PromoteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPromote: (userId: string, newRole: User['role']) => Promise<boolean>;
  onFire: (userId: string) => void;
  employee: User | null;
  currentUserRole: string;
}

export const PromoteEmployeeModal: React.FC<PromoteEmployeeModalProps> = ({ 
  isOpen, 
  onClose, 
  onPromote,
  onFire, 
  employee,
  currentUserRole
}) => {
  const [newRole, setNewRole] = useState<User['role']>(employee?.role || 'probation');
  const { showSuccess, showError } = useNotifications();
  const { showConfirm } = useDialogs();

  const [loading, setLoading] = useState(false);

  // Update newRole when employee changes
  useEffect(() => {
    if (employee?.role) {
      setNewRole(employee.role);
    }
  }, [employee]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Shield className="h-5 w-5 text-red-600" />;
      case 'director': return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'vice_director': return <Award className="h-5 w-5 text-purple-600" />;
      case 'employee': return <UserCheck className="h-5 w-5 text-blue-600" />;
      case 'probation': return <Star className="h-5 w-5 text-orange-600" />;
      default: return <UserCheck className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietario';
      case 'director': return 'Direttore';
      case 'vice_director': return 'Vice Direttore';
      case 'employee': return 'Dipendente';
      case 'probation': return 'In Prova';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800';
      case 'director': return 'bg-yellow-100 text-yellow-800';
      case 'vice_director': return 'bg-purple-100 text-purple-800';
      case 'employee': return 'bg-blue-100 text-blue-800';
      case 'probation': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canPromoteToRole = (role: string) => {
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'director') return role !== 'owner';
    if (currentUserRole === 'vice_director') return !['owner', 'director'].includes(role);
    return false;
  };

  const canFire = () => {
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'director') return employee?.role !== 'owner';
    if (currentUserRole === 'vice_director') return !['owner', 'director', 'vice_director'].includes(employee?.role || '');
    return false;
  };
  
  const canToggleServiceStatus = () => {
    return ['owner', 'director', 'vice_director'].includes(currentUserRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || newRole === employee.role) return;

    const roleLabels = {
      owner: 'Proprietario',
      director: 'Direttore', 
      vice_director: 'Vice Direttore',
      employee: 'Dipendente',
      probation: 'In Prova'
    };

    const message = `Sei sicuro di voler cambiare il ruolo di ${employee.name} da "${roleLabels[employee.role as keyof typeof roleLabels]}" a "${roleLabels[newRole]}"?`;

    const confirmed = await showConfirm({
      title: 'Conferma Modifica',
      message,
      confirmText: 'Conferma',
      cancelText: 'Annulla',
      type: 'warning',
      icon: 'warning'
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const updated = await onPromote(employee.id, newRole);
      if (!updated) {
        showError('Errore', 'Non Ã¨ stato possibile aggiornare il dipendente');
        return;
      }
      showSuccess('Dipendente aggiornato', `Le informazioni di ${employee.name} sono state aggiornate con successo`);
      onClose();
    } catch (error) {
      console.error('Error updating employee:', error);
      showError('Errore', 'Si è verificato un errore durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  const handleFire = async () => {
    if (!employee) return;
    await onFire(employee.id);
  };

  // Check if user is managing themselves
  const isSelfManagement = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token') || '{}');
      const currentUserId = currentUser?.user?.id;
      return employee?.id === currentUserId;
    } catch {
      return false;
    }
  };

  const showManageButton = !(currentUserRole === 'director' && employee?.role === 'owner');

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto modal-content">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Gestisci Dipendente</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <UserCheck className="h-8 w-8 text-yellow-600" />
              <div>
                <h4 className="font-semibold text-gray-900">{employee.name}</h4>
                <p className="text-sm text-gray-500">{employee.email}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Car className="h-3 w-3 text-yellow-600" />
                  <p className="text-xs text-yellow-700 font-medium">Concessionario – Aurum Motors</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Ruolo attuale:</span>
              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(employee.role)}`}>
                {getRoleIcon(employee.role)}
                <span className="ml-1">{getRoleLabel(employee.role)}</span>
              </span>
            </div>
          </div>

          {canToggleServiceStatus() && employee.role !== 'owner' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                Stato di servizio
              </h4>
              
              <div className="flex items-center">
                {employee.isOnService ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400 mr-2" />
                )}
                <span className="text-sm font-medium">
                  {employee.isOnService ? 'In servizio' : 'Fuori servizio'}
                </span>
              </div>
              
              {employee.lastServiceStatusChange && (
                <p className="text-xs text-gray-500 mt-2">
                  Ultimo aggiornamento: {new Date(employee.lastServiceStatusChange).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {showManageButton && !isSelfManagement() && (currentUserRole === 'owner' || currentUserRole === 'director') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newRole" className="block text-sm font-medium text-gray-700 mb-2">
                  Nuovo Ruolo
                </label>
                <select
                  id="newRole"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'owner' | 'director' | 'vice_director' | 'employee' | 'probation')}
                  className="block w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="probation" disabled={!canPromoteToRole('probation')}>In Prova</option>
                  <option value="employee" disabled={!canPromoteToRole('employee')}>Dipendente</option>
                  <option value="vice_director" disabled={!canPromoteToRole('vice_director')}>Vice Direttore</option>
                  <option value="director" disabled={!canPromoteToRole('director')}>Direttore</option>
                  {currentUserRole === 'owner' && (
                    <option value="owner">Proprietario</option>
                  )}
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  {getRoleIcon(newRole)}
                  <span className="text-sm font-medium text-yellow-800">
                    Nuovo ruolo: {getRoleLabel(newRole)}
                  </span>
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
                  disabled={loading || newRole === employee.role}
                  className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </form>
          )}
          
          {/* Show read-only info for lower roles */}
          {showManageButton && !isSelfManagement() && !['owner', 'director'].includes(currentUserRole) && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  {getRoleIcon(employee?.role || '')}
                  <span className="text-sm font-medium text-gray-700">
                    Ruolo attuale: {getRoleLabel(employee?.role || '')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Car className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-gray-600">
                    Tipo: Concessionario
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Solo proprietari e direttori possono modificare ruoli.
                </p>
              </div>
            </div>
          )}

          {canFire() && !isSelfManagement() && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleFire}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Licenzia Dipendente</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
