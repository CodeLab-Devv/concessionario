import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { OwnerRegistrationForm } from './components/OwnerRegistrationForm';
import { NotificationProvider } from './components/ui/NotificationManager';
import { DialogProvider } from './components/ui/DialogManager';
import { MainLayout } from './components/MainLayout';
import { AnimatedIntro } from './components/AnimatedIntro';

const AuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'owner-register'>('login');
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'owner-register') {
        setAuthMode('owner-register');
      } else {
        setAuthMode('login');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleModeChange = (mode: 'login' | 'register' | 'owner-register') => {
    setAuthMode(mode);
    if (mode === 'owner-register') {
      window.location.hash = 'owner-register';
    } else {
      window.location.hash = '';
    }
  };

  // Mostra l'intro animata solo al primo caricamento
  if (showIntro) {
    return <AnimatedIntro onComplete={() => setShowIntro(false)} />;
  }

  // Contenitore con transizione fluida per il form di login
  const formContent = (() => {
    switch (authMode) {
      case 'register':
        return <RegisterForm onToggleMode={() => handleModeChange('login')} />;
      case 'owner-register':
        return <OwnerRegistrationForm onToggleMode={() => handleModeChange('login')} />;
      default:
        return <LoginForm onToggleMode={() => handleModeChange('register')} />;
    }
  })();

  return (
    <div className="animate-fadeIn">
      {formContent}
    </div>
  );
};

const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <MainLayout />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <DialogProvider>
          <MainApp />
        </DialogProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;