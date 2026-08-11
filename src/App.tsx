import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { OwnerRegistrationForm } from './components/OwnerRegistrationForm';
import { NotificationProvider } from './components/ui/NotificationManager';
import { DialogProvider } from './components/ui/DialogManager';
import { GlobalNotifications } from './components/GlobalNotifications';
import { MainLayout } from './components/MainLayout';
import { AnimatedIntro } from './components/AnimatedIntro';
import { CurrencyDisplayNormalizer } from './components/CurrencyDisplayNormalizer';

const AuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'owner-register'>('login');
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const handleHashChange = () => {
      setAuthMode(window.location.hash.slice(1) === 'owner-register' ? 'owner-register' : 'login');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleModeChange = (mode: 'login' | 'register' | 'owner-register') => {
    setAuthMode(mode);
    window.location.hash = mode === 'owner-register' ? 'owner-register' : '';
  };

  if (showIntro) {
    return <AnimatedIntro onComplete={() => setShowIntro(false)} />;
  }

  switch (authMode) {
    case 'register':
      return <RegisterForm onToggleMode={() => handleModeChange('login')} />;
    case 'owner-register':
      return <OwnerRegistrationForm onToggleMode={() => handleModeChange('login')} />;
    default:
      return <LoginForm onToggleMode={() => handleModeChange('register')} />;
  }
};

const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <MainLayout /> : <AuthPage />;
};

const App: React.FC = () => (
  <AuthProvider>
    <NotificationProvider>
      <GlobalNotifications />
      <CurrencyDisplayNormalizer />
      <DialogProvider>
        <MainApp />
      </DialogProvider>
    </NotificationProvider>
  </AuthProvider>
);

export default App;
