import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../ui/NotificationManager';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../Avatar';
import { AvatarUpload } from '../AvatarUpload';
import { 
  X, 
  User, 
  Mail, 
  Shield, 
  Eye, 
  EyeOff, 
  Save,
  Crown,
  Award,
  UserCheck,
  Lock,
  Key,
  CheckCircle
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUserProfile } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | undefined>(user?.avatar_url);
  
  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setCurrentAvatarUrl(user.avatar_url);
    }
  }, [user, isOpen]);

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    setCurrentAvatarUrl(newAvatarUrl || undefined);
    try {
      if (refreshUserProfile) {
        await refreshUserProfile();
      }
    } catch (err) {
      console.warn('Profile refresh after avatar update failed:', err);
    }
    showSuccess('Avatar aggiornato', 'La tua immagine profilo è stata aggiornata con successo');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'director': return <Shield className="h-5 w-5 text-blue-600" />;
      case 'vice_director': return <Award className="h-5 w-5 text-purple-600" />;
      case 'employee': return <UserCheck className="h-5 w-5 text-green-600" />;
      case 'probation': return <User className="h-5 w-5 text-orange-600" />;
      default: return <User className="h-5 w-5 text-gray-600" />;
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
      case 'owner': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'director': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vice_director': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'employee': return 'bg-green-100 text-green-800 border-green-200';
      case 'probation': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      let hasChanges = false;
      const updates: { name?: string } = {};

      if (formData.name.trim() !== user.name) {
        updates.name = formData.name.trim();
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        if (updateErr) {
          throw new Error(`Errore aggiornamento dati: ${updateErr.message}`);
        }
        hasChanges = true;
      }

      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Le nuove password non coincidono');
        }

        if (formData.newPassword.length < 6) {
          throw new Error('La nuova password deve essere di almeno 6 caratteri');
        }

        if (!formData.currentPassword) {
          throw new Error('Inserisci la password attuale per cambiarla');
        }

        // Verifica password attuale
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: formData.currentPassword
        });

        if (signInError) {
          throw new Error('Password attuale non corretta');
        }

        // Aggiorna la password (Supabase invalida tutte le sessioni vecchie)
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });

        if (passwordError) {
          throw new Error(`Errore aggiornamento password: ${passwordError.message}`);
        }

        // Ripristina la sessione subito dopo con la nuova password (evita logout)
        const { error: reloginError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: formData.newPassword
        });

        if (reloginError) {
          console.warn('Re-login after password change failed:', reloginError);
        }

        hasChanges = true;
      }

      if (hasChanges) {
        if (refreshUserProfile) {
          await refreshUserProfile();
        }
        showSuccess('Profilo aggiornato', 'I tuoi dati sono stati aggiornati con successo');
        
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        showError('Nessuna modifica', 'Non sono state rilevate modifiche da salvare');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Errore aggiornamento', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: user?.name || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 via-gray-800 to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-32 translate-x-32"></div>
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">Il Mio Profilo</h2>
                  <p className="text-blue-100 text-sm sm:text-base">Gestisci i tuoi dati personali e impostazioni</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="self-end sm:self-auto p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110 group"
              >
                <X className="h-6 w-6 text-white group-hover:text-blue-200" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
          {/* User Info Display */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 sm:p-8 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative group">
                <Avatar 
                  src={currentAvatarUrl} 
                  alt={user.name || 'User'}
                  size="xl"
                  fallbackText={user.name || 'U'}
                  className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-white shadow-xl group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{user.name}</h3>
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-4">
                  <p className="text-gray-600 flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{user.email}</span>
                  </p>
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(user.role)}
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getRoleColor(user.role)} shadow-sm`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:text-left">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">24/7</div>
                    <div className="text-xs text-gray-500">Disponibilità</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-green-600">Attivo</div>
                    <div className="text-xs text-gray-500">Stato</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Profile Settings */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 text-blue-500 mr-2" />
                    Informazioni Personali
                  </h4>
                  
                  {/* Avatar Upload Section */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Immagine Profilo
                    </label>
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                      <div className="relative group">
                        <Avatar 
                          src={currentAvatarUrl} 
                          alt={user.name || 'User'}
                          size="lg"
                          fallbackText={user.name || 'U'}
                          className="ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <AvatarUpload 
                          currentAvatarUrl={currentAvatarUrl}
                          onAvatarUpdate={handleAvatarUpdate}
                          size="md"
                        />
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-2">
                          📸 Formati supportati: JPG, PNG, GIF<br/>
                          📏 Dimensione massima: 5MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-gray-400"
                        placeholder="Inserisci il tuo nome completo"
                        required
                      />
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Security Settings */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Lock className="h-5 w-5 text-green-500 mr-2" />
                    Sicurezza Account
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-blue-800">Cambia Password (Opzionale)</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">Lascia vuoto per mantenere la password attuale</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password Attuale
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={formData.currentPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-gray-400"
                          placeholder="Password attuale"
                        />
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                          {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nuova Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={formData.newPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-gray-400"
                          placeholder="Nuova password (min. 6 caratteri)"
                          minLength={6}
                        />
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Conferma Nuova Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-gray-400"
                          placeholder="Conferma nuova password"
                        />
                        <CheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="col-span-1 lg:col-span-2 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-medium"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl font-medium"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Salva Modifiche</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
