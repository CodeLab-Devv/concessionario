import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User } from '../types';

export const UserRoleManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { user, updateUserRole } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      if (data) {
        const usersList: User[] = data.map(userData => ({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          employeeType: userData.employee_type,
          createdAt: userData.created_at
        }));
        setUsers(usersList);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation') => {
    if (!updateUserRole) return;

    setUpdating(userId);
    try {
      const success = await updateUserRole(userId, newRole);
      if (success) {
        // Refresh users list
        await fetchUsers();
        alert('Ruolo aggiornato con successo!');
      } else {
        alert('Errore durante l\'aggiornamento del ruolo');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Errore durante l\'aggiornamento del ruolo');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'director': return 'bg-red-100 text-red-800';
      case 'vice_director': return 'bg-orange-100 text-orange-800';
      case 'employee': return 'bg-green-100 text-green-800';
      case 'probation': return 'bg-yellow-100 text-yellow-800';

      default: return 'bg-gray-100 text-gray-800';
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

  // Only owners can manage roles
  if (user?.role !== 'owner') {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Gestione Ruoli Utenti</h3>
        <p className="text-gray-600">Solo i proprietari possono gestire i ruoli degli utenti.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Gestione Ruoli Utenti</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Gestione Ruoli Utenti</h3>
      
      <div className="overflow-x-auto rounded-lg border border-gray-200 [scrollbar-width:thin]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ruolo Attuale
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo Dipendente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((userData) => (
              <tr key={userData.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                    <div className="text-sm text-gray-500">{userData.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(userData.role)}`}>
                    {getRoleLabel(userData.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userData.employeeType ? (
                    userData.employeeType === 'dealer' ? 'Concessionario' : userData.employeeType
                  ) : 'Concessionario'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {userData.id !== user.id && (
                    <select
                      value={userData.role}
                      onChange={(e) => handleRoleUpdate(userData.id, e.target.value as User['role'])}
                      disabled={updating === userData.id}
                      className="border border-gray-300 rounded-md px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:py-1 sm:text-sm"
                    >
                      <option value="probation">In Prova</option>
                      <option value="employee">Dipendente</option>
                      <option value="vice_director">Vice Direttore</option>
                      <option value="director">Direttore</option>
                      <option value="owner">Proprietario</option>
                    </select>
                  )}
                  {userData.id === user.id && (
                    <span className="text-gray-400 text-sm">Tu stesso</span>
                  )}
                  {updating === userData.id && (
                    <span className="text-blue-600 text-sm ml-2">Aggiornamento...</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500">Nessun utente trovato.</p>
        </div>
      )}
    </div>
  );
};
