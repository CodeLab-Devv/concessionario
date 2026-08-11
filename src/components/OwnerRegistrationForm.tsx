import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface OwnerRegistrationFormProps {
  onToggleMode: () => void;
}

export const OwnerRegistrationForm: React.FC<OwnerRegistrationFormProps> = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    ownerKey: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerOwner } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    setLoading(true);
    try {
      const success = await registerOwner(
        formData.email,
        formData.password,
        formData.name
      );

      if (success) {
        // Show success message and redirect to login
        setError('');
        // Create a success state to show success message
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          ownerKey: ''
        });
        // You can add a success message state here if needed
        setTimeout(() => {
          onToggleMode();
        }, 1000);
      } else {
        setError('Errore durante la creazione dell\'account proprietario. Potrebbe già esistere un proprietario o i dati sono incorretti.');
      }
    } catch {
      setError('Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="app-viewport bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Registrazione Proprietario
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Crea un account con privilegi di proprietario
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Nome completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 text-base border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Nome completo"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 text-base border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Indirizzo email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 text-base border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Conferma Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 text-base border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Conferma password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="ownerKey" className="sr-only">
                Chiave Proprietario (opzionale)
              </label>
              <input
                id="ownerKey"
                name="ownerKey"
                type="password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 text-base border border-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Chiave proprietario (opzionale)"
                value={formData.ownerKey}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Registrazione...' : 'Registra Proprietario'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              Torna al login normale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
