'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ReportsPage() {
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

  const reports = [
    { title: 'Patrimônio', description: 'Visão geral do seu patrimônio', icon: '🏛️', href: '/reports/patrimony' },
    { title: 'Fluxo de Caixa', description: 'Análise de entradas e saídas', icon: '💰', href: '/reports/cashflow' },
    { title: 'Despesas', description: 'Detalhamento de despesas', icon: '📉', href: '/reports/expenses' },
    { title: 'Receitas', description: 'Detalhamento de receitas', icon: '📈', href: '/reports/income' },
    { title: 'Centro de Custos', description: 'Análise por centro de custo', icon: '🏢', href: '/reports/cost-centers' },
    { title: 'Centro de Receitas', description: 'Análise por centro de receita', icon: '🎯', href: '/reports/income-centers' },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>Relatórios</h1>
          <p style={{ color: '#64748b', marginTop: '8px' }}>Selecione um tipo de relatório para visualizar</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {reports.map((report) => (
            <Link
              key={report.href}
              href={report.href}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textDecoration: 'none',
                display: 'block',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{report.icon}</div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                {report.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>{report.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
