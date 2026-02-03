import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { X, ChevronLeft, ChevronRight, AlertTriangle, Info, AlertCircle, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  startAt: string | null;
  createdAt: string;
  isRead: boolean;
}

export default function AnnouncementBar() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { data: announcements = [] } = useQuery({
    queryKey: ['active-announcements'],
    queryFn: async () => {
      const { data } = await api.get('/announcements/active');
      return data as Announcement[];
    },
    refetchInterval: 60000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/announcements/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
    }
  });

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/announcements/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
    }
  });

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const rotateNext = useCallback(() => {
    if (sortedAnnouncements.length > 1) {
      setCurrentIndex(prev => (prev + 1) % sortedAnnouncements.length);
    }
  }, [sortedAnnouncements.length]);

  const rotatePrev = useCallback(() => {
    if (sortedAnnouncements.length > 1) {
      setCurrentIndex(prev => (prev - 1 + sortedAnnouncements.length) % sortedAnnouncements.length);
    }
  }, [sortedAnnouncements.length]);

  useEffect(() => {
    if (sortedAnnouncements.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      rotateNext();
    }, 10000);

    return () => clearInterval(interval);
  }, [sortedAnnouncements.length, isPaused, rotateNext]);

  useEffect(() => {
    if (currentIndex >= sortedAnnouncements.length && sortedAnnouncements.length > 0) {
      setCurrentIndex(0);
    }
  }, [sortedAnnouncements.length, currentIndex]);

  if (sortedAnnouncements.length === 0) {
    return null;
  }

  const current = sortedAnnouncements[currentIndex] || sortedAnnouncements[0];
  if (!current) return null;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return { background: 'var(--danger)', color: 'white' };
      case 'WARNING':
        return { background: 'var(--warning)', color: 'white' };
      default:
        return { background: 'var(--info)', color: 'white' };
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertCircle size={16} />;
      case 'WARNING': return <AlertTriangle size={16} />;
      default: return <Info size={16} />;
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dismissMutation.mutate(id);
  };

  const handleClick = () => {
    if (!current.isRead) {
      readMutation.mutate(current.id);
    }
  };

  return (
    <div
      style={{
        ...getSeverityStyles(current.severity),
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        position: 'relative',
        zIndex: 100,
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {sortedAnnouncements.length > 1 && (
        <button
          onClick={rotatePrev}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '4px',
            padding: '0.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'inherit',
          }}
          title="Previous"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          flex: 1,
          justifyContent: 'center',
          maxWidth: '800px',
        }}
      >
        {getSeverityIcon(current.severity)}
        <span style={{ fontWeight: 600 }}>{current.title}</span>
        <span style={{ opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current.body.length > 100 ? current.body.substring(0, 100) + '...' : current.body}
        </span>
      </div>

      {sortedAnnouncements.length > 1 && (
        <>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            {currentIndex + 1} / {sortedAnnouncements.length}
          </span>
          <button
            onClick={rotateNext}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              padding: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'inherit',
            }}
            title="Next"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link
          to="/notifications?type=announcements"
          style={{
            fontSize: '0.75rem',
            color: 'inherit',
            opacity: 0.9,
            textDecoration: 'underline',
          }}
        >
          View all
        </Link>
        <button
          onClick={(e) => handleDismiss(e, current.id)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '4px',
            padding: '0.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'inherit',
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
