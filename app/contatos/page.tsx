'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../components/DashboardLayout';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  isCustomer: boolean;
  isSupplier: boolean;
  notes: string | null;
  isActive: boolean;
  _count?: { transactions: number };
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function ContatosPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<'contacts' | 'categories' | 'custom'>('contacts');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    isCustomer: true,
    isSupplier: false,
    notes: '',
  });

  useEffect(() => {
    fetchContacts();
    fetchCategories();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.taxId?.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingContact ? `/api/contacts/${editingContact.id}` : '/api/contacts';
      const method = editingContact ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: formData.email || null,
          phone: formData.phone || null,
          taxId: formData.taxId || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          postalCode: formData.postalCode || null,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingContact(null);
        resetForm();
        fetchContacts();
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;

    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      taxId: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      isCustomer: true,
      isSupplier: false,
      notes: '',
    });
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      taxId: contact.taxId || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      postalCode: contact.postalCode || '',
      isCustomer: contact.isCustomer,
      isSupplier: contact.isSupplier,
      notes: contact.notes || '',
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingContact(null);
    resetForm();
    setShowModal(true);
  };

  // Get unique category names used by contacts (simplified - in real app, contacts would have category relation)
  const contactCategories = [...new Set(contacts.map(() => 'Geral'))];

  const styles = {
    container: { padding: '24px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1f2937' },
    content: { display: 'flex', gap: '24px' },
    sidebar: { width: '280px', flexShrink: 0 },
    sidebarCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    sidebarItem: (active: boolean) => ({
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', cursor: 'pointer',
      backgroundColor: active ? '#f0fdf4' : 'transparent',
      borderLeft: active ? '3px solid #10b981' : '3px solid transparent',
    }),
    sidebarIcon: { marginRight: '8px' },
    sidebarCount: { fontSize: '12px', color: '#6b7280' },
    main: { flex: 1 },
    toolbar: {
      display: 'flex', alignItems: 'center', gap: '16px',
      marginBottom: '16px',
    },
    searchInput: {
      padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
      fontSize: '14px', flex: 1,
    },
    exportButton: {
      padding: '10px 16px', border: '1px solid #1f2937', borderRadius: '8px',
      backgroundColor: 'white', color: '#1f2937', cursor: 'pointer', fontWeight: '500',
    },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    contactItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 20px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
    },
    contactName: { fontWeight: '500', color: '#1f2937' },
    contactCategory: { fontSize: '14px', color: '#6b7280' },
    contactTaxId: { fontSize: '12px', color: '#9ca3af', marginLeft: '16px' },
    fab: {
      position: 'fixed' as const, bottom: '24px', right: '24px',
      width: '56px', height: '56px', borderRadius: '50%',
      backgroundColor: '#10b981', color: 'white', border: 'none',
      cursor: 'pointer', fontSize: '24px',
      boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
    },
    modal: {
      position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    },
    modalContent: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    modalTitle: { fontSize: '18px', fontWeight: '600' },
    closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' },
    formRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
    formGroup: { marginBottom: '16px', flex: 1 },
    label: { display: 'block', marginBottom: '4px', fontSize: '14px', color: '#374151', fontWeight: '500' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', minHeight: '80px', resize: 'vertical' as const },
    checkboxGroup: { display: 'flex', gap: '24px', marginBottom: '16px' },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
    submitButton: { width: '100%', padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <p>Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Contatos</h1>
        </div>

        <div style={styles.content}>
          {/* Sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarCard}>
              <div
                style={styles.sidebarItem(activeSection === 'contacts')}
                onClick={() => setActiveSection('contacts')}
              >
                <span>
                  <span style={{ ...styles.sidebarIcon, color: '#10b981' }}>👤</span>
                  Contatos
                </span>
                <span style={styles.sidebarCount}>({contacts.length})</span>
              </div>
              <div
                style={styles.sidebarItem(activeSection === 'categories')}
                onClick={() => setActiveSection('categories')}
              >
                <span>
                  <span style={styles.sidebarIcon}>📁</span>
                  Categorias
                </span>
                <span style={styles.sidebarCount}>({categories.length})</span>
              </div>
              <div
                style={styles.sidebarItem(activeSection === 'custom')}
                onClick={() => setActiveSection('custom')}
              >
                <span>
                  <span style={styles.sidebarIcon}>⚙️</span>
                  Campos personalizados
                </span>
                <span style={styles.sidebarCount}>(0)</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={styles.main}>
            <div style={styles.toolbar}>
              <span style={{ fontWeight: '500' }}>Filtrar</span>
              <input
                type="text"
                placeholder="Buscar contatos"
                style={styles.searchInput}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button style={styles.exportButton}>
                Exportar contatos
              </button>
            </div>

            <div style={styles.card}>
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  style={styles.contactItem}
                  onClick={() => openEditModal(contact)}
                >
                  <div>
                    <div style={styles.contactName}>{contact.name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={styles.contactCategory}>
                      {contact.isCustomer && contact.isSupplier
                        ? 'Cliente/Fornecedor'
                        : contact.isCustomer
                          ? 'Cliente'
                          : contact.isSupplier
                            ? 'Fornecedor'
                            : 'Geral'}
                    </span>
                    {contact.taxId && (
                      <span style={styles.contactTaxId}>{contact.taxId}</span>
                    )}
                  </div>
                </div>
              ))}

              {filteredContacts.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                  Nenhum contato encontrado
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAB */}
        <button style={styles.fab} onClick={openCreateModal}>+</button>

        {/* Modal */}
        {showModal && (
          <div style={styles.modal} onClick={() => setShowModal(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingContact ? 'Editar Contato' : 'Novo Contato'}
                </h2>
                <button style={styles.closeButton} onClick={() => setShowModal(false)}>×</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isCustomer}
                      onChange={e => setFormData({ ...formData, isCustomer: e.target.checked })}
                    />
                    Cliente
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isSupplier}
                      onChange={e => setFormData({ ...formData, isSupplier: e.target.checked })}
                    />
                    Fornecedor
                  </label>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>E-mail</label>
                    <input
                      type="email"
                      style={styles.input}
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Telefone</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>CPF/CNPJ</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.taxId}
                    onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Endereço</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Cidade</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, maxWidth: '100px' }}>
                    <label style={styles.label}>UF</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={formData.state}
                      onChange={e => setFormData({ ...formData, state: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>CEP</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={formData.postalCode}
                      onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Observações</label>
                  <textarea
                    style={styles.textarea}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingContact && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingContact.id)}
                      style={{ ...styles.submitButton, backgroundColor: '#ef4444', flex: 1 }}
                    >
                      Excluir
                    </button>
                  )}
                  <button type="submit" style={{ ...styles.submitButton, flex: 1 }}>
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
