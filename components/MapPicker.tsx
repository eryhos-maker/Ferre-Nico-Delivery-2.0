import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  origin: { lat: number; lng: number };
  value: { lat: number; lng: number } | null;
  onChange: (p: { lat: number; lng: number }) => void;
  focus?: { lat: number; lng: number; zoom?: number } | null;
}

const pin = (color: string, icon: string) =>
  L.divIcon({
    className: '',
    html: `<div style="position:relative;width:34px;height:44px">
      <i class="fas fa-map-marker" style="color:${color};font-size:44px;position:absolute;left:3px;top:0;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"></i>
      <i class="fas ${icon}" style="color:#fff;font-size:13px;position:absolute;left:0;right:0;top:11px;text-align:center"></i>
    </div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 44]
  });

/** Mapa gratuito (OpenStreetMap). Toca el mapa o arrastra el pin para marcar la entrega. */
const MapPicker: React.FC<Props> = ({ origin, value, onChange, focus }) => {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([origin.lat, origin.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(m);
    L.marker([origin.lat, origin.lng], { icon: pin('#1e40af', 'fa-store'), interactive: false }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    setTimeout(() => m.invalidateSize(), 200);
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, [origin.lat, origin.lng]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = L.marker([value.lat, value.lng], { draggable: true, icon: pin('#dc2626', 'fa-home') }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      marker.current.setLatLng([value.lat, value.lng]);
    }
  }, [value?.lat, value?.lng]);

  useEffect(() => {
    if (focus && map.current) map.current.setView([focus.lat, focus.lng], focus.zoom || 15);
  }, [focus?.lat, focus?.lng, focus?.zoom]);

  return <div ref={box} className="w-full h-72 md:h-80 rounded-2xl overflow-hidden border-2 border-gray-100 z-0" />;
};

export default MapPicker;
