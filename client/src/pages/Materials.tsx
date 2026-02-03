import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  Plus, 
  Edit2, 
  X, 
  Search,
  Filter,
  Package,
  Beaker,
  AlertTriangle,
  Atom,
  Trash2,
  Building2,
  Box,
  Layers,
  FlaskConical,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, EmptyState } from '../components/shared';
import AttachmentPanel from '../components/AttachmentPanel';

const CATEGORIES = [
  { value: 'RAW_MATERIAL', label: 'Raw Material' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'REAGENT', label: 'Reagent' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'RADIOISOTOPE', label: 'Radioisotope' },
  { value: 'TARGET_MATERIAL', label: 'Target Material' },
  { value: 'SOLVENT', label: 'Solvent' },
  { value: 'BUFFER', label: 'Buffer' },
  { value: 'FILTER', label: 'Filter' },
  { value: 'CONTAINER', label: 'Container' },
  { value: 'EXCIPIENT', label: 'Excipient' },
  { value: 'REFERENCE_STANDARD', label: 'Reference Standard' },
];

const STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: 'var(--success)' },
  { value: 'INACTIVE', label: 'Inactive', color: 'var(--text-muted)' },
  { value: 'DISCONTINUED', label: 'Discontinued', color: 'var(--error)' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'var(--warning)' },
];

