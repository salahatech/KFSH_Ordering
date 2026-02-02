import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
}

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM = 10;

const markerIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    background: #0d9488;
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    border: 2px solid white;
  ">
    <div style="transform: rotate(45deg); color: white; font-size: 14px;">📍</div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function MapPicker({ latitude, longitude, onLocationSelect, height = '300px' }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initialLat = latitude || DEFAULT_CENTER[0];
    const initialLng = longitude || DEFAULT_CENTER[1];
    const initialZoom = latitude && longitude ? 15 : DEFAULT_ZOOM;

    const map = L.map(mapRef.current).setView([initialLat, initialLng], initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    if (latitude && longitude) {
      markerRef.current = L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      }
      
      onLocationSelect(lat, lng);
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (latitude && longitude) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        markerRef.current = L.marker([latitude, longitude], { icon: markerIcon }).addTo(mapInstanceRef.current);
      }
      mapInstanceRef.current.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={mapRef}
        style={{
          height,
          width: '100%',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          background: 'white',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <MapPin size={14} />
        Click on the map to select location
      </div>
    </div>
  );
}
