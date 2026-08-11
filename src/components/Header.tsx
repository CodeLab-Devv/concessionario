import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Circle, CircleDot } from 'lucide-react';
import { ProfileModal } from './modals/ProfileModal';
import { Avatar } from './Avatar';

export const Header: React.FC = () => {
  const { user, logout, toggleServiceStatus, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleToggleServiceStatus = async () => {
    if (!toggleServiceStatus) return;
    
    setIsLoading(true);
    try {
      await toggleServiceStatus();
    } catch (error) {
      console.error('Error toggling service status:', error);
    } finally {
      setIsLoading(false);
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

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">AURUM MOTORS</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isAuthenticated && (
              <button
                onClick={handleToggleServiceStatus}
                disabled={isLoading}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  user?.isOnService 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {user?.isOnService ? (
                  <>
                    <CircleDot className="h-4 w-4 text-green-600" />
                    <span>In servizio</span>
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4 text-gray-500" />
                    <span>Fuori servizio</span>
                  </>
                )}
                {isLoading && (
                  <span className="ml-1.5 h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                )}
              </button>
            )}

            <button 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center space-x-2 border-l border-gray-200 pl-3 hover:bg-gray-50 rounded-lg transition-colors p-2 -m-2"
              title="Visualizza profilo"
            >
              <div className="relative">
                <div className={`h-2.5 w-2.5 rounded-full absolute -right-0.5 -top-0.5 border-2 border-white z-10 ${
                  user?.isOnService ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <Avatar 
                  src={user?.avatar_url} 
                  alt={user?.name || 'User'}
                  size="md"
                  fallbackText={user?.name || 'U'}
                />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="flex items-center">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${getRoleColor(user?.role || '')}`}>
                    {getRoleLabel(user?.role || '')}
                  </span>
                </div>
              </div>
            </button>
            
            <button 
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Esci"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
    </header>
  );
};