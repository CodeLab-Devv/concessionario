import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackText?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt = 'Avatar', 
  size = 'md', 
  className = '',
  fallbackText 
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSizes = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const getInitials = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const showImage = src && !imgError;

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center ${className}`}>
      {showImage ? (
        <img 
          src={src} 
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => {
            setImgError(true);
            console.warn(`Avatar image failed to load: ${src}`);
          }}
        />
      ) : fallbackText ? (
        <span className={`font-medium text-gray-600 ${textSizes[size]}`}>
          {getInitials(fallbackText)}
        </span>
      ) : (
        <User size={iconSizes[size]} className="text-gray-400" />
      )}
    </div>
  );
};