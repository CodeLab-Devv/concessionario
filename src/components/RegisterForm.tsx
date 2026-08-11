import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, Eye, EyeOff, Car } from 'lucide-react';
import { getErrorMessage } from '../utils/errorHandling';

interface RegisterFormProps {
  onToggleMode: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [characterExpression, setCharacterExpression] = useState<'normal' | 'happy' | 'sad'>('normal');
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    setCharacterExpression('normal');

    if (!email || !password || !name) {
      setError('Compila tutti i campi');
      setCharacterExpression('sad');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      setCharacterExpression('sad');
      setLoading(false);
      return;
    }

    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setError('La registrazione sta impiegando troppo tempo. Riprova o fai il login.');
      setCharacterExpression('sad');
    }, 10000);

    try {
      const result = await register(email, password, name);
      clearTimeout(safetyTimer);

      if (result.success) {
        setSuccess(result.message || 'Registrazione completata! Ora puoi accedere.');
        setCharacterExpression('happy');
        setEmail('');
        setPassword('');
        setName('');
      } else {
        setError(result.message || 'Errore nella registrazione');
        setCharacterExpression('sad');
      }
    } catch (err: unknown) {
      clearTimeout(safetyTimer);
      console.error('Registration form exception:', err);
      setError(getErrorMessage(err, 'Errore imprevisto durante la registrazione'));
      setCharacterExpression('sad');
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };


  return (
    <div className="app-viewport bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center px-4 relative overflow-hidden transition-all duration-1000">
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
              
              {/* Espressioni */}
              {characterExpression === 'happy' && (
                <div className="absolute -top-2 -right-2 text-2xl animate-bounce">😊</div>
              )}
              {characterExpression === 'sad' && (
                <div className="absolute -top-2 -right-2 text-2xl animate-pulse">😔</div>
              )}

              <div className="absolute -bottom-2 -left-2 text-xl animate-pulse">🚗</div>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 tracking-wide animate-fadeIn">
              AURUM MOTORS
            </h2>
            <div className="text-yellow-400 text-sm font-semibold tracking-widest mb-2 animate-slideIn">
              CONCESSIONARIO
            </div>
            <p className="text-gray-400 text-sm animate-fadeIn" style={{animationDelay: '0.3s'}}>
              Unisciti al team del concessionario
            </p>
          </div>
          
          {/* CSS animazioni */}
          <style>{`
            @keyframes breathe {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-5px); }
              75% { transform: translateX(5px); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideIn {
              from { opacity: 0; transform: translateX(-20px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Nome */}
            <div className="group">
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2 transition-colors group-focus-within:text-yellow-400">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserPlus className="h-5 w-5 text-gray-500 group-focus-within:text-yellow-400 transition-all duration-300" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 hover:bg-gray-700/70"
                  placeholder="Nome Cognome"
                />
              </div>
            </div>

            {/* Campo Email */}
            <div className="group">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2 transition-colors group-focus-within:text-yellow-400">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-yellow-400 transition-all duration-300" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 hover:bg-gray-700/70"
                  placeholder="email@esempio.com"
                />
              </div>
            </div>

            {/* Campo Password */}
            <div className="group">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2 transition-colors group-focus-within:text-yellow-400">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-yellow-400 transition-all duration-300" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 hover:bg-gray-700/70"
                  placeholder="Password (min 6 caratteri)"
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

            {/* Badge Concessionario */}
            <div className="flex items-center justify-center p-4 border border-yellow-500/40 rounded-xl bg-yellow-500/10">
              <Car className="h-5 w-5 text-yellow-400 mr-3" />
              <span className="text-yellow-300 font-semibold">Concessionario – Aurum Motors</span>
            </div>

            {/* Nota informativa */}
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong className="text-blue-200">Nota:</strong> Tutti i nuovi account iniziano come "In Prova". 
                I direttori potranno successivamente promuoverti.
              </p>
            </div>

            {/* Messaggi errore/successo */}
            {error && (
              <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-900/50 border border-green-500/50 rounded-lg p-3 animate-pulse">
                <p className="text-sm text-green-300">{success}</p>
              </div>
            )}

            {/* Pulsante Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gradient-to-r from-yellow-600 to-amber-700 text-white py-4 px-4 rounded-xl font-semibold hover:from-yellow-700 hover:to-amber-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shimmer"></div>
              
              <div className="relative z-10 flex items-center justify-center space-x-3">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Registrazione in corso...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                    <span>UNISCITI AD AURUM MOTORS</span>
                  </>
                )}
              </div>
            </button>

            <style>{`
              @keyframes shimmer {
                0% { transform: translateX(-100%) skewX(-12deg); }
                100% { transform: translateX(200%) skewX(-12deg); }
              }
            `}</style>
          </form>

          {/* Link login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Hai già un account?{' '}
              <button
                onClick={onToggleMode}
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors duration-200 hover:underline"
              >
                Accedi
              </button>
            </p>
          </div>

          {/* Badge sicurezza */}
          <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connessione sicura</span>
          </div>
        </div>

        <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-yellow-500/10 rounded-full blur-xl"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};
