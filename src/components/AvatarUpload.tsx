import React, { useState, useRef } from 'react';
import { Upload, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface AvatarUploadProps { currentAvatarUrl?: string; onAvatarUpdate: (newAvatarUrl: string) => void; size?: 'sm' | 'md' | 'lg'; }
const MAX_UPLOAD_SIZE = 4.5 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

const extractStoragePathFromUrl = (url: string): string | null => {
  try { const match = new URL(url).pathname.match(/\/avatars\/(.+)$/); return match ? decodeURIComponent(match[1]) : null; }
  catch { const match = url.match(/\/avatars\/([^?]+)/); return match ? decodeURIComponent(match[1].split('?')[0]) : null; }
};
const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file); const image = new Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non valida')); }; image.src = url;
});
const prepareAvatar = async (file: File): Promise<{ file: File; preview: string }> => {
  if (file.size <= MAX_UPLOAD_SIZE && file.type !== 'image/gif') return { file, preview: URL.createObjectURL(file) };
  const image = await loadImage(file); const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d'); if (!context) throw new Error('Impossibile elaborare l\'immagine'); context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.86; let blob: Blob | null = null;
  while (quality >= 0.45) { blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality)); if (blob && blob.size <= MAX_UPLOAD_SIZE) break; quality -= 0.08; }
  if (!blob || blob.size > MAX_UPLOAD_SIZE) throw new Error('Impossibile comprimere l\'avatar sotto il limite di 5MB');
  const preparedFile = new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp', lastModified: Date.now() });
  return { file: preparedFile, preview: URL.createObjectURL(blob) };
};

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ currentAvatarUrl, onAvatarUpdate, size = 'md' }) => {
  const [uploading, setUploading] = useState(false); const [previewUrl, setPreviewUrl] = useState<string | null>(null); const fileInputRef = useRef<HTMLInputElement>(null); const { user } = useAuth();
  const sizeClasses = { sm: 'w-12 h-12', md: 'w-20 h-20', lg: 'w-32 h-32' };
  const broadcastAvatar = (avatarUrl: string | null) => window.dispatchEvent(new CustomEvent('profile:avatar-updated', { detail: { userId: user?.id, avatarUrl } }));

  const uploadAvatar = async (originalFile: File) => {
    try {
      setUploading(true); if (!ALLOWED_TYPES.has(originalFile.type)) throw new Error('Formato non supportato. Usa JPG, PNG, GIF o WEBP.'); if (!user?.id) throw new Error('Sessione non valida. Effettua nuovamente il login.');
      const { file, preview } = await prepareAvatar(originalFile); setPreviewUrl(preview);
      const filePath = `${user.id}/${user.id}-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { cacheControl: '3600', contentType: 'image/webp', upsert: false }); if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath); if (!data.publicUrl) throw new Error('Impossibile ottenere URL pubblico avatar');
      const { error: updateError } = await supabase.from('users').update({ avatar_url: data.publicUrl }).eq('id', user.id); if (updateError) throw updateError;
      if (currentAvatarUrl) { const oldStoragePath = extractStoragePathFromUrl(currentAvatarUrl); if (oldStoragePath && oldStoragePath !== filePath) void supabase.storage.from('avatars').remove([oldStoragePath]).catch(error => console.warn('Pulizia vecchio avatar fallita:', error)); }
      onAvatarUpdate(data.publicUrl); broadcastAvatar(data.publicUrl); setPreviewUrl(null);
    } catch (error) { console.error('Error uploading avatar:', error); alert(`Errore durante il caricamento dell'avatar: ${(error as Error)?.message || 'Errore sconosciuto'}`); setPreviewUrl(null); }
    finally { setUploading(false); }
  };
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ''; };
  const removeAvatar = async () => {
    try { setUploading(true); if (!user?.id) throw new Error('Sessione non valida'); const { error } = await supabase.from('users').update({ avatar_url: null }).eq('id', user.id); if (error) throw error;
      if (currentAvatarUrl) { const oldStoragePath = extractStoragePathFromUrl(currentAvatarUrl); if (oldStoragePath) void supabase.storage.from('avatars').remove([oldStoragePath]).catch(() => undefined); }
      onAvatarUpdate(''); broadcastAvatar(null);
    } catch (error) { console.error('Error removing avatar:', error); alert(`Errore durante la rimozione dell'avatar: ${(error as Error)?.message || 'Errore sconosciuto'}`); }
    finally { setUploading(false); }
  };
  const displayUrl = previewUrl || currentAvatarUrl;
  return <div className="flex flex-col items-center space-y-2"><div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300`}>{displayUrl ? <><img src={displayUrl} alt="Avatar" className="w-full h-full object-cover" />{currentAvatarUrl && <button onClick={removeAvatar} disabled={uploading} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors" title="Rimuovi avatar" type="button"><X size={12} /></button>}</> : <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={size === 'sm' ? 16 : size === 'md' ? 24 : 32} /></div>}{uploading && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" /></div>}</div><button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"><Upload size={14} /><span>{currentAvatarUrl ? 'Cambia' : 'Carica'} Avatar</span></button><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileSelect} className="hidden" /></div>;
};