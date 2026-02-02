import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { 
  ArrowLeft, Save, Upload, Trash2, Download, FileText, 
  MapPin, Building, User, FileCheck, Image as ImageIcon, X, AlertCircle
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';

interface FormErrors {
  [key: string]: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  CR: 'Commercial Registration',
  TAX_CERT: 'Tax Certificate',
  LICENSE: 'License',
  CONTRACT: 'Contract',
  NDA: 'Non-Disclosure Agreement',
  OTHER: 'Other',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    email: '',
    mobile: '',
    phone: '',
    crNumber: '',
    taxNumber: '',
    fullAddress: '',
    shortAddress: '',
    buildingNo: '',
    street: '',
    secondaryNo: '',
    district: '',
    postalCode: '',
    countryId: '',
    regionId: '',
    cityId: '',
    categoryId: '',
    latitude: '',
    longitude: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    travelTimeMinutes: 60,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docType, setDocType] = useState<string>('CR');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${id}`);
      return data;
    },
    enabled: isEditing,
  });

  const { data: countries } = useQuery({
    queryKey: ['settings', 'countries'],
    queryFn: async () => {
      const { data } = await api.get('/settings/countries');
      return data;
    },
  });

  const { data: regions } = useQuery({
    queryKey: ['settings', 'regions', formData.countryId],
    queryFn: async () => {
      const params = formData.countryId ? { countryId: formData.countryId } : {};
      const { data } = await api.get('/settings/regions', { params });
      return data;
    },
  });

  const { data: cities } = useQuery({
    queryKey: ['settings', 'cities', formData.regionId],
    queryFn: async () => {
      const params = formData.regionId ? { regionId: formData.regionId } : {};
      const { data } = await api.get('/settings/cities', { params });
      return data;
    },
    enabled: !!formData.regionId,
  });

  const { data: categories } = useQuery({
    queryKey: ['settings', 'categories'],
    queryFn: async () => {
      const { data } = await api.get('/settings/categories');
      return data;
    },
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        code: customer.code || '',
        nameEn: customer.nameEn || customer.name || '',
        nameAr: customer.nameAr || '',
        email: customer.email || '',
        mobile: customer.mobile || customer.phone || '',
        phone: customer.phone || '',
        crNumber: customer.crNumber || '',
        taxNumber: customer.taxNumber || '',
        fullAddress: customer.fullAddress || customer.address || '',
        shortAddress: customer.shortAddress || '',
        buildingNo: customer.buildingNo || '',
        street: customer.street || '',
        secondaryNo: customer.secondaryNo || '',
        district: customer.district || '',
        postalCode: customer.postalCode || '',
        countryId: customer.countryId || '',
        regionId: customer.regionId || '',
        cityId: customer.cityId || '',
        categoryId: customer.categoryId || '',
        latitude: customer.latitude?.toString() || '',
        longitude: customer.longitude?.toString() || '',
        licenseNumber: customer.licenseNumber || '',
        licenseExpiryDate: customer.licenseExpiryDate?.split('T')[0] || '',
        travelTimeMinutes: customer.travelTimeMinutes || 60,
      });
      if (customer.logoUrl) {
        setLogoPreview(customer.logoUrl);
      }
    } else if (!isEditing && countries?.length > 0) {
      const saudiArabia = countries.find((c: any) => c.code === 'SA');
      if (saudiArabia) {
        setFormData(prev => ({ ...prev, countryId: saudiArabia.id }));
      }
    }
  }, [customer, countries, isEditing]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.code.trim()) newErrors.code = 'Customer code is required';
    if (!formData.nameEn.trim()) newErrors.nameEn = 'English name is required';
    if (!formData.nameAr.trim()) newErrors.nameAr = 'Arabic name is required';
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else {
      const mobileRegex = /^(\+9665|05)\d{8}$/;
      const e164Regex = /^\+\d{10,15}$/;
      if (!mobileRegex.test(formData.mobile) && !e164Regex.test(formData.mobile)) {
        newErrors.mobile = 'Enter a valid Saudi mobile number (e.g., 05xxxxxxxx or +9665xxxxxxxx)';
      }
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.crNumber.trim()) newErrors.crNumber = 'Commercial Registration number is required';
    if (!formData.taxNumber.trim()) newErrors.taxNumber = 'Tax number is required';
    if (!formData.fullAddress.trim()) newErrors.fullAddress = 'Full address is required';
    if (!formData.cityId) newErrors.cityId = 'City is required';

    if (formData.latitude) {
      const lat = parseFloat(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = 'Latitude must be between -90 and 90';
      }
    }
    if (formData.longitude) {
      const lng = parseFloat(formData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.longitude = 'Longitude must be between -180 and 180';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        return api.put(`/customers/${id}`, data);
      }
      return api.post('/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(
        isEditing ? 'Customer Updated' : 'Customer Created',
        isEditing ? 'Customer details have been updated' : 'New customer has been added'
      );
      navigate('/customers');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to save customer');
    },
  });

  const handleSubmit = (e: React.FormEvent, shouldClose: boolean = true) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Validation Error', 'Please fix the errors in the form');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleLogoUpload = async (file: File) => {
    if (!isEditing) {
      toast.error('Error', 'Please save the customer first before uploading a logo');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Invalid File Type', 'Only PNG and JPG images are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File Too Large', 'File exceeds 5 MB. Please upload a smaller file.');
      return;
    }

    setIsUploadingLogo(true);
    const formDataUpload = new FormData();
    formDataUpload.append('logo', file);

    try {
      const { data } = await api.post(`/customers/${id}/logo`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoPreview(data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Logo Uploaded', 'Customer logo has been updated');
    } catch (error: any) {
      const apiError = parseApiError(error);
      toast.error('Upload Failed', apiError?.userMessage || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!isEditing) return;
    try {
      await api.delete(`/customers/${id}/logo`);
      setLogoPreview(null);
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Logo Removed', 'Customer logo has been removed');
    } catch (error) {
      toast.error('Error', 'Failed to remove logo');
    }
  };

  const handleDocUpload = async (file: File) => {
    if (!isEditing) {
      toast.error('Error', 'Please save the customer first before uploading documents');
      return;
    }

    const allowedTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid File Type', 'Allowed: PDF, PNG, JPG, DOCX');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File Too Large', 'File exceeds 5 MB. Please upload a smaller document.');
      return;
    }

    setIsUploadingDoc(true);
    const formDataUpload = new FormData();
    formDataUpload.append('document', file);
    formDataUpload.append('docType', docType);

    try {
      await api.post(`/customers/${id}/documents`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Document Uploaded', 'Document has been added');
    } catch (error: any) {
      const apiError = parseApiError(error);
      toast.error('Upload Failed', apiError?.userMessage || 'Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDocDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/customers/${id}/documents/${docId}`);
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Document Deleted', 'Document has been removed');
    } catch (error) {
      toast.error('Error', 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCountryChange = (countryId: string) => {
    setFormData(prev => ({ ...prev, countryId, regionId: '', cityId: '' }));
  };

  const handleRegionChange = (regionId: string) => {
    setFormData(prev => ({ ...prev, regionId, cityId: '' }));
  };

  if (isLoadingCustomer && isEditing) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  const errorCount = Object.keys(errors).filter(k => errors[k]).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/customers')}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            {isEditing ? 'Edit Customer' : 'Create New Customer'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {isEditing ? 'Update customer information and documents' : 'Add a new customer to the system'}
          </p>
        </div>
      </div>

      {errorCount > 0 && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 500 }}>Please fix {errorCount} error(s) before saving</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <User size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Basic Information</h3>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Customer Code *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.code ? 'error' : ''}`}
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    placeholder="e.g., CUST001"
                    disabled={isEditing}
                  />
                  {errors.code && <span className="form-error">{errors.code}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={formData.categoryId}
                    onChange={(e) => handleChange('categoryId', e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name (English) *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.nameEn ? 'error' : ''}`}
                    value={formData.nameEn}
                    onChange={(e) => handleChange('nameEn', e.target.value)}
                    placeholder="Customer name in English"
                  />
                  {errors.nameEn && <span className="form-error">{errors.nameEn}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Name (Arabic) * الاسم بالعربية</label>
                  <input
                    type="text"
                    className={`form-input ${errors.nameAr ? 'error' : ''}`}
                    value={formData.nameAr}
                    onChange={(e) => handleChange('nameAr', e.target.value)}
                    placeholder="اسم العميل"
                    dir="rtl"
                  />
                  {errors.nameAr && <span className="form-error">{errors.nameAr}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="customer@example.com"
                  />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input
                    type="tel"
                    className={`form-input ${errors.mobile ? 'error' : ''}`}
                    value={formData.mobile}
                    onChange={(e) => handleChange('mobile', e.target.value)}
                    placeholder="05xxxxxxxx or +9665xxxxxxxx"
                  />
                  {errors.mobile && <span className="form-error">{errors.mobile}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone (Landline)</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MapPin size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Address & Location</h3>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Full Address *</label>
                <textarea
                  className={`form-textarea ${errors.fullAddress ? 'error' : ''}`}
                  value={formData.fullAddress}
                  onChange={(e) => handleChange('fullAddress', e.target.value)}
                  rows={3}
                  placeholder="Enter complete street address, building name, landmarks..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
                {errors.fullAddress && <span className="form-error">{errors.fullAddress}</span>}
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                  Saudi National Address (Optional)
                </h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Short Address</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.shortAddress}
                      onChange={(e) => handleChange('shortAddress', e.target.value)}
                      placeholder="ABCD1234"
                      maxLength={8}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Building No.</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.buildingNo}
                      onChange={(e) => handleChange('buildingNo', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Street</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.street}
                      onChange={(e) => handleChange('street', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Secondary No.</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.secondaryNo}
                      onChange={(e) => handleChange('secondaryNo', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">District</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.district}
                      onChange={(e) => handleChange('district', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.postalCode}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <select
                    className="form-select"
                    value={formData.countryId}
                    onChange={(e) => handleCountryChange(e.target.value)}
                  >
                    <option value="">Select Country</option>
                    {countries?.map((country: any) => (
                      <option key={country.id} value={country.id}>{country.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <select
                    className="form-select"
                    value={formData.regionId}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    disabled={!formData.countryId}
                  >
                    <option value="">Select Region</option>
                    {regions?.map((region: any) => (
                      <option key={region.id} value={region.id}>{region.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <select
                    className={`form-select ${errors.cityId ? 'error' : ''}`}
                    value={formData.cityId}
                    onChange={(e) => handleChange('cityId', e.target.value)}
                    disabled={!formData.regionId}
                  >
                    <option value="">Select City</option>
                    {cities?.map((city: any) => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                  {errors.cityId && <span className="form-error">{errors.cityId}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    className={`form-input ${errors.latitude ? 'error' : ''}`}
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                    placeholder="-90 to 90"
                  />
                  {errors.latitude && <span className="form-error">{errors.latitude}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    className={`form-input ${errors.longitude ? 'error' : ''}`}
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                    placeholder="-180 to 180"
                  />
                  {errors.longitude && <span className="form-error">{errors.longitude}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Travel Time (min)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.travelTimeMinutes}
                    onChange={(e) => handleChange('travelTimeMinutes', parseInt(e.target.value) || 60)}
                    min={0}
                  />
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Building size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Business Identifiers</h3>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Commercial Registration (CR) *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.crNumber ? 'error' : ''}`}
                    value={formData.crNumber}
                    onChange={(e) => handleChange('crNumber', e.target.value)}
                    placeholder="e.g., 1010xxxxxx"
                  />
                  {errors.crNumber && <span className="form-error">{errors.crNumber}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Tax Number (VAT) *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.taxNumber ? 'error' : ''}`}
                    value={formData.taxNumber}
                    onChange={(e) => handleChange('taxNumber', e.target.value)}
                    placeholder="e.g., 3xxxxxxxxxxxxxxx"
                  />
                  {errors.taxNumber && <span className="form-error">{errors.taxNumber}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">License Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.licenseNumber}
                    onChange={(e) => handleChange('licenseNumber', e.target.value)}
                    placeholder="Operating license number"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">License Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.licenseExpiryDate}
                    onChange={(e) => handleChange('licenseExpiryDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <ImageIcon size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Branding</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  overflow: 'hidden',
                }}>
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Customer Logo"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                      <ImageIcon size={32} />
                      <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0' }}>No logo</p>
                    </div>
                  )}
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={!isEditing || isUploadingLogo}
                  >
                    {isUploadingLogo ? 'Uploading...' : <><Upload size={14} /> Upload</>}
                  </button>
                  {logoPreview && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={handleLogoDelete}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                  PNG or JPG, max 5MB
                  {!isEditing && <><br />Save customer first</>}
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <FileCheck size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Documents</h3>
              </div>

              {isEditing ? (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <select
                      className="form-select"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input
                      ref={docInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files?.[0] && handleDocUpload(e.target.files[0])}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => docInputRef.current?.click()}
                      disabled={isUploadingDoc}
                    >
                      {isUploadingDoc ? 'Uploading...' : <><Upload size={14} /> Add</>}
                    </button>
                  </div>

                  {customer?.documents?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {customer.documents.map((doc: any) => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius)',
                          }}
                        >
                          <FileText size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.docName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span className="badge badge-default" style={{ fontSize: '0.625rem' }}>
                                {DOC_TYPE_LABELS[doc.docType] || doc.docType}
                              </span>
                              <span>{formatFileSize(doc.fileSizeBytes)}</span>
                              <span>{format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.25rem' }}
                            >
                              <Download size={14} />
                            </a>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.25rem' }}
                              onClick={() => handleDocDelete(doc.id)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                      <FileText size={32} style={{ opacity: 0.5 }} />
                      <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0' }}>No documents uploaded</p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <FileText size={32} style={{ opacity: 0.5 }} />
                  <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0' }}>Save customer first to upload documents</p>
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
                PDF, PNG, JPG, DOCX - Max 5MB each
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.5rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/customers')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
            <Save size={16} />
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
