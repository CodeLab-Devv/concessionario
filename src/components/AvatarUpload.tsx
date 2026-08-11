import React, { useState, useRef } from 'react';
import { Upload, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const extractStoragePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\/avatars\/(.+)$/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch {
    const match = url.match(/\/avatars\/([^?]+)/);
    if (match) {
      return decodeURIComponent(match[1].split('?')[0]);
    }
    return null;
  }
};

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  currentAvatarUrl, 
  onAvatarUpdate, 
  size = 'md' 
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Formato non supportato. Usa JPG, PNG, GIF o WEBP.');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('Il file supera il limite di 10MB. Comprimi l\'immagine e riprova.');
        return;
      }

      if (!user?.id) {
        alert('Sessione non valida. Effettua nuovamente il login.');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '0',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy')) {
          alert('Permessi storage insufficienti. Contatta l\'amministratore.');
        } else if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          alert('Bucket avatars non configurato. Contatta l\'amministratore.');
        } else {
          alert(`Errore caricamento: ${uploadError.message || 'Errore sconosciuto'}`);
        }
        return;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;
      if (!avatarUrl) {
        alert('Impossibile ottenere URL pubblico avatar');
        return;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('DB update error:', updateError);
        alert(`Errore salvataggio profilo: ${updateError.message}`);
        return;
      }

      if (currentAvatarUrl && currentAvatarUrl !== avatarUrl) {
        const oldStoragePath = extractStoragePathFromUrl(currentAvatarUrl);
        if (oldStoragePath && oldStoragePath !== filePath) {
          try {
            await supabase.storage
              .from('avatars')
              .remove([oldStoragePath]);
          } catch (cleanupErr) {
            console.warn('Failed to clean up old avatar (non-fatal):', cleanupErr);
          }
        }
      }

      onAvatarUpdate(avatarUrl);
      setPreviewUrl(null);
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert(`Errore durante il caricamento dell'avatar: ${(error as Error)?.message || 'Errore sconosciuto'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      uploadAvatar(file);
    }
    event.target.value = '';
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);
      
      if (!user?.id) {
        alert('Sessione non valida');
        return;
      }
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      if (currentAvatarUrl) {
        const oldStoragePath = extractStoragePathFromUrl(currentAvatarUrl);
        if (oldStoragePath) {
          try {
            await supabase.storage
              .from('avatars')
              .remove([oldStoragePath]);
          } catch (storageErr) {
            console.warn('Failed to delete old avatar file (non-fatal):', storageErr);
          }
        }
      }

      onAvatarUpdate('');
      
    } catch (error) {
      console.error('Error removing avatar:', error);
      alert(`Errore durante la rimozione dell'avatar: ${(error as Error)?.message || 'Errore sconosciuto'}`);
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300`}>
        {displayUrl ? (
          <>
            <img 
              src={displayUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
            {currentAvatarUrl && (
              <button
                onClick={removeAvatar}
                disabled={uploading}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                title="Rimuovi avatar"
                type="button"
              >
                <X size={12} />
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <User size={size === 'sm' ? 16 : size === 'md' ? 24 : 32} />
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"
      >
        <Upload size={14} />
        <span>{currentAvatarUrl ? 'Cambia' : 'Carica'} Avatar</span>
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
