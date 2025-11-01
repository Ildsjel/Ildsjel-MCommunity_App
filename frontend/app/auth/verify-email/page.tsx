'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Kein Verifikations-Token gefunden.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(response.data.message || 'E-Mail erfolgreich verifiziert!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.detail || 
          'Verifikation fehlgeschlagen. Token ungültig oder abgelaufen.'
        );
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-red-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-2xl p-8 border border-red-800">
        <h1 className="text-3xl font-bold text-center mb-6 text-red-500">
          E-Mail Verifikation
        </h1>

        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Verifiziere E-Mail...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <p className="text-gray-300 mb-4">{message}</p>
            <p className="text-sm text-gray-400">
              Du wirst in Kürze zum Login weitergeleitet...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <p className="text-gray-300 mb-4">{message}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
            >
              Zum Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

