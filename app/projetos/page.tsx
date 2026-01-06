'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../components/DashboardLayout';

interface Project {
  id: string;
  name: string;
  description: string | null;
  budget: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  color: string;
  isActive: boolean;
  isArchived: boolean;
  _count?: { transactions: number };
}

export default function ProjetosPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    currency: 'BRL',
    startDate: '',
    endDate: '',
    color: '#6366f1',
  });

  useEffect(() => {
    fetchProjects();
  }, [showArchived]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?includeArchived=${showArchived}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      } else {
        console.error('API returned non-array data:', data);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      const method = editingProject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          description: formData.description || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingProject(null);
        resetForm();
        fetchProjects();
      }
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;

    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleArchive = async (project: Project) => {
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !project.isArchived }),
      });
      fetchProjects();
    } catch (error) {
      console.error('Error archiving project:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      budget: '',
      currency: 'BRL',
      startDate: '',
      endDate: '',
      color: '#6366f1',
    });
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      budget: project.budget?.toString() || '',
      currency: project.currency,
      startDate: project.startDate?.split('T')[0] || '',
      endDate: project.endDate?.split('T')[0] || '',
      color: project.color,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingProject(null);
    resetForm();
    setShowModal(true);
  };

  const formatCurrency = (value: number | null, currency: string) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1f2937' },
    toolbar: {
      display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px',
    },
    toggleContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
    toggle: (active: boolean) => ({
      width: '44px', height: '24px', borderRadius: '12px',
      backgroundColor: active ? '#10b981' : '#d1d5db',
      position: 'relative' as const, cursor: 'pointer', border: 'none',
    }),
    toggleKnob: (active: boolean) => ({
      width: '20px', height: '20px', borderRadius: '50%',
      backgroundColor: 'white', position: 'absolute' as const,
      top: '2px', left: active ? '22px' : '2px',
      transition: 'left 0.2s',
    }),
    grid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px',
    },
    card: {
      backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden', cursor: 'pointer',
    },
    cardHeader: (color: string) => ({
      height: '8px', backgroundColor: color,
    }),
    cardContent: { padding: '20px' },
    cardTitle: { fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' },
    cardDescription: { fontSize: '14px', color: '#6b7280', marginBottom: '16px' },
    cardDetails: { display: 'flex', flexWrap: 'wrap' as const, gap: '16px', fontSize: '12px', color: '#6b7280' },
    detailItem: { display: 'flex', flexDirection: 'column' as const },
    detailLabel: { fontWeight: '500', color: '#9ca3af' },
    detailValue: { color: '#1f2937', fontWeight: '500' },
    badge: (archived: boolean) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
      backgroundColor: archived ? '#f3f4f6' : '#dcfce7',
      color: archived ? '#6b7280' : '#16a34a',
      marginLeft: '8px',
    }),
    emptyState: {
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px', color: '#9ca3af',
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
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', minHeight: '80px', resize: 'vertical' as const },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white' },
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
          <h1 style={styles.title}>Projetos</h1>
        </div>

        <div style={styles.toolbar}>
          <div style={styles.toggleContainer}>
            <button
              style={styles.toggle(showArchived)}
              onClick={() => setShowArchived(!showArchived)}
            >
              <div style={styles.toggleKnob(showArchived)} />
            </button>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Mostrar arquivados</span>
          </div>
        </div>

        {projects.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📁</div>
            <p>Nenhum projeto encontrado</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {projects.map(project => (
              <div key={project.id} style={styles.card} onClick={() => openEditModal(project)}>
                <div style={styles.cardHeader(project.color)} />
                <div style={styles.cardContent}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h3 style={styles.cardTitle}>{project.name}</h3>
                    {project.isArchived && <span style={styles.badge(true)}>Arquivado</span>}
                  </div>
                  {project.description && (
                    <p style={styles.cardDescription}>{project.description}</p>
                  )}
                  <div style={styles.cardDetails}>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Orçamento</span>
                      <span style={styles.detailValue}>{formatCurrency(project.budget, project.currency)}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Início</span>
                      <span style={styles.detailValue}>{formatDate(project.startDate)}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Término</span>
                      <span style={styles.detailValue}>{formatDate(project.endDate)}</span>
                    </div>
                    {project._count && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Transações</span>
                        <span style={styles.detailValue}>{project._count.transactions}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAB */}
        <button style={styles.fab} onClick={openCreateModal}>+</button>

        {/* Modal */}
        {showModal && (
          <div style={styles.modal} onClick={() => setShowModal(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
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

                <div style={styles.formGroup}>
                  <label style={styles.label}>Descrição</label>
                  <textarea
                    style={styles.textarea}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Orçamento</label>
                    <input
                      type="number"
                      step="0.01"
                      style={styles.input}
                      value={formData.budget}
                      onChange={e => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, maxWidth: '120px' }}>
                    <label style={styles.label}>Moeda</label>
                    <select
                      style={styles.select}
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    >
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Data de Início</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Data de Término</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Cor</label>
                  <input
                    type="color"
                    style={{ ...styles.input, height: '40px', padding: '4px' }}
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingProject && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleArchive(editingProject)}
                        style={{ ...styles.submitButton, backgroundColor: '#6b7280', flex: 1 }}
                      >
                        {editingProject.isArchived ? 'Desarquivar' : 'Arquivar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(editingProject.id)}
                        style={{ ...styles.submitButton, backgroundColor: '#ef4444', flex: 1 }}
                      >
                        Excluir
                      </button>
                    </>
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
