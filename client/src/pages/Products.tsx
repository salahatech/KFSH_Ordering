import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  Plus, 
  Edit2, 
  Clock, 
  Beaker, 
  Package, 
  X, 
  Atom, 
  Activity,
  Timer,
  Zap,
  FlaskConical,
  Search,
  Filter,
  Paperclip,
} from 'lucide-react';
import AttachmentPanel from '../components/AttachmentPanel';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, EmptyState } from '../components/shared';

export default function Products() {
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedProduct) {
        return api.put(`/products/${selectedProduct.id}`, data);
      }
      return api.post('/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowModal(false);
      setSelectedProduct(null);
      toast.success(selectedProduct ? 'Product Updated' : 'Product Created', 
        selectedProduct ? 'Product details have been updated' : 'New product has been added');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to save product');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get('name'),
      code: formData.get('code'),
      productType: formData.get('productType'),
      radionuclide: formData.get('radionuclide'),
      halfLifeMinutes: parseFloat(formData.get('halfLifeMinutes') as string),
      shelfLifeMinutes: parseFloat(formData.get('shelfLifeMinutes') as string),
      standardDose: parseFloat(formData.get('standardDose') as string) || null,
      doseUnit: formData.get('doseUnit'),
      productionMethod: formData.get('productionMethod'),
      synthesisTimeMinutes: parseInt(formData.get('synthesisTimeMinutes') as string),
      qcTimeMinutes: parseInt(formData.get('qcTimeMinutes') as string),
      packagingTimeMinutes: parseInt(formData.get('packagingTimeMinutes') as string),
      overagePercent: parseFloat(formData.get('overagePercent') as string),
    });
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const filteredProducts = products?.filter((product: any) => {
    if (typeFilter && product.productType !== typeFilter) return false;
    if (methodFilter && product.productionMethod !== methodFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.code.toLowerCase().includes(query) ||
        product.radionuclide.toLowerCase().includes(query)
      );
    }
    return true;
  }) || [];

  const stats = {
    total: products?.length || 0,
    pet: products?.filter((p: any) => p.productType === 'PET').length || 0,
    spect: products?.filter((p: any) => p.productType === 'SPECT').length || 0,
    therapy: products?.filter((p: any) => p.productType === 'THERAPY').length || 0,
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PET': return { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' };
      case 'SPECT': return { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' };
      case 'THERAPY': return { bg: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)' };
      default: return { bg: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)' };
    }
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Product Catalog</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage radiopharmaceutical products with decay properties and production times
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Products" 
          value={stats.total} 
          icon={<Package size={20} />}
          color="primary"
          onClick={() => setTypeFilter('')}
          active={!typeFilter}
        />
        <KpiCard 
          title="PET Products" 
          value={stats.pet} 
          icon={<Atom size={20} />}
          color="info"
          onClick={() => setTypeFilter(typeFilter === 'PET' ? '' : 'PET')}
          active={typeFilter === 'PET'}
        />
        <KpiCard 
          title="SPECT Products" 
          value={stats.spect} 
          icon={<Activity size={20} />}
          color="success"
          onClick={() => setTypeFilter(typeFilter === 'SPECT' ? '' : 'SPECT')}
          active={typeFilter === 'SPECT'}
        />
        <KpiCard 
          title="Therapy Products" 
          value={stats.therapy} 
          icon={<Zap size={20} />}
          color="warning"
          onClick={() => setTypeFilter(typeFilter === 'THERAPY' ? '' : 'THERAPY')}
          active={typeFilter === 'THERAPY'}
        />
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Filters:</span>
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, code, or isotope..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="PET">PET</option>
            <option value="SPECT">SPECT</option>
            <option value="THERAPY">Therapy</option>
          </select>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '160px' }}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="">All Methods</option>
            <option value="CYCLOTRON">Cyclotron</option>
            <option value="GENERATOR">Generator</option>
            <option value="KIT">Kit</option>
          </select>
          {(typeFilter || methodFilter || searchQuery) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setTypeFilter('');
                setMethodFilter('');
                setSearchQuery('');
              }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: detailProduct ? '1fr 380px' : '1fr', gap: '1.5rem' }}>
        <div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredProducts.map((product: any) => {
              const typeStyle = getTypeColor(product.productType);
              const isSelected = detailProduct?.id === product.id;
              return (
                <div 
                  key={product.id} 
                  className="card" 
                  style={{ 
                    padding: '1.25rem', 
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setDetailProduct(product)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span 
                      className="badge"
                      style={{ 
                        background: typeStyle.bg, 
                        color: typeStyle.color,
                        fontWeight: 600,
                      }}
                    >
                      {product.productType}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                        setShowModal(true);
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  
                  <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem' }}>{product.name}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <span style={{ fontFamily: 'monospace' }}>{product.code}</span> • {product.radionuclide}
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>T½: {formatTime(product.halfLifeMinutes)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Timer size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Shelf: {formatTime(product.shelfLifeMinutes)}</span>
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
                  }}>
                    <span className="badge badge-default" style={{ fontSize: '0.6875rem' }}>{product.productionMethod}</span>
                    <span style={{ opacity: 0.7 }}>
                      {product.synthesisTimeMinutes + product.qcTimeMinutes + product.packagingTimeMinutes}m total production
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="card" style={{ padding: '2rem' }}>
              <EmptyState 
                title="No products found"
                message={searchQuery || typeFilter || methodFilter ? 'Try adjusting your filters' : 'Add your first product to get started'}
                icon="package"
              />
            </div>
          )}
        </div>

        {detailProduct && (
          <div className="card" style={{ padding: 0, height: 'fit-content', position: 'sticky', top: '1rem' }}>
            <div style={{ 
              padding: '1.25rem', 
              borderBottom: '1px solid var(--border)',
              background: getTypeColor(detailProduct.productType).bg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span 
                    className="badge"
                    style={{ 
                      background: getTypeColor(detailProduct.productType).color, 
                      color: 'white',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {detailProduct.productType}
                  </span>
                  <h3 style={{ fontWeight: 600, fontSize: '1.125rem', margin: '0.5rem 0 0.25rem' }}>{detailProduct.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                    {detailProduct.code}
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setDetailProduct(null)}
                  style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Isotope Properties
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Atom size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Radionuclide</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{detailProduct.radionuclide}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Clock size={14} style={{ color: 'var(--warning)' }} />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Half-Life</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{formatTime(detailProduct.halfLifeMinutes)}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Timer size={14} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Shelf Life</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{formatTime(detailProduct.shelfLifeMinutes)}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Beaker size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Std. Dose</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{detailProduct.standardDose || '-'} {detailProduct.doseUnit}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Production Details
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                    <FlaskConical size={14} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Production Method</span>
                  </div>
                  <div style={{ fontWeight: 600 }}>{detailProduct.productionMethod}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.8125rem' }}>Synthesis Time</span>
                    <span style={{ fontWeight: 600 }}>{detailProduct.synthesisTimeMinutes} min</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.8125rem' }}>QC Testing Time</span>
                    <span style={{ fontWeight: 600 }}>{detailProduct.qcTimeMinutes} min</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.8125rem' }}>Packaging Time</span>
                    <span style={{ fontWeight: 600 }}>{detailProduct.packagingTimeMinutes} min</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.8125rem' }}>Total Production</span>
                    <span style={{ fontWeight: 600 }}>
                      {detailProduct.synthesisTimeMinutes + detailProduct.qcTimeMinutes + detailProduct.packagingTimeMinutes} min
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Overage Factor
                </div>
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'rgba(234, 179, 8, 0.1)', 
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.8125rem' }}>Decay compensation</span>
                  <span style={{ fontWeight: 600, color: 'var(--warning)' }}>+{detailProduct.overagePercent}%</span>
                </div>
              </div>

              {detailProduct.qcTemplates?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    QC Tests ({detailProduct.qcTemplates.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {detailProduct.qcTemplates.map((qc: any) => (
                      <span 
                        key={qc.id} 
                        className="badge badge-default"
                        style={{ fontSize: '0.6875rem' }}
                      >
                        {qc.testName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1.25rem', marginBottom: '1rem' }}>
                <AttachmentPanel
                  entityType="PRODUCT"
                  entityId={detailProduct.id}
                  title="Product Documents"
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  setSelectedProduct(detailProduct);
                  setShowModal(true);
                }}
              >
                <Edit2 size={16} /> Edit Product
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '40rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>{selectedProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => { setShowModal(false); setSelectedProduct(null); }} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Code</label>
                    <input name="code" className="form-input" defaultValue={selectedProduct?.code} required disabled={!!selectedProduct} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input name="name" className="form-input" defaultValue={selectedProduct?.name} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Product Type</label>
                    <select name="productType" className="form-select" defaultValue={selectedProduct?.productType || 'PET'} required>
                      <option value="PET">PET</option>
                      <option value="SPECT">SPECT</option>
                      <option value="THERAPY">THERAPY</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Production Method</label>
                    <select name="productionMethod" className="form-select" defaultValue={selectedProduct?.productionMethod || 'CYCLOTRON'} required>
                      <option value="CYCLOTRON">Cyclotron</option>
                      <option value="GENERATOR">Generator</option>
                      <option value="KIT">Kit</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Radionuclide</label>
                    <input name="radionuclide" className="form-input" defaultValue={selectedProduct?.radionuclide} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Half-Life (minutes)</label>
                    <input name="halfLifeMinutes" type="number" step="0.1" className="form-input" defaultValue={selectedProduct?.halfLifeMinutes} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shelf Life (minutes)</label>
                    <input name="shelfLifeMinutes" type="number" className="form-input" defaultValue={selectedProduct?.shelfLifeMinutes} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Standard Dose</label>
                    <input name="standardDose" type="number" step="0.1" className="form-input" defaultValue={selectedProduct?.standardDose} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dose Unit</label>
                    <select name="doseUnit" className="form-select" defaultValue={selectedProduct?.doseUnit || 'mCi'}>
                      <option value="mCi">mCi</option>
                      <option value="GBq">GBq</option>
                      <option value="MBq">MBq</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Overage %</label>
                    <input name="overagePercent" type="number" step="0.1" className="form-input" defaultValue={selectedProduct?.overagePercent || 10} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Synthesis Time (min)</label>
                    <input name="synthesisTimeMinutes" type="number" className="form-input" defaultValue={selectedProduct?.synthesisTimeMinutes || 45} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">QC Time (min)</label>
                    <input name="qcTimeMinutes" type="number" className="form-input" defaultValue={selectedProduct?.qcTimeMinutes || 30} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Packaging Time (min)</label>
                    <input name="packagingTimeMinutes" type="number" className="form-input" defaultValue={selectedProduct?.packagingTimeMinutes || 15} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setSelectedProduct(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
