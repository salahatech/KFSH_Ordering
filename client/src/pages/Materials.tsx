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
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, EmptyState } from '../components/shared';

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

export default function Materials() {
  const [showModal, setShowModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
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
      description: formData.get('description') || null,
      category: formData.get('category'),
      unit: formData.get('unit'),
      minStockLevel: parseFloat(formData.get('minStockLevel') as string) || 0,
      reorderPoint: parseFloat(formData.get('reorderPoint') as string) || 0,
      reorderQuantity: parseFloat(formData.get('reorderQuantity') as string) || 0,
      leadTimeDays: parseInt(formData.get('leadTimeDays') as string) || 7,
      shelfLifeDays: parseInt(formData.get('shelfLifeDays') as string) || null,
      storageConditions: formData.get('storageConditions') || null,
      handlingInstructions: formData.get('handlingInstructions') || null,
      hazardClass: formData.get('hazardClass') || null,
      casNumber: formData.get('casNumber') || null,
      supplierId: formData.get('supplierId') || null,
      unitCost: parseFloat(formData.get('unitCost') as string) || null,
      currency: formData.get('currency') || 'SAR',
      status: formData.get('status') || 'ACTIVE',
      requiresQC: formData.get('requiresQC') === 'on',
      isRadioactive: formData.get('isRadioactive') === 'on',
      halfLifeMinutes: parseFloat(formData.get('halfLifeMinutes') as string) || null,
    });
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getStatusStyle = (status: string) => {
    const s = STATUSES.find(s => s.value === status);
    return { color: s?.color || 'var(--text-muted)' };
  };

  const activeMaterials = materials?.filter((m: any) => m.status === 'ACTIVE').length || 0;
  const radioactiveMaterials = materials?.filter((m: any) => m.isRadioactive).length || 0;
  const lowStockMaterials = 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Materials</h1>
          <p className="text-muted">Manage raw materials, reagents, and consumables</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Add Material
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Materials" 
          value={materials?.length || 0} 
          icon={<Package size={24} />}
          color="primary"
        />
        <KpiCard 
          title="Active" 
          value={activeMaterials} 
          icon={<Beaker size={24} />}
          color="success"
        />
        <KpiCard 
          title="Radioactive" 
          value={radioactiveMaterials} 
          icon={<Atom size={24} />}
          color="warning"
        />
        <KpiCard 
          title="Low Stock" 
          value={lowStockMaterials} 
          icon={<AlertTriangle size={24} />}
          color="danger"
        />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-select"
              style={{ minWidth: '150px' }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ minWidth: '130px' }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="loading-spinner" style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>
        ) : materials?.length === 0 ? (
          <EmptyState 
            icon="package"
            title="No Materials Found"
            message={searchQuery || categoryFilter || statusFilter 
              ? "No materials match your search criteria" 
              : "Get started by adding your first material"}
            ctaLabel={!searchQuery && !categoryFilter && !statusFilter ? "Add Material" : undefined}
            onCta={!searchQuery && !categoryFilter && !statusFilter ? () => setShowModal(true) : undefined}
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Supplier</th>
                  <th>Used In</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials?.map((material: any) => (
                  <tr key={material.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ fontWeight: 600 }}>{material.code}</code>
                        {material.isRadioactive && (
                          <span title="Radioactive"><Atom size={14} style={{ color: 'var(--warning)' }} /></span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{material.name}</div>
                        {material.nameAr && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', direction: 'rtl' }}>
                            {material.nameAr}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                        {getCategoryLabel(material.category)}
                      </span>
                    </td>
                    <td>{material.unit}</td>
                    <td>
                      <span className="badge" style={{ 
                        background: `${getStatusStyle(material.status).color}20`,
                        color: getStatusStyle(material.status).color,
                      }}>
                        {STATUSES.find(s => s.value === material.status)?.label || material.status}
                      </span>
                    </td>
                    <td>
                      {material.supplier ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                          {material.supplier.name}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: material._count?.recipeComponents > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {material._count?.recipeComponents || 0} recipes
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedMaterial(material);
                            setShowModal(true);
                          }}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        {material._count?.recipeComponents === 0 && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this material?')) {
                                deleteMutation.mutate(material.id);
                              }
                            }}
                            title="Delete"
                            style={{ color: 'var(--error)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setSelectedMaterial(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>{selectedMaterial ? 'Edit Material' : 'Add Material'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowModal(false); setSelectedMaterial(null); }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Material Code *</label>
                    <input
                      type="text"
                      name="code"
                      className="form-input"
                      defaultValue={selectedMaterial?.code || ''}
                      required
                      placeholder="e.g., MAT-001"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select name="category" className="form-select" defaultValue={selectedMaterial?.category || 'RAW_MATERIAL'} required>
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Name (English) *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-input"
                      defaultValue={selectedMaterial?.name || ''}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name (Arabic)</label>
                    <input
                      type="text"
                      name="nameAr"
                      className="form-input"
                      defaultValue={selectedMaterial?.nameAr || ''}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-input"
                    rows={2}
                    defaultValue={selectedMaterial?.description || ''}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Unit *</label>
                    <input
                      type="text"
                      name="unit"
                      className="form-input"
                      defaultValue={selectedMaterial?.unit || ''}
                      required
                      placeholder="e.g., mL, g, pcs"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select name="status" className="form-select" defaultValue={selectedMaterial?.status || 'ACTIVE'}>
                      {STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supplier</label>
                    <select name="supplierId" className="form-select" defaultValue={selectedMaterial?.supplierId || ''}>
                      <option value="">Select Supplier</option>
                      {suppliers?.map((sup: any) => (
                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Min Stock Level</label>
                    <input
                      type="number"
                      name="minStockLevel"
                      className="form-input"
                      defaultValue={selectedMaterial?.minStockLevel || 0}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Point</label>
                    <input
                      type="number"
                      name="reorderPoint"
                      className="form-input"
                      defaultValue={selectedMaterial?.reorderPoint || 0}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Qty</label>
                    <input
                      type="number"
                      name="reorderQuantity"
                      className="form-input"
                      defaultValue={selectedMaterial?.reorderQuantity || 0}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lead Time (days)</label>
                    <input
                      type="number"
                      name="leadTimeDays"
                      className="form-input"
                      defaultValue={selectedMaterial?.leadTimeDays || 7}
                      min="0"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Shelf Life (days)</label>
                    <input
                      type="number"
                      name="shelfLifeDays"
                      className="form-input"
                      defaultValue={selectedMaterial?.shelfLifeDays || ''}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Cost</label>
                    <input
                      type="number"
                      name="unitCost"
                      className="form-input"
                      defaultValue={selectedMaterial?.unitCost || ''}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select name="currency" className="form-select" defaultValue={selectedMaterial?.currency || 'SAR'}>
                      <option value="SAR">SAR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Storage Conditions</label>
                    <input
                      type="text"
                      name="storageConditions"
                      className="form-input"
                      defaultValue={selectedMaterial?.storageConditions || ''}
                      placeholder="e.g., 2-8°C, Room Temperature"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hazard Class</label>
                    <input
                      type="text"
                      name="hazardClass"
                      className="form-input"
                      defaultValue={selectedMaterial?.hazardClass || ''}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">CAS Number</label>
                  <input
                    type="text"
                    name="casNumber"
                    className="form-input"
                    defaultValue={selectedMaterial?.casNumber || ''}
                    placeholder="e.g., 7732-18-5"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Handling Instructions</label>
                  <textarea
                    name="handlingInstructions"
                    className="form-input"
                    rows={2}
                    defaultValue={selectedMaterial?.handlingInstructions || ''}
                  />
                </div>

                <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="requiresQC"
                      defaultChecked={selectedMaterial?.requiresQC || false}
                    />
                    Requires QC
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="isRadioactive"
                      defaultChecked={selectedMaterial?.isRadioactive || false}
                    />
                    <Atom size={16} style={{ color: 'var(--warning)' }} />
                    Radioactive Material
                  </label>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Half-Life (minutes) - for radioactive materials</label>
                  <input
                    type="number"
                    name="halfLifeMinutes"
                    className="form-input"
                    defaultValue={selectedMaterial?.halfLifeMinutes || ''}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setSelectedMaterial(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : (selectedMaterial ? 'Update Material' : 'Create Material')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
