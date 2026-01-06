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
  categoryId: string | null;
  _count?: { transactions: number };
}

interface ContactCategory {
  id: string;
  name: string;
  _count?: { contacts: number };
}

interface CustomField {
  id: string;
  name: string;
  fieldType: string;
  entityType: string;
}

type ActiveSection = 'contacts' | 'categories' | 'custom';

export default function ContatosPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactCategories, setContactCategories] = useState<ContactCategory[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<ActiveSection>('contacts');

  // Contact Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactFormData, setContactFormData] = useState({
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
    categoryId: '',
  });

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ContactCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '' });

  // Custom Field Modal
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [editingCustomField, setEditingCustomField] = useState<CustomField | null>(null);
  const [customFieldFormData, setCustomFieldFormData] = useState({ name: '' });

  useEffect(() => {
    fetchContacts();
    fetchCategories();
    fetchCustomFields();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/contact-categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setContactCategories(data);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const res = await fetch('/api/custom-fields?entityType=contact');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCustomFields(data);
        }
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.taxId?.includes(searchTerm)
  );

  // Contact handlers
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingContact ? `/api/contacts/${editingContact.id}` : '/api/contacts';
      const method = editingContact ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactFormData,
          email: contactFormData.email || null,
          phone: contactFormData.phone || null,
          taxId: contactFormData.taxId || null,
          address: contactFormData.address || null,
          city: contactFormData.city || null,
          state: contactFormData.state || null,
          postalCode: contactFormData.postalCode || null,
          notes: contactFormData.notes || null,
          categoryId: contactFormData.categoryId || null,
        }),
      });

      if (res.ok) {
        setShowContactModal(false);
        setEditingContact(null);
        resetContactForm();
        fetchContacts();
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const handleContactDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const resetContactForm = () => {
    setContactFormData({
      name: '', email: '', phone: '', taxId: '', address: '', city: '',
      state: '', postalCode: '', isCustomer: true, isSupplier: false, notes: '', categoryId: '',
    });
  };

  const openEditContactModal = (contact: Contact) => {
    setEditingContact(contact);
    setContactFormData({
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
      categoryId: contact.categoryId || '',
    });
    setShowContactModal(true);
  };

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory ? `/api/contact-categories/${editingCategory.id}` : '/api/contact-categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData),
      });

      if (res.ok) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCategoryFormData({ name: '' });
        fetchCategories();
      }
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await fetch(`/api/contact-categories/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const openEditCategoryModal = (category: ContactCategory) => {
    setEditingCategory(category);
    setCategoryFormData({ name: category.name });
    setShowCategoryModal(true);
  };

  // Custom Field handlers
  const handleCustomFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCustomField ? `/api/custom-fields/${editingCustomField.id}` : '/api/custom-fields';
      const method = editingCustomField ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...customFieldFormData, entityType: 'contact' }),
      });

      if (res.ok) {
        setShowCustomFieldModal(false);
        setEditingCustomField(null);
        setCustomFieldFormData({ name: '' });
        fetchCustomFields();
      }
    } catch (error) {
      console.error('Error saving custom field:', error);
    }
  };

  const handleCustomFieldDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este campo?')) return;
    try {
      await fetch(`/api/custom-fields/${id}`, { method: 'DELETE' });
      fetchCustomFields();
    } catch (error) {
      console.error('Error deleting custom field:', error);
    }
  };

  const openEditCustomFieldModal = (field: CustomField) => {
    setEditingCustomField(field);
    setCustomFieldFormData({ name: field.name });
    setShowCustomFieldModal(true);
  };

  const openCreateModal = () => {
    if (activeSection === 'contacts') {
      setEditingContact(null);
      resetContactForm();
      setShowContactModal(true);
    } else if (activeSection === 'categories') {
      setEditingCategory(null);
      setCategoryFormData({ name: '' });
      setShowCategoryModal(true);
    } else {
      setEditingCustomField(null);
      setCustomFieldFormData({ name: '' });
      setShowCustomFieldModal(true);
    }
  };

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
      color: active ? '#10b981' : '#1f2937',
    }),
    sidebarIcon: { marginRight: '8px' },
    sidebarCount: { fontSize: '12px', color: '#6b7280' },
    main: { flex: 1 },
    toolbar: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' },
    searchInput: {
      padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
      fontSize: '14px', flex: 1,
    },
    exportButton: {
      padding: '10px 16px', border: '1px solid #1f2937', borderRadius: '8px',
      backgroundColor: 'white', color: '#1f2937', cursor: 'pointer', fontWeight: '500',
    },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    listItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 20px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
    },
    itemName: { fontWeight: '500', color: '#1f2937' },
    itemActions: { display: 'flex', gap: '8px' },
    actionIcon: { cursor: 'pointer', padding: '4px', color: '#9ca3af' },
    emptyState: {
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', color: '#9ca3af',
    },
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
    select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white' },
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
                  <span style={styles.sidebarIcon}>👤</span>
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
                <span style={styles.sidebarCount}>({contactCategories.length})</span>
              </div>
              <div
                style={styles.sidebarItem(activeSection === 'custom')}
                onClick={() => setActiveSection('custom')}
              >
                <span>
                  <span style={styles.sidebarIcon}>⚙️</span>
                  Campos personalizados
                </span>
                <span style={styles.sidebarCount}>({customFields.length})</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={styles.main}>
            {activeSection === 'contacts' && (
              <>
                <div style={styles.toolbar}>
                  <span style={{ fontWeight: '500' }}>Filtrar</span>
                  <input
                    type="text"
                    placeholder="Buscar contatos"
                    style={styles.searchInput}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <button style={styles.exportButton}>Exportar contatos</button>
                </div>

                <div style={styles.card}>
                  {filteredContacts.map(contact => (
                    <div key={contact.id} style={styles.listItem} onClick={() => openEditContactModal(contact)}>
                      <div>
                        <div style={styles.itemName}>{contact.name}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>
                          {contact.isCustomer && contact.isSupplier
                            ? 'Cliente/Fornecedor'
                            : contact.isCustomer
                              ? 'Cliente'
                              : contact.isSupplier
                                ? 'Fornecedor'
                                : 'Geral'}
                        </span>
                        {contact.taxId && (
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{contact.taxId}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredContacts.length === 0 && (
                    <div style={styles.emptyState}>
                      <p>Nenhum contato encontrado</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeSection === 'categories' && (
              <div style={styles.card}>
                {contactCategories.map(category => (
                  <div key={category.id} style={styles.listItem}>
                    <span style={styles.itemName}>{category.name}</span>
                    <div style={styles.itemActions}>
                      <span style={styles.actionIcon} onClick={() => openEditCategoryModal(category)}>✏️</span>
                      <span style={styles.actionIcon} onClick={() => handleCategoryDelete(category.id)}>🗑️</span>
                    </div>
                  </div>
                ))}

                {contactCategories.length === 0 && (
                  <div style={styles.emptyState}>
                    <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>⚠️</div>
                    <p>Sem categorias cadastradas</p>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'custom' && (
              <div style={styles.card}>
                {customFields.map(field => (
                  <div key={field.id} style={styles.listItem}>
                    <span style={styles.itemName}>{field.name}</span>
                    <div style={styles.itemActions}>
                      <span style={styles.actionIcon} onClick={() => openEditCustomFieldModal(field)}>✏️</span>
                      <span style={styles.actionIcon} onClick={() => handleCustomFieldDelete(field.id)}>🗑️</span>
                    </div>
                  </div>
                ))}

                {customFields.length === 0 && (
                  <div style={styles.emptyState}>
                    <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>⚠️</div>
                    <p>Sem campos personalizados cadastrados</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FAB */}
        <button style={styles.fab} onClick={openCreateModal}>+</button>

        {/* Contact Modal */}
        {showContactModal && (
          <div style={styles.modal} onClick={() => setShowContactModal(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingContact ? 'Editar Contato' : 'Novo Contato'}
                </h2>
                <button style={styles.closeButton} onClick={() => setShowContactModal(false)}>×</button>
              </div>

              <form onSubmit={handleContactSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={contactFormData.name}
                    onChange={e => setContactFormData({ ...contactFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={contactFormData.isCustomer}
                      onChange={e => setContactFormData({ ...contactFormData, isCustomer: e.target.checked })}
                    />
                    Cliente
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={contactFormData.isSupplier}
                      onChange={e => setContactFormData({ ...contactFormData, isSupplier: e.target.checked })}
                    />
                    Fornecedor
                  </label>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Categoria</label>
                  <select
                    style={styles.select}
                    value={contactFormData.categoryId}
                    onChange={e => setContactFormData({ ...contactFormData, categoryId: e.target.value })}
                  >
                    <option value="">Nenhuma</option>
                    {contactCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>E-mail</label>
                    <input
                      type="email"
                      style={styles.input}
                      value={contactFormData.email}
                      onChange={e => setContactFormData({ ...contactFormData, email: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Telefone</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={contactFormData.phone}
                      onChange={e => setContactFormData({ ...contactFormData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>CPF/CNPJ</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={contactFormData.taxId}
                    onChange={e => setContactFormData({ ...contactFormData, taxId: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Endereço</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={contactFormData.address}
                    onChange={e => setContactFormData({ ...contactFormData, address: e.target.value })}
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Cidade</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={contactFormData.city}
                      onChange={e => setContactFormData({ ...contactFormData, city: e.target.value })}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, maxWidth: '100px' }}>
                    <label style={styles.label}>UF</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={contactFormData.state}
                      onChange={e => setContactFormData({ ...contactFormData, state: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>CEP</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={contactFormData.postalCode}
                      onChange={e => setContactFormData({ ...contactFormData, postalCode: e.target.value })}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Observações</label>
                  <textarea
                    style={styles.textarea}
                    value={contactFormData.notes}
                    onChange={e => setContactFormData({ ...contactFormData, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingContact && (
                    <button
                      type="button"
                      onClick={() => handleContactDelete(editingContact.id)}
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

        {/* Category Modal */}
        {showCategoryModal && (
          <div style={styles.modal} onClick={() => setShowCategoryModal(false)}>
            <div style={{ ...styles.modalContent, width: '400px' }} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <button style={styles.closeButton} onClick={() => setShowCategoryModal(false)}>×</button>
              </div>

              <form onSubmit={handleCategorySubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={categoryFormData.name}
                    onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => handleCategoryDelete(editingCategory.id)}
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

        {/* Custom Field Modal */}
        {showCustomFieldModal && (
          <div style={styles.modal} onClick={() => setShowCustomFieldModal(false)}>
            <div style={{ ...styles.modalContent, width: '400px' }} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingCustomField ? 'Editar Campo Personalizado' : 'Nova campo personalizado'}
                </h2>
                <button style={styles.closeButton} onClick={() => setShowCustomFieldModal(false)}>×</button>
              </div>

              <form onSubmit={handleCustomFieldSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={customFieldFormData.name}
                    onChange={e => setCustomFieldFormData({ ...customFieldFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingCustomField && (
                    <button
                      type="button"
                      onClick={() => handleCustomFieldDelete(editingCustomField.id)}
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
