import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Eye, EyeOff, Car } from 'lucide-react';
import { getErrorMessage } from '../utils/errorHandling';

interface LoginFormProps {
  onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [characterExpression, setCharacterExpression] = useState<'normal' | 'happy' | 'sad'>('normal');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setCharacterExpression('normal');

    if (!email || !password) {
      setError('Inserisci email e password');
      setCharacterExpression('sad');
      setLoading(false);
      return;
    }

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.message || 'Email o password non corretti');
        setCharacterExpression('sad');
      } else {
        setCharacterExpression('happy');
      }
    } catch (err: unknown) {
      console.error('Login form exception:', err);
      setError(getErrorMessage(err, 'Errore imprevisto durante l\'accesso'));
      setCharacterExpression('sad');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="app-viewport bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Video di sfondo */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/backgrounds/concessionario.mp4" type="video/mp4" />
      </video>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Container principale con effetto glassmorphism */}
        <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700/50 transform transition-all duration-500 hover:scale-105">
          {/* Header con logo animato */}
          <div className="text-center mb-8">
            <div className="relative mb-6">
              <div 
                className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-yellow-500 to-amber-700 rounded-full shadow-2xl transform transition-all duration-500 hover:rotate-12 hover:scale-110"
                style={{
                  animation: characterExpression === 'happy' ? 'bounce 0.5s ease-in-out 3' : 
                            characterExpression === 'sad' ? 'shake 0.5s ease-in-out 2' : 
                            'breathe 3s ease-in-out infinite'
                }}
              >
                <Car className="w-12 h-12 text-white" />
              </div>
              
              {/* Espressioni del personaggio */}
              {characterExpression === 'happy' && (
                <div className="absolute -top-2 -right-2 text-2xl animate-bounce">😊</div>
              )}
              {characterExpression === 'sad' && (
                <div className="absolute -top-2 -right-2 text-2xl animate-pulse">😔</div>
              )}

              <div className="absolute -bottom-2 -left-2 text-xl animate-pulse">🏎️</div>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 tracking-wide animate-fadeIn">
              AURUM MOTORS
            </h2>
            <div className="text-yellow-400 text-sm font-semibold tracking-widest mb-2 animate-slideIn">
              CONCESSIONARIO
            </div>
            <p className="text-gray-400 text-sm animate-fadeIn">
              Accedi al tuo pannello gestionale
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Email */}
            <div className="group">
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-2 transition-colors group-focus-within:text-yellow-400">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-yellow-400 transition-all duration-300" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 hover:bg-gray-700/70"
                  placeholder="nome@aurummotors.com"
                />
              </div>
            </div>

            {/* Campo Password */}
            <div className="group">
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-2 transition-colors group-focus-within:text-yellow-400">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-yellow-400 transition-all duration-300" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 hover:bg-gray-700/70"
                  placeholder="La tua password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-yellow-400 transition-all duration-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Messaggi di errore */}
            {error && (
              <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Pulsante Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gradient-to-r from-yellow-600 to-amber-700 text-white py-4 px-4 rounded-xl font-semibold hover:from-yellow-700 hover:to-amber-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-center space-x-3">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Accesso in corso...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    <span>ACCEDI AD AURUM MOTORS</span>
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Link registrazione */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Non hai un account?{' '}
              <button
                onClick={onToggleMode}
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors duration-200 hover:underline"
              >
                Registrati qui
              </button>
            </p>
          </div>

          {/* Badge di sicurezza */}
          <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connessione sicura</span>
          </div>
        </div>
      </div>
    </div>
  );
};
