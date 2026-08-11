import React from 'react';

interface StatusIndicatorProps {
  isOnline: boolean;
  lastActivity?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  isOnline, 
  lastActivity, 
  size = 'md',
  showTooltip = true 
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const getStatusText = () => {
    if (isOnline) return 'In servizio';
    
    if (lastActivity) {
      const lastActivityDate = new Date(lastActivity);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Fuori servizio (ora)';
      if (diffMinutes < 60) return `Fuori servizio (${diffMinutes}m fa)`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `Fuori servizio (${diffHours}h fa)`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `Fuori servizio (${diffDays}g fa)`;
    }
    
    return 'Fuori servizio';
  };

  const statusText = getStatusText();

  return (
    <div className="relative inline-flex items-center">
      <div 
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          ${isOnline 
            ? 'bg-green-500 shadow-green-500/50' 
            : 'bg-gray-400 shadow-gray-400/50'
          } 
          shadow-lg
          ${isOnline ? 'animate-pulse' : ''}
        `}
        title={showTooltip ? statusText : undefined}
      />
      {isOnline && (
        <div 
          className={`
            absolute 
            ${sizeClasses[size]} 
            rounded-full 
            bg-green-400 
            animate-ping
          `}
        />
      )}
    </div>
  );
};
