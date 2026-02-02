import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
  Save, Upload, Trash2, MapPin, Building, User, X, AlertCircle, Camera, Plus, Phone
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { parseApiError } from '../../components/ui/FormErrors';

interface Contact {
  id?: string;
  name: string;
  title: string;
  email: string;
  phone: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function PortalProfile() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [formData, setFormData] = useState({
    nameEn: '',
    nameAr: '',
    email: '',
    mobile: '',
    phone: '',
    fullAddress: '',
    postalCode: '',
    countryId: '',
    regionId: '',
    cityId: '',
    latitude: '',
    longitude: '',
    deliveryWindowStart: '',
    deliveryWindowEnd: '',
    preferredDeliveryTime: '',
  });

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile');
      return data;
    },
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

  useEffect(() => {
    if (profile) {
      setFormData({
        nameEn: profile.nameEn || profile.name || '',
        nameAr: profile.nameAr || '',
        email: profile.email || '',
        mobile: profile.mobile || '',
        phone: profile.phone || '',
        fullAddress: profile.fullAddress || profile.address || '',
        postalCode: profile.postalCode || '',
        countryId: profile.countryId || '',
        regionId: profile.regionId || '',
        cityId: profile.cityId || '',
        latitude: profile.latitude?.toString() || '',
        longitude: profile.longitude?.toString() || '',
        deliveryWindowStart: profile.deliveryWindowStart || '',
        deliveryWindowEnd: profile.deliveryWindowEnd || '',
        preferredDeliveryTime: profile.preferredDeliveryTime || '',
      });
      if (profile.contacts?.length > 0) {
        setContacts(profile.contacts);
      }
      if (profile.logoUrl) {
        setLogoPreview(profile.logoUrl);
      }
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put('/profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(parseApiError(error) || 'Failed to save profile');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nameEn?.trim()) {
      newErrors.nameEn = 'English name is required';
    }
    if (!formData.mobile?.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else {
      const mobileRegex = /^(\+966|05)[0-9]{8,9}$/;
      if (!mobileRegex.test(formData.mobile.replace(/\s/g, ''))) {
        newErrors.mobile = 'Invalid Saudi mobile format (+9665xxxxxxxx or 05xxxxxxxx)';
      }
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.fullAddress?.trim()) {
      newErrors.fullAddress = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    saveMutation.mutate({
      ...formData,
      contacts,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be less than 5MB');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Only PNG and JPG images are allowed');
      return;
    }

    setIsUploadingLogo(true);
    const formDataUpload = new FormData();
    formDataUpload.append('logo', file);

    try {
      const { data } = await api.post('/profile/logo', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoPreview(data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      toast.error(parseApiError(error) || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await api.delete('/profile/logo');
      setLogoPreview(null);
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Logo removed');
    } catch (error: any) {
      toast.error(parseApiError(error) || 'Failed to remove logo');
    }
  };

  const addContact = () => {
    setContacts([...contacts, { name: '', title: '', email: '', phone: '' }]);
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="card skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  const sectionStyle = {
    background: 'white',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  };

  const sectionTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--border)',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0d9488',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    transition: 'border-color 0.15s ease',
  };

  const errorInputStyle = {
    ...inputStyle,
    borderColor: 'var(--danger)',
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>My Profile</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage your company information and contact details
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={18} />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Building size={20} />
          Company Information
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: '0 0 140px' }}>
            <div
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '12px',
                border: '2px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {logoPreview ? (
                <>
                  <img
                    src={logoPreview}
                    alt="Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <button
                    onClick={handleRemoveLogo}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '4px',
                      cursor: 'pointer',
                      color: 'white',
                    }}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <Camera size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Company Logo</span>
                </>
              )}
            </div>
            <input
              type="file"
              ref={logoInputRef}
              onChange={handleLogoUpload}
              accept="image/png,image/jpeg,image/jpg"
              style={{ display: 'none' }}
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={isUploadingLogo}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.5rem',
                fontSize: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
              }}
            >
              <Upload size={14} />
              {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
            </button>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Name (English) *</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  style={errors.nameEn ? errorInputStyle : inputStyle}
                  placeholder="Company name in English"
                />
                {errors.nameEn && (
                  <span style={{ color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <AlertCircle size={12} /> {errors.nameEn}
                  </span>
                )}
              </div>

              <div>
                <label style={labelStyle}>Name (Arabic)</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  style={inputStyle}
                  placeholder="اسم الشركة بالعربية"
                  dir="rtl"
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={errors.email ? errorInputStyle : inputStyle}
                  placeholder="company@example.com"
                />
                {errors.email && (
                  <span style={{ color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <AlertCircle size={12} /> {errors.email}
                  </span>
                )}
              </div>

              <div>
                <label style={labelStyle}>Mobile *</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  style={errors.mobile ? errorInputStyle : inputStyle}
                  placeholder="+966 5x xxx xxxx"
                />
                {errors.mobile && (
                  <span style={{ color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <AlertCircle size={12} /> {errors.mobile}
                  </span>
                )}
              </div>

              <div>
                <label style={labelStyle}>Phone (Landline)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={inputStyle}
                  placeholder="+966 1x xxx xxxx"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <MapPin size={20} />
          Delivery Address
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Full Address *</label>
            <textarea
              value={formData.fullAddress}
              onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' } as any}
              placeholder="Complete delivery address"
            />
            {errors.fullAddress && (
              <span style={{ color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                <AlertCircle size={12} /> {errors.fullAddress}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Country</label>
            <select
              value={formData.countryId}
              onChange={(e) => setFormData({ ...formData, countryId: e.target.value, regionId: '', cityId: '' })}
              style={inputStyle}
            >
              <option value="">Select Country</option>
              {countries?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nameEn}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Region</label>
            <select
              value={formData.regionId}
              onChange={(e) => setFormData({ ...formData, regionId: e.target.value, cityId: '' })}
              style={inputStyle}
              disabled={!formData.countryId}
            >
              <option value="">Select Region</option>
              {regions?.map((r: any) => (
                <option key={r.id} value={r.id}>{r.nameEn}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>City</label>
            <select
              value={formData.cityId}
              onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
              style={inputStyle}
              disabled={!formData.regionId}
            >
              <option value="">Select City</option>
              {cities?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nameEn}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Postal Code</label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              style={inputStyle}
              placeholder="12345"
            />
          </div>

          <div>
            <label style={labelStyle}>GPS Latitude</label>
            <input
              type="text"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              style={inputStyle}
              placeholder="24.7136"
            />
          </div>

          <div>
            <label style={labelStyle}>GPS Longitude</label>
            <input
              type="text"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              style={inputStyle}
              placeholder="46.6753"
            />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Phone size={20} />
          Delivery Preferences
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Delivery Window Start</label>
            <input
              type="time"
              value={formData.deliveryWindowStart}
              onChange={(e) => setFormData({ ...formData, deliveryWindowStart: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Delivery Window End</label>
            <input
              type="time"
              value={formData.deliveryWindowEnd}
              onChange={(e) => setFormData({ ...formData, deliveryWindowEnd: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Preferred Delivery Time</label>
            <input
              type="time"
              value={formData.preferredDeliveryTime}
              onChange={(e) => setFormData({ ...formData, preferredDeliveryTime: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: '#0d9488' }}>
            <User size={20} />
            Contact Persons
          </div>
          <button
            onClick={addContact}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Add Contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No contact persons added. Click "Add Contact" to add one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {contacts.map((contact, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  alignItems: 'end',
                }}
              >
                <div>
                  <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Name</label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                    style={inputStyle}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Title</label>
                  <input
                    type="text"
                    value={contact.title}
                    onChange={(e) => updateContact(index, 'title', e.target.value)}
                    style={inputStyle}
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Email</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                    style={inputStyle}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Phone</label>
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    style={inputStyle}
                    placeholder="+966 5x xxx xxxx"
                  />
                </div>
                <button
                  onClick={() => removeContact(index)}
                  style={{
                    padding: '0.625rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={18} />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
