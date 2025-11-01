'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/request-password-reset', { email });
      setMessage(response.data.message);
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-red-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-2xl p-8 border border-red-800">
        <h1 className="text-3xl font-bold text-center mb-6 text-red-500">
          Passwort zurücksetzen
        </h1>

        {message && (
          <div className="mb-4 p-4 bg-green-900/30 border border-green-500 rounded-md">
            <p className="text-green-400 text-sm">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-500 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="deine@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird gesendet...' : 'Reset-Link senden'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/auth/login')}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Zurück zum Login
          </button>
        </div>
      </div>
    </div>
  );
}

