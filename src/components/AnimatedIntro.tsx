import React, { useState, useEffect } from 'react';

interface AnimatedIntroProps {
  onComplete: () => void;
}

export const AnimatedIntro: React.FC<AnimatedIntroProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [carAnimationComplete, setCarAnimationComplete] = useState(false);

  useEffect(() => {
    // Avvia l'animazione dell'auto
    const carTimer = setTimeout(() => {
      setCarAnimationComplete(true);
    }, 2000); // 2 secondi per l'animazione dell'auto

    // Completa l'intro dopo un breve delay
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Delay per la transizione di fade out
    }, 2500);

    return () => {
      clearTimeout(carTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center overflow-hidden">
      {/* Sfondo con pattern automotive */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500 to-transparent transform -skew-y-12 animate-pulse"></div>
      </div>

      {/* Container principale */}
      <div className="relative z-10 text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-wider">
            AURUM MOTORS
          </h1>
          <div className="text-yellow-400 text-lg md:text-xl font-semibold tracking-widest">
            CONCESSIONARIO
          </div>
        </div>

        {/* Animazione Auto */}
        <div className="relative h-32 md:h-48 mb-8 overflow-hidden">
          {/* Strada */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-600"></div>
          <div className="absolute bottom-1 left-0 right-0 h-px bg-yellow-400 animate-pulse"></div>

          {/* Auto SVG */}
          <div 
            className={`absolute bottom-2 transition-all duration-2000 ease-out ${
              carAnimationComplete 
                ? 'left-full opacity-0 scale-150' 
                : 'left-0 opacity-100 scale-100'
            }`}
            style={{
              transform: carAnimationComplete 
                ? 'translateX(100px) scale(1.5) rotate(5deg)' 
                : 'translateX(-100px) scale(1) rotate(0deg)'
            }}
          >
            <svg 
              width="80" 
              height="40" 
              viewBox="0 0 80 40" 
              className="text-yellow-500"
            >
              {/* Corpo auto */}
              <rect x="10" y="20" width="50" height="12" rx="2" fill="currentColor" />
              <rect x="15" y="15" width="40" height="8" rx="3" fill="currentColor" />
              
              {/* Ruote */}
              <circle cx="20" cy="32" r="6" fill="#374151" />
              <circle cx="50" cy="32" r="6" fill="#374151" />
              <circle cx="20" cy="32" r="3" fill="#6B7280" />
              <circle cx="50" cy="32" r="3" fill="#6B7280" />
              
              {/* Fari */}
              <circle cx="62" cy="24" r="2" fill="#FEF3C7" className="animate-pulse" />
              <circle cx="62" cy="28" r="1.5" fill="#FCA5A5" />
            </svg>
          </div>

          {/* Effetto sgommata */}
          <div className={`absolute bottom-2 left-0 transition-all duration-1000 ${
            carAnimationComplete ? 'opacity-0' : 'opacity-100'
          }`}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-1 bg-gray-400 rounded animate-ping"
                style={{
                  left: `${20 + i * 15}px`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '0.8s'
                }}
              ></div>
            ))}
          </div>

          {/* Effetto velocità */}
          <div className={`absolute inset-0 transition-opacity duration-500 ${
            carAnimationComplete ? 'opacity-100' : 'opacity-0'
          }`}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-16 h-px bg-white opacity-30 animate-pulse"
                style={{
                  top: `${20 + i * 8}px`,
                  left: `${i * 10}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex justify-center space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            ></div>
          ))}
        </div>
      </div>

      {/* Fade out overlay */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          carAnimationComplete ? 'opacity-50' : 'opacity-0'
        }`}
      ></div>
    </div>
  );
};