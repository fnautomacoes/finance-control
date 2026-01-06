'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SubMenuItem {
  label: string;
  href: string;
}

interface MenuItem {
  label: string;
  href?: string;
  icon: string;
  children?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { label: 'Visão geral', href: '/dashboard', icon: 'grid' },
  {
    label: 'Movimentações e caixa',
    icon: 'arrows',
    children: [
      { label: 'Lançamentos', href: '/lancamentos' },
      { label: 'Fluxo', href: '/cashflow' },
      { label: 'A pagar e receber', href: '/payables' },
      { label: 'Pagas e recebidas', href: '/paid' },
    ],
  },
  { label: 'Extrato de contas', href: '/statements', icon: 'list' },
  { label: 'Cartões de crédito', href: '/credit-cards', icon: 'card' },
  {
    label: 'Metas',
    icon: 'flag',
    children: [
      { label: 'Orçamento', href: '/budget' },
      { label: 'Centros', href: '/centros' },
      { label: 'Economia', href: '/savings' },
    ],
  },
  { label: 'Relatórios', href: '/reports', icon: 'chart' },
  { label: 'Investimentos', href: '/investments', icon: 'trending' },
  {
    label: 'Cadastros',
    icon: 'database',
    children: [
      { label: 'Categorias', href: '/categorias' },
      { label: 'Centros', href: '/centros' },
      { label: 'Contas', href: '/contas' },
      { label: 'Contatos', href: '/contatos' },
      { label: 'Formas de pagamento', href: '/formas-pagamento' },
      { label: 'Projetos', href: '/projetos' },
      { label: 'Tags', href: '/tags' },
    ],
  },
  { label: 'Documentos', href: '/documents', icon: 'paperclip' },
  { label: 'Regras de preenchimento', href: '/rules', icon: 'wand' },
  { label: 'Importar lançamentos', href: '/import', icon: 'upload' },
  { label: 'Fechamento posição', href: '/closing', icon: 'clock' },
  { label: 'Configurações', href: '/settings', icon: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([
    'Movimentações e caixa',
    'Metas',
    'Cadastros',
  ]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href;

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '256px',
        height: '100vh',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        overflowY: 'auto',
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#3b82f6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          $
        </div>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
          Finance Control
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '8px' }}>
        {menuItems.map((item) => (
          <div key={item.label} style={{ marginBottom: '4px' }}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleExpand(item.label)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <MenuIcon name={item.icon} />
                    {item.label}
                  </span>
                  <span
                    style={{
                      transform: expandedItems.includes(item.label) ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    ▼
                  </span>
                </button>
                {expandedItems.includes(item.label) && (
                  <div style={{ marginLeft: '32px', marginTop: '4px' }}>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        style={{
                          display: 'block',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: isActive(child.href) ? '#ffffff' : '#6b7280',
                          backgroundColor: isActive(child.href) ? '#3b82f6' : 'transparent',
                          textDecoration: 'none',
                          marginBottom: '2px',
                        }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.href!}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: isActive(item.href!) ? '#ffffff' : '#374151',
                  backgroundColor: isActive(item.href!) ? '#3b82f6' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                <MenuIcon name={item.icon} />
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function MenuIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    grid: '▦',
    arrows: '⇄',
    list: '☰',
    card: '▭',
    flag: '⚑',
    chart: '📊',
    trending: '📈',
    database: '⬡',
    paperclip: '📎',
    wand: '✨',
    upload: '↑',
    clock: '⏱',
    settings: '⚙',
  };

  return (
    <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>
      {icons[name] || '•'}
    </span>
  );
}
