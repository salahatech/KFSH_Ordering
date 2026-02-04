import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface Branding {
  siteLogo: string | null;
  siteName: string;
  companyName: string;
  companyNameAr: string;
}

export function useBranding() {
  const { data, isLoading } = useQuery<Branding>({
    queryKey: ['branding'],
    queryFn: async () => {
      const response = await api.get('/api/config/branding');
      return response.data;
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });

  return {
    siteLogo: data?.siteLogo || null,
    siteName: data?.siteName || 'RadioPharma',
    companyName: data?.companyName || 'RadioPharma',
    companyNameAr: data?.companyNameAr || 'راديو فارما',
    isLoading,
  };
}
