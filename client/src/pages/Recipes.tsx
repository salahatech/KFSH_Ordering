import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  Plus, 
  Edit2, 
  X, 
  Search,
  Filter,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  Send,
  Trash2,
  ChevronRight,
  ChevronDown,
  ListOrdered,
  Package,
  Layers,
  PenTool,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, EmptyState } from '../components/shared';
import ESignatureModal from '../components/ESignatureModal';
import ESignatureHistory from '../components/ESignatureHistory';

const STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: 'var(--text-muted)', icon: FileText },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'var(--warning)', icon: Clock },
  { value: 'ACTIVE', label: 'Active', color: 'var(--success)', icon: CheckCircle },
  { value: 'SUPERSEDED', label: 'Superseded', color: 'var(--text-muted)', icon: Layers },
  { value: 'OBSOLETE', label: 'Obsolete', color: 'var(--error)', icon: AlertCircle },
];

export default function Recipes() {
  const [showModal, setShowModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [detailRecipe, setDetailRecipe] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showESignModal, setShowESignModal] = useState(false);
  const [recipeToActivate, setRecipeToActivate] = useState<any>(null);
  const [expandedComponents, setExpandedComponents] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', statusFilter, productFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (productFilter) params.append('productId', productFilter);
      if (searchQuery) params.append('search', searchQuery);
      const { data } = await api.get(`/recipes?${params.toString()}`);
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
  });

  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data } = await api.get('/materials?status=ACTIVE');
      return data;
    },
  });

  const { data: recipeDetail } = useQuery({
    queryKey: ['recipe', detailRecipe?.id],
    queryFn: async () => {
      if (!detailRecipe?.id) return null;
      const { data } = await api.get(`/recipes/${detailRecipe.id}`);
      return data;
    },
    enabled: !!detailRecipe?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedRecipe) {
        return api.put(`/recipes/${selectedRecipe.id}`, data);
      }
      return api.post('/recipes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setShowModal(false);
      setSelectedRecipe(null);
      toast.success(selectedRecipe ? 'Recipe Updated' : 'Recipe Created', 
        selectedRecipe ? 'Recipe details have been updated' : 'New recipe has been created');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to save recipe');
    },
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/recipes/${id}/submit-for-approval`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Submitted', 'Recipe has been submitted for approval');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to submit recipe');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ id, signatureId }: { id: string, signatureId: string }) => {
      return api.post(`/recipes/${id}/activate`, { signatureId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setRecipeToActivate(null);
      toast.success('Recipe Activated', 'Recipe is now active and can be used in production');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to activate recipe');
    },
  });

  const createNewVersionMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/recipes/${id}/create-new-version`);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('New Version Created', `Version ${response.data.version} has been created as a draft`);
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to create new version');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe Deleted', 'Recipe has been removed');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to delete recipe');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const componentsJson = formData.get('componentsJson') as string;
    const stepsJson = formData.get('stepsJson') as string;
    
    createMutation.mutate({
      code: formData.get('code'),
      name: formData.get('name'),
      productId: formData.get('productId'),
      description: formData.get('description') || null,
      yieldQuantity: parseFloat(formData.get('yieldQuantity') as string),
      yieldUnit: formData.get('yieldUnit'),
      yieldTolerance: parseFloat(formData.get('yieldTolerance') as string) || 5,
      synthesisTimeMinutes: parseInt(formData.get('synthesisTimeMinutes') as string) || null,
      totalTimeMinutes: parseInt(formData.get('totalTimeMinutes') as string) || null,
      specialInstructions: formData.get('specialInstructions') || null,
      safetyPrecautions: formData.get('safetyPrecautions') || null,
      equipmentRequirements: formData.get('equipmentRequirements') || null,
      qualityNotes: formData.get('qualityNotes') || null,
      components: componentsJson ? JSON.parse(componentsJson) : [],
      steps: stepsJson ? JSON.parse(stepsJson) : [],
    });
  };

  const getStatusStyle = (status: string) => {
    const s = STATUSES.find(s => s.value === status);
    return { color: s?.color || 'var(--text-muted)', Icon: s?.icon || FileText };
  };

  const activeRecipes = recipes?.filter((r: any) => r.status === 'ACTIVE').length || 0;
  const draftRecipes = recipes?.filter((r: any) => r.status === 'DRAFT').length || 0;
  const pendingRecipes = recipes?.filter((r: any) => r.status === 'PENDING_APPROVAL').length || 0;

  const toggleComponents = (id: string) => {
    setExpandedComponents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Recipes & BOM</h1>
          <p className="text-muted">Manage product recipes and bills of materials</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Create Recipe
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Recipes" 
          value={recipes?.length || 0} 
          icon={<FileText size={24} />}
          color="primary"
        />
        <KpiCard 
          title="Active" 
          value={activeRecipes} 
          icon={<CheckCircle size={24} />}
          color="success"
        />
        <KpiCard 
          title="Drafts" 
          value={draftRecipes} 
          icon={<Edit2 size={24} />}
          color="default"
        />
        <KpiCard 
          title="Pending Approval" 
          value={pendingRecipes} 
          icon={<Clock size={24} />}
          color="warning"
        />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="form-select"
              style={{ minWidth: '150px' }}
            >
              <option value="">All Products</option>
              {products?.map((prod: any) => (
                <option key={prod.id} value={prod.id}>{prod.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ minWidth: '150px' }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: detailRecipe ? '1fr 400px' : '1fr', gap: '1.5rem' }}>
        <div className="card">
          {isLoading ? (
            <div className="loading-spinner" style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>
          ) : recipes?.length === 0 ? (
            <EmptyState 
              icon="package"
              title="No Recipes Found"
              message={searchQuery || statusFilter || productFilter 
                ? "No recipes match your search criteria" 
                : "Get started by creating your first recipe"}
              ctaLabel={!searchQuery && !statusFilter && !productFilter ? "Create Recipe" : undefined}
              onCta={!searchQuery && !statusFilter && !productFilter ? () => setShowModal(true) : undefined}
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipe</th>
                    <th>Product</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Components</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes?.map((recipe: any) => {
                    const { color, Icon } = getStatusStyle(recipe.status);
                    return (
                      <tr 
                        key={recipe.id} 
                        onClick={() => setDetailRecipe(recipe)}
                        style={{ cursor: 'pointer', background: detailRecipe?.id === recipe.id ? 'var(--bg-hover)' : undefined }}
                      >
                        <td>
                          <div>
                            <code style={{ fontWeight: 600 }}>{recipe.code}</code>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{recipe.name}</div>
                          </div>
                        </td>
                        <td>
                          <span style={{ 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            color: 'var(--primary)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                          }}>
                            {recipe.product?.name}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>v{recipe.version}</span>
                        </td>
                        <td>
                          <span className="badge" style={{ 
                            background: `${color}20`,
                            color,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}>
                            <Icon size={14} />
                            {STATUSES.find(s => s.value === recipe.status)?.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={14} style={{ color: 'var(--text-muted)' }} />
                            {recipe._count?.components || 0}
                            <span style={{ color: 'var(--text-muted)', margin: '0 0.25rem' }}>|</span>
                            <ListOrdered size={14} style={{ color: 'var(--text-muted)' }} />
                            {recipe._count?.steps || 0}
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {recipe.status === 'DRAFT' && (
                              <>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setSelectedRecipe(recipe);
                                    setShowModal(true);
                                  }}
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => submitForApprovalMutation.mutate(recipe.id)}
                                  title="Submit for Approval"
                                  disabled={submitForApprovalMutation.isPending}
                                >
                                  <Send size={14} />
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    if (confirm('Delete this draft recipe?')) {
                                      deleteMutation.mutate(recipe.id);
                                    }
                                  }}
                                  title="Delete"
                                  style={{ color: 'var(--error)' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                            {recipe.status === 'PENDING_APPROVAL' && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => {
                                  setRecipeToActivate(recipe);
                                  setShowESignModal(true);
                                }}
                                title="Activate with E-Signature"
                              >
                                <PenTool size={14} /> Activate
                              </button>
                            )}
                            {(recipe.status === 'ACTIVE' || recipe.status === 'SUPERSEDED') && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => createNewVersionMutation.mutate(recipe.id)}
                                title="Create New Version"
                                disabled={createNewVersionMutation.isPending}
                              >
                                <Copy size={14} /> New Version
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {detailRecipe && recipeDetail && (
          <div className="card" style={{ position: 'sticky', top: '1rem', maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{recipeDetail.code} v{recipeDetail.version}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setDetailRecipe(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Product</div>
              <div style={{ fontWeight: 500 }}>{recipeDetail.product?.name}</div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</div>
              <span className="badge" style={{ 
                background: `${getStatusStyle(recipeDetail.status).color}20`,
                color: getStatusStyle(recipeDetail.status).color,
              }}>
                {STATUSES.find(s => s.value === recipeDetail.status)?.label}
              </span>
            </div>

            {recipeDetail.description && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Description</div>
                <div>{recipeDetail.description}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Yield</div>
                <div style={{ fontWeight: 500 }}>{recipeDetail.yieldQuantity} {recipeDetail.yieldUnit}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tolerance</div>
                <div>±{recipeDetail.yieldTolerance}%</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}
                onClick={() => toggleComponents(recipeDetail.id)}
              >
                {expandedComponents[recipeDetail.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <h4 style={{ margin: 0 }}>Bill of Materials ({recipeDetail.components?.length || 0})</h4>
              </div>
              {expandedComponents[recipeDetail.id] && (
                <div style={{ marginLeft: '1.5rem' }}>
                  {recipeDetail.components?.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No components defined</div>
                  ) : (
                    recipeDetail.components?.map((comp: any) => (
                      <div key={comp.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '0.5rem 0',
                        borderBottom: '1px solid var(--border-color)',
                      }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{comp.material?.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {comp.material?.code}
                            {comp.isCritical && (
                              <span style={{ color: 'var(--error)', marginLeft: '0.5rem' }}>Critical</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 500 }}>{comp.quantity} {comp.unit}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>±{comp.tolerancePercent}%</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {recipeDetail.steps?.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Process Steps ({recipeDetail.steps.length})</h4>
                {recipeDetail.steps.map((step: any) => (
                  <div key={step.id} style={{ 
                    padding: '0.5rem',
                    marginBottom: '0.5rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ 
                        background: 'var(--primary)',
                        color: 'white',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        {step.stepNumber}
                      </span>
                      <span style={{ fontWeight: 500 }}>{step.title}</span>
                      {step.qualityCheckpoint && (
                        <span title="QC Checkpoint"><CheckCircle size={14} style={{ color: 'var(--success)' }} /></span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '32px' }}>
                      {step.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recipeDetail.activatedAt && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Activation</h4>
                <div style={{ fontSize: '0.85rem' }}>
                  <div><strong>Activated By:</strong> {recipeDetail.activatedBy?.firstName} {recipeDetail.activatedBy?.lastName}</div>
                  <div><strong>Date:</strong> {new Date(recipeDetail.activatedAt).toLocaleString()}</div>
                </div>
                {recipeDetail.activationSignatureId && (
                  <div style={{ marginTop: '1rem' }}>
                    <ESignatureHistory 
                      entityType="Recipe" 
                      entityId={recipeDetail.id}
                      compact
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <RecipeFormModal
          recipe={selectedRecipe}
          products={products || []}
          materials={materials || []}
          onClose={() => { setShowModal(false); setSelectedRecipe(null); }}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
        />
      )}

      {showESignModal && recipeToActivate && (
        <ESignatureModal
          isOpen={showESignModal}
          onClose={() => { setShowESignModal(false); setRecipeToActivate(null); }}
          onSuccess={(signature) => {
            activateMutation.mutate({ id: recipeToActivate.id, signatureId: signature.id });
            setShowESignModal(false);
          }}
          scope="RECIPE_ACTIVATION"
          entityType="Recipe"
          entityId={recipeToActivate.id}
          title="Activate Recipe"
          description={`You are about to activate recipe ${recipeToActivate.code} v${recipeToActivate.version}. This will make it the active recipe for production and supersede any previous active version.`}
        />
      )}
    </div>
  );
}

function RecipeFormModal({ 
  recipe, 
  products, 
  materials, 
  onClose, 
  onSubmit, 
  isPending 
}: { 
  recipe: any; 
  products: any[]; 
  materials: any[]; 
  onClose: () => void; 
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; 
  isPending: boolean;
}) {
  const [components, setComponents] = useState<any[]>(recipe?.components || []);
  const [steps, setSteps] = useState<any[]>(recipe?.steps || []);

  const addComponent = () => {
    setComponents([...components, {
      materialId: '',
      quantity: 0,
      unit: '',
      tolerancePercent: 5,
      isOptional: false,
      isCritical: false,
    }]);
  };

  const updateComponent = (index: number, field: string, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'materialId') {
      const mat = materials.find(m => m.id === value);
      if (mat) {
        updated[index].unit = mat.unit;
      }
    }
    setComponents(updated);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setSteps([...steps, {
      stepNumber: steps.length + 1,
      title: '',
      description: '',
      durationMinutes: null,
      qualityCheckpoint: false,
    }]);
  };

  const updateStep = (index: number, field: string, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>{recipe ? 'Edit Recipe' : 'Create Recipe'}</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const hiddenComponents = document.createElement('input');
          hiddenComponents.type = 'hidden';
          hiddenComponents.name = 'componentsJson';
          hiddenComponents.value = JSON.stringify(components);
          form.appendChild(hiddenComponents);
          
          const hiddenSteps = document.createElement('input');
          hiddenSteps.type = 'hidden';
          hiddenSteps.name = 'stepsJson';
          hiddenSteps.value = JSON.stringify(steps);
          form.appendChild(hiddenSteps);
          
          onSubmit(e);
        }}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Recipe Code *</label>
                <input
                  type="text"
                  name="code"
                  className="form-input"
                  defaultValue={recipe?.code || ''}
                  required
                  placeholder="e.g., RCP-FDG-001"
                  disabled={!!recipe}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  defaultValue={recipe?.name || ''}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select 
                  name="productId" 
                  className="form-select" 
                  defaultValue={recipe?.productId || ''} 
                  required
                  disabled={!!recipe}
                >
                  <option value="">Select Product</option>
                  {products.map(prod => (
                    <option key={prod.id} value={prod.id}>{prod.code} - {prod.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-input"
                rows={2}
                defaultValue={recipe?.description || ''}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Yield Quantity *</label>
                <input
                  type="number"
                  name="yieldQuantity"
                  className="form-input"
                  defaultValue={recipe?.yieldQuantity || ''}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Yield Unit *</label>
                <input
                  type="text"
                  name="yieldUnit"
                  className="form-input"
                  defaultValue={recipe?.yieldUnit || 'mCi'}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tolerance %</label>
                <input
                  type="number"
                  name="yieldTolerance"
                  className="form-input"
                  defaultValue={recipe?.yieldTolerance || 5}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Synthesis Time (min)</label>
                <input
                  type="number"
                  name="synthesisTimeMinutes"
                  className="form-input"
                  defaultValue={recipe?.synthesisTimeMinutes || ''}
                  min="0"
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Bill of Materials</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addComponent}>
                  <Plus size={16} /> Add Material
                </button>
              </div>
              
              {components.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                  No materials added yet. Click "Add Material" to add components.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {components.map((comp, index) => (
                    <div key={index} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1fr 1fr 1fr auto', 
                      gap: '0.5rem',
                      alignItems: 'end',
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '6px',
                    }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Material</label>
                        <select
                          className="form-select"
                          value={comp.materialId}
                          onChange={(e) => updateComponent(index, 'materialId', e.target.value)}
                          required
                        >
                          <option value="">Select Material</option>
                          {materials.map(mat => (
                            <option key={mat.id} value={mat.id}>{mat.code} - {mat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Quantity</label>
                        <input
                          type="number"
                          className="form-input"
                          value={comp.quantity}
                          onChange={(e) => updateComponent(index, 'quantity', parseFloat(e.target.value))}
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Unit</label>
                        <input
                          type="text"
                          className="form-input"
                          value={comp.unit}
                          onChange={(e) => updateComponent(index, 'unit', e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Critical</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input
                            type="checkbox"
                            checked={comp.isCritical}
                            onChange={(e) => updateComponent(index, 'isCritical', e.target.checked)}
                          />
                          Yes
                        </label>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => removeComponent(index)}
                        style={{ color: 'var(--error)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Process Steps</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addStep}>
                  <Plus size={16} /> Add Step
                </button>
              </div>
              
              {steps.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                  No steps defined yet. Click "Add Step" to add process steps.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {steps.map((step, index) => (
                    <div key={index} style={{ 
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '6px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ 
                          background: 'var(--primary)',
                          color: 'white',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Step title"
                          value={step.title}
                          onChange={(e) => updateStep(index, 'title', e.target.value)}
                          style={{ flex: 1 }}
                          required
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                          <input
                            type="checkbox"
                            checked={step.qualityCheckpoint}
                            onChange={(e) => updateStep(index, 'qualityCheckpoint', e.target.checked)}
                          />
                          QC Checkpoint
                        </label>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => removeStep(index)}
                          style={{ color: 'var(--error)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea
                        className="form-input"
                        placeholder="Step description"
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Additional Information</h3>
              <div className="form-group">
                <label className="form-label">Equipment Requirements</label>
                <textarea
                  name="equipmentRequirements"
                  className="form-input"
                  rows={2}
                  defaultValue={recipe?.equipmentRequirements || ''}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Safety Precautions</label>
                <textarea
                  name="safetyPrecautions"
                  className="form-input"
                  rows={2}
                  defaultValue={recipe?.safetyPrecautions || ''}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Quality Notes</label>
                <textarea
                  name="qualityNotes"
                  className="form-input"
                  rows={2}
                  defaultValue={recipe?.qualityNotes || ''}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? 'Saving...' : (recipe ? 'Update Recipe' : 'Create Recipe')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
