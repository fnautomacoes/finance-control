'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InvestmentsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = document.cookie.includes('token=');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) return null;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>Investimentos</h1>
          <button
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Novo Investimento
          </button>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
            Módulo em Desenvolvimento
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            O módulo de investimentos estará disponível em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
