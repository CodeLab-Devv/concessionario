import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Circle, CircleDot, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ProfileModal } from './modals/ProfileModal';
import { Avatar } from './Avatar';

type AvatarUpdatedEvent = CustomEvent<{ userId: string; avatarUrl: string | null }>;

export const Header: React.FC = () => {
  const { user, logout, toggleServiceStatus, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar_url);
  const [warningCount, setWarningCount] = useState(0);
  const [hasLastChance, setHasLastChance] = useState(false);

  useEffect(() => { setAvatarUrl(user?.avatar_url); }, [user?.avatar_url]);

  useEffect(() => {
    const handleAvatarUpdated = (event: Event) => {
      const { userId, avatarUrl: nextAvatarUrl } = (event as AvatarUpdatedEvent).detail;
      if (userId === user?.id) setAvatarUrl(nextAvatarUrl || undefined);
    };
    window.addEventListener('profile:avatar-updated', handleAvatarUpdated);
    return () => window.removeEventListener('profile:avatar-updated', handleAvatarUpdated);
  }, [user?.id]);

  const loadWarnings = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('disciplinary_warnings')
      .select('severity')
      .eq('employee_id', user.id);

    if (error) {
      console.error('Errore caricamento richiami:', error);
      return;
    }

    const warnings = data ?? [];
    setWarningCount(warnings.filter(warning => warning.severity !== 'last_chance').length);
    setHasLastChance(warnings.some(warning => warning.severity === 'last_chance'));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setWarningCount(0);
      setHasLastChance(false);
      return;
    }

    void loadWarnings();
    const channel = supabase
      .channel(`header-warnings-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'disciplinary_warnings',
        filter: `employee_id=eq.${user.id}`,
      }, () => void loadWarnings())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, loadWarnings]);

  const handleToggleServiceStatus = async () => {
    if (!toggleServiceStatus) return;
    setIsLoading(true);
    try { await toggleServiceStatus(); } catch (error) { console.error('Error toggling service status:', error); } finally { setIsLoading(false); }
  };

  const getRoleLabel = (role: string) => ({ owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In Prova' }[role] || role);
  const getRoleColor = (role: string) => ({ owner: 'bg-red-100 text-red-800', director: 'bg-yellow-100 text-yellow-800', vice_director: 'bg-purple-100 text-purple-800', employee: 'bg-blue-100 text-blue-800', probation: 'bg-orange-100 text-orange-800' }[role] || 'bg-gray-100 text-gray-800');

  return <header className="border-b border-gray-200 bg-white shadow-sm">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex h-16 min-w-0 items-center justify-between gap-2">
      <div className="min-w-0 flex items-center"><div className="min-w-0 flex-shrink"><h1 className="truncate text-base font-bold text-gray-900 sm:text-xl">AURUM MOTORS</h1></div></div>
      <div className="min-w-0 flex shrink-0 items-center gap-1.5 sm:gap-3">
        {isAuthenticated && <>
          {warningCount > 0 || hasLastChance ? <div className="flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-50 px-2 text-xs font-semibold text-amber-800 sm:px-3 sm:text-sm" title="Provvedimenti disciplinari"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /><span>{hasLastChance ? 'Last Chance' : `${warningCount} ${warningCount === 1 ? 'richiamo' : 'richiami'}`}</span></div> : null}
          <button onClick={handleToggleServiceStatus} disabled={isLoading} aria-label={user?.isOnService ? 'In servizio' : 'Fuori servizio'} className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors sm:min-w-0 sm:px-3 ${user?.isOnService ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{user?.isOnService ? <><CircleDot className="h-4 w-4 text-green-600" /><span className="hidden sm:inline">In servizio</span></> : <><Circle className="h-4 w-4 text-gray-500" /><span className="hidden sm:inline">Fuori servizio</span></>}{isLoading && <span className="ml-1.5 h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />}</button>
        </>}
        <button onClick={() => setShowProfileModal(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border-l border-gray-200 p-2 hover:bg-gray-50 sm:min-w-0 sm:justify-start sm:space-x-2 sm:pl-3" title="Visualizza profilo"><div className="relative"><div className={`absolute -right-0.5 -top-0.5 z-10 h-2.5 w-2.5 rounded-full border-2 border-white ${user?.isOnService ? 'bg-green-500' : 'bg-gray-400'}`} /><Avatar src={avatarUrl} alt={user?.name || 'User'} size="md" fallbackText={user?.name || 'U'} /></div><div className="hidden min-w-0 text-left sm:block"><div className="max-w-32 truncate text-sm font-medium text-gray-900">{user?.name}</div><div className="flex min-w-0 items-center"><span className={`rounded-full px-1.5 py-0.5 text-xs ${getRoleColor(user?.role || '')}`}><span className="block max-w-28 truncate">{getRoleLabel(user?.role || '')}</span></span></div></div></button>
        <button onClick={logout} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Esci"><LogOut className="h-5 w-5" /></button>
      </div>
    </div></div>
    <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
  </header>;
};
