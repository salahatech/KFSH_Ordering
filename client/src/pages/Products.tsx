import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit2, Clock, Beaker } from 'lucide-react';

export default function Products() {
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const queryClient = useQueryClient();

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

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Product Catalog</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="grid grid-3">
        {products?.map((product: any) => (
          <div key={product.id} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <span className={`badge badge-${product.productType === 'PET' ? 'info' : product.productType === 'SPECT' ? 'success' : 'warning'}`}>
                  {product.productType}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedProduct(product);
                  setShowModal(true);
                }}
              >
                <Edit2 size={14} />
              </button>
            </div>
            
            <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{product.name}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {product.code} | {product.radionuclide}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="var(--text-muted)" />
                <span>T½: {formatTime(product.halfLifeMinutes)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Beaker size={16} color="var(--text-muted)" />
                <span>Shelf: {formatTime(product.shelfLifeMinutes)}</span>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Synthesis: {product.synthesisTimeMinutes}m | QC: {product.qcTimeMinutes}m | Pkg: {product.packagingTimeMinutes}m
            </div>
            
            {product.qcTemplates?.length > 0 && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {product.qcTemplates.length} QC tests configured
              </div>
            )}
          </div>
        ))}
      </div>

      {products?.length === 0 && (
        <div className="card empty-state">No products found</div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '40rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>{selectedProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => { setShowModal(false); setSelectedProduct(null); }} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
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