const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; color: string }> = {
    RAW_MATERIAL: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
    CONSUMABLE: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
    REAGENT: { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' },
    PACKAGING: { bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' },
    RADIOISOTOPE: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
    TARGET_MATERIAL: { bg: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' },
    SOLVENT: { bg: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' },
    BUFFER: { bg: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' },
    FILTER: { bg: 'rgba(132, 204, 22, 0.1)', color: '#84cc16' },
    CONTAINER: { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308' },
    EXCIPIENT: { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' },
    REFERENCE_STANDARD: { bg: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' },
  };
  return colors[category] || { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' };
};

export default function Materials() {
  const [showModal, setShowModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [detailMaterial, setDetailMaterial] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', categoryFilter, statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      const { data } = await api.get(`/materials?${params.toString()}`);
      return data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data } = await api.get('/suppliers');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedMaterial) {
        return api.put(`/materials/${selectedMaterial.id}`, data);
      }
      return api.post('/materials', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setShowModal(false);
      setSelectedMaterial(null);
      toast.success(selectedMaterial ? 'Material Updated' : 'Material Created', 
        selectedMaterial ? 'Material details have been updated' : 'New material has been added');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to save material');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material Deleted', 'Material has been removed');
      if (detailMaterial?.id === selectedMaterial?.id) {
        setDetailMaterial(null);
      }
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to delete material');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      code: formData.get('code'),
      name: formData.get('name'),
      nameAr: formData.get('nameAr') || null,
      category: formData.get('category'),
      description: formData.get('description') || null,
      unit: formData.get('unit'),
      reorderPoint: parseFloat(formData.get('reorderPoint') as string) || 0,
      reorderQty: parseFloat(formData.get('reorderQty') as string) || 0,
      leadTimeDays: parseInt(formData.get('leadTimeDays') as string) || 0,
      supplierId: formData.get('supplierId') || null,
      status: formData.get('status'),
      storageConditions: formData.get('storageConditions') || null,
      shelfLifeDays: parseInt(formData.get('shelfLifeDays') as string) || null,
      hazardClass: formData.get('hazardClass') || null,
      isRadioactive: formData.get('isRadioactive') === 'true',
    });
  };

  const activeCount = materials?.filter((m: any) => m.status === 'ACTIVE').length || 0;
  const lowStockCount = materials?.filter((m: any) => 
    m._count?.stock > 0 && m.reorderPoint > 0 && m._count?.stock <= m.reorderPoint
  ).length || 0;
  const radioactiveCount = materials?.filter((m: any) => m.isRadioactive).length || 0;

  const filteredMaterials = materials || [];

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1>Materials</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage raw materials, consumables, and reagents
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedMaterial(null); setShowModal(true); }}>
          <Plus size={16} /> Add Material
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Materials" 
          value={materials?.length || 0} 
          icon={<Package size={24} />}
          color="primary"
        />
        <KpiCard 
          title="Active" 
          value={activeCount} 
          icon={<Beaker size={24} />}
          color="success"
        />
        <KpiCard 
          title="Low Stock" 
          value={lowStockCount} 
          icon={<AlertTriangle size={24} />}
          color="warning"
        />
        <KpiCard 
          title="Radioactive" 
          value={radioactiveCount} 
          icon={<Atom size={24} />}
          color="danger"
        />
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ minWidth: '150px' }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: '120px' }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: detailMaterial ? '1fr 380px' : '1fr', gap: '1.5rem' }}>
        <div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredMaterials.map((material: any) => {
              const categoryStyle = getCategoryColor(material.category);
              const isSelected = detailMaterial?.id === material.id;
              const statusObj = STATUSES.find(s => s.value === material.status);
              return (
                <div 
                  key={material.id} 
                  className="card" 
                  style={{ 
                    padding: '1.25rem', 
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setDetailMaterial(material)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span 
                      className="badge"
                      style={{ 
                        background: categoryStyle.bg, 
                        color: categoryStyle.color,
                        fontWeight: 600,
                      }}
                    >
                      {CATEGORIES.find(c => c.value === material.category)?.label || material.category}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMaterial(material);
                        setShowModal(true);
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  
                  <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem' }}>{material.name}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <span style={{ fontFamily: 'monospace' }}>{material.code}</span>
                    {material.supplier?.name && ` • ${material.supplier.name}`}
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Box size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Unit: {material.unit}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Layers size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Reorder: {material.reorderPoint}</span>
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: '0.75rem', 
                    paddingTop: '0.75rem', 
                    borderTop: '1px solid var(--border)', 
                    fontSize: '0.75rem', 
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}>
                    <span 
                      className="badge" 
                      style={{ 
                        fontSize: '0.6875rem',
                        background: statusObj?.color === 'var(--success)' ? 'rgba(34, 197, 94, 0.1)' :
                                   statusObj?.color === 'var(--warning)' ? 'rgba(234, 179, 8, 0.1)' :
                                   statusObj?.color === 'var(--error)' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                        color: statusObj?.color || 'var(--text-muted)',
                      }}
                    >
                      {statusObj?.label || material.status}
                    </span>
                    {material.isRadioactive && (
                      <span className="badge" style={{ fontSize: '0.6875rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                        <Atom size={10} style={{ marginRight: '0.25rem' }} /> Radioactive
                      </span>
                    )}
                    {material._count?.recipeComponents > 0 && (
                      <span style={{ opacity: 0.7 }}>
                        Used in {material._count.recipeComponents} recipe{material._count.recipeComponents > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMaterials.length === 0 && (
            <div className="card" style={{ padding: '2rem' }}>
              <EmptyState 
                title="No materials found"
                message={searchQuery || categoryFilter || statusFilter ? 'Try adjusting your filters' : 'Add your first material to get started'}
                icon="package"
              />
            </div>
          )}
        </div>

        {detailMaterial && (
          <div className="card" style={{ padding: 0, height: 'fit-content', position: 'sticky', top: '1rem' }}>
            <div style={{ 
              padding: '1.25rem', 
              borderBottom: '1px solid var(--border)',
              background: getCategoryColor(detailMaterial.category).bg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span 
                    className="badge"
                    style={{ 
                      background: getCategoryColor(detailMaterial.category).color, 
                      color: 'white',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {CATEGORIES.find(c => c.value === detailMaterial.category)?.label || detailMaterial.category}
                  </span>
                  <h3 style={{ fontWeight: 600, fontSize: '1.125rem', margin: '0.5rem 0 0.25rem' }}>{detailMaterial.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                    {detailMaterial.code}
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setDetailMaterial(null)}
                  style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Material Properties
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Box size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Unit</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{detailMaterial.unit}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Package size={14} style={{ color: 'var(--warning)' }} />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Status</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{STATUSES.find(s => s.value === detailMaterial.status)?.label || detailMaterial.status}</div>
                  </div>
                  {detailMaterial.shelfLifeDays && (
                    <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                        <FlaskConical size={14} style={{ color: 'var(--success)' }} />
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Shelf Life</span>
                      </div>
                      <div style={{ fontWeight: 600 }}>{detailMaterial.shelfLifeDays} days</div>
                    </div>
                  )}
                  {detailMaterial.leadTimeDays > 0 && (
                    <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                        <Building2 size={14} style={{ color: 'var(--info)' }} />
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Lead Time</span>
                      </div>
                      <div style={{ fontWeight: 600 }}>{detailMaterial.leadTimeDays} days</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Inventory Details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.8125rem' }}>Reorder Point</span>
                    <span style={{ fontWeight: 600 }}>{detailMaterial.reorderPoint} {detailMaterial.unit}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.8125rem' }}>Reorder Qty</span>
                    <span style={{ fontWeight: 600 }}>{detailMaterial.reorderQty} {detailMaterial.unit}</span>
                  </div>
                </div>
              </div>

              {detailMaterial.supplier && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Preferred Supplier
                  </div>
                  <div style={{ 
                    padding: '0.75rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <Building2 size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 500 }}>{detailMaterial.supplier.name}</span>
                  </div>
                </div>
              )}

              {detailMaterial.storageConditions && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Storage Conditions
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {detailMaterial.storageConditions}
                  </p>
                </div>
              )}

              {detailMaterial.isRadioactive && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ 
                    padding: '0.75rem', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--error)',
                  }}>
                    <Atom size={16} />
                    <span style={{ fontWeight: 500 }}>Radioactive Material</span>
                    {detailMaterial.hazardClass && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>Class: {detailMaterial.hazardClass}</span>
                    )}
                  </div>
                </div>
              )}

              {detailMaterial._count?.recipeComponents > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Used In Recipes
                  </div>
                  <div style={{ 
                    padding: '0.75rem', 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    borderRadius: 'var(--radius)',
                    color: 'var(--primary)',
                    fontWeight: 500,
                  }}>
                    {detailMaterial._count.recipeComponents} recipe{detailMaterial._count.recipeComponents > 1 ? 's' : ''}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <AttachmentPanel
                  entityType="Material"
                  entityId={detailMaterial.id}
                  title="Material Documents"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedMaterial(detailMaterial);
                    setShowModal(true);
                  }}
                >
                  <Edit2 size={16} /> Edit Material
                </button>
                {detailMaterial._count?.recipeComponents === 0 && (
                  <button
                    className="btn btn-secondary"
                    style={{ color: 'var(--error)' }}
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this material?')) {
                        deleteMutation.mutate(detailMaterial.id);
                        setDetailMaterial(null);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setSelectedMaterial(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>{selectedMaterial ? 'Edit Material' : 'Add Material'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowModal(false); setSelectedMaterial(null); }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Code *</label>
                    <input name="code" defaultValue={selectedMaterial?.code || ''} required />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select name="category" defaultValue={selectedMaterial?.category || 'RAW_MATERIAL'} required>
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Name (English) *</label>
                    <input name="name" defaultValue={selectedMaterial?.name || ''} required />
                  </div>
                  <div className="form-group">
                    <label>Name (Arabic)</label>
                    <input name="nameAr" defaultValue={selectedMaterial?.nameAr || ''} dir="rtl" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" defaultValue={selectedMaterial?.description || ''} rows={2} />
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Unit *</label>
                    <select name="unit" defaultValue={selectedMaterial?.unit || 'EA'} required>
                      <option value="EA">Each (EA)</option>
                      <option value="KG">Kilogram (KG)</option>
                      <option value="G">Gram (G)</option>
                      <option value="MG">Milligram (MG)</option>
                      <option value="L">Liter (L)</option>
                      <option value="ML">Milliliter (ML)</option>
                      <option value="M">Meter (M)</option>
                      <option value="CM">Centimeter (CM)</option>
                      <option value="PC">Piece (PC)</option>
                      <option value="BOX">Box</option>
                      <option value="VIAL">Vial</option>
                      <option value="AMPOULE">Ampoule</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" defaultValue={selectedMaterial?.status || 'ACTIVE'}>
                      {STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Preferred Supplier</label>
                    <select name="supplierId" defaultValue={selectedMaterial?.supplierId || ''}>
                      <option value="">Select Supplier</option>
                      {suppliers?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Reorder Point</label>
                    <input name="reorderPoint" type="number" step="0.01" defaultValue={selectedMaterial?.reorderPoint || 0} />
                  </div>
                  <div className="form-group">
                    <label>Reorder Qty</label>
                    <input name="reorderQty" type="number" step="0.01" defaultValue={selectedMaterial?.reorderQty || 0} />
                  </div>
                  <div className="form-group">
                    <label>Lead Time (days)</label>
                    <input name="leadTimeDays" type="number" defaultValue={selectedMaterial?.leadTimeDays || 0} />
                  </div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Storage Conditions</label>
                    <input name="storageConditions" defaultValue={selectedMaterial?.storageConditions || ''} placeholder="e.g., 2-8°C" />
                  </div>
                  <div className="form-group">
                    <label>Shelf Life (days)</label>
                    <input name="shelfLifeDays" type="number" defaultValue={selectedMaterial?.shelfLifeDays || ''} />
                  </div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Hazard Class</label>
                    <input name="hazardClass" defaultValue={selectedMaterial?.hazardClass || ''} placeholder="e.g., Class 7" />
                  </div>
                  <div className="form-group">
                    <label>Radioactive?</label>
                    <select name="isRadioactive" defaultValue={selectedMaterial?.isRadioactive ? 'true' : 'false'}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setSelectedMaterial(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : (selectedMaterial ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
