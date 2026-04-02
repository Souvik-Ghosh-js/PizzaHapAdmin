import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { getGeofence, saveGeofence } from '../services/api';
import { useToast } from '../context';
import { Spinner } from './UI';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function DrawControl({ polygon, onPolygonChange }) {
  const map = useMap();
  const drawControlRef = useRef(null);
  const drawnLayerRef = useRef(null);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnLayerRef.current = drawnItems;

    // Add existing polygon
    if (polygon && polygon.length >= 3) {
      const latlngs = polygon.map(p => [p.lat, p.lng]);
      const layer = L.polygon(latlngs, { color: '#2563eb', fillOpacity: 0.2 });
      drawnItems.addLayer(layer);
    }

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: { allowIntersection: false, shapeOptions: { color: '#2563eb', fillOpacity: 0.2 } },
        polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false,
      },
      edit: { featureGroup: drawnItems, remove: true },
    });
    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      const latlngs = e.layer.getLatLngs()[0];
      onPolygonChange(latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng })));
    });

    map.on(L.Draw.Event.EDITED, (e) => {
      e.layers.eachLayer(layer => {
        const latlngs = layer.getLatLngs()[0];
        onPolygonChange(latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng })));
      });
    });

    map.on(L.Draw.Event.DELETED, () => {
      onPolygonChange([]);
    });

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, []);

  return null;
}

export default function GeofenceEditor({ locationId, lat, lng, onClose }) {
  const toast = useToast();
  const [polygon, setPolygon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedPolygon, setEditedPolygon] = useState([]);

  useEffect(() => {
    setLoading(true);
    getGeofence(locationId)
      .then(r => {
        const data = r.data;
        if (data && data.polygon_coordinates) {
          const coords = typeof data.polygon_coordinates === 'string'
            ? JSON.parse(data.polygon_coordinates)
            : data.polygon_coordinates;
          setPolygon(coords);
          setEditedPolygon(coords);
        } else {
          setPolygon([]);
          setEditedPolygon([]);
        }
      })
      .catch(e => { toast(e.message, 'error'); setPolygon([]); setEditedPolygon([]); })
      .finally(() => setLoading(false));
  }, [locationId]);

  const handleSave = async () => {
    if (editedPolygon.length < 3) {
      toast('Draw at least 3 points to create a geofence', 'warning');
      return;
    }
    setSaving(true);
    try {
      await saveGeofence(locationId, { polygon_coordinates: editedPolygon });
      toast('Geofence saved successfully', 'success');
      onClose?.();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>;
  }

  const center = [parseFloat(lat) || 20.5937, parseFloat(lng) || 78.9629];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p className="text-sm text-muted">
        Use the drawing tools (top-right) to draw a polygon boundary for this location.
        Click the polygon icon, then click points on the map to define the area.
        Click the first point again to close the shape.
      </p>

      <div style={{ height: 450, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} />
          <DrawControl polygon={polygon} onPolygonChange={setEditedPolygon} />
        </MapContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="text-sm text-muted">
          {editedPolygon.length > 0 ? `${editedPolygon.length} points defined` : 'No geofence drawn yet'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" /> Saving...</> : 'Save Geofence'}
          </button>
        </div>
      </div>
    </div>
  );
}
