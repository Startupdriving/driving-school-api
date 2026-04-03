import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export default function DemandHeatmap({ zones }) {

  const map = useMap();

  useEffect(() => {

    // ❗ Safety: ensure zones exist
    if (!Array.isArray(zones) || zones.length === 0) return;

    const points = zones
      .map(z => {

        // ❗ Convert safely
        const minLat = Number(z.min_lat);
        const maxLat = Number(z.max_lat);
        const minLng = Number(z.min_lng);
        const maxLng = Number(z.max_lng);

        // ❗ Validate coordinates
        if (
          isNaN(minLat) ||
          isNaN(maxLat) ||
          isNaN(minLng) ||
          isNaN(maxLng)
        ) {
          return null; // skip invalid zone
        }

        // ✅ Calculate center
        const lat = (minLat + maxLat) / 2;
        const lng = (minLng + maxLng) / 2;

        // ❗ Validate final coords
        if (isNaN(lat) || isNaN(lng)) return null;

        const demand = Number(z.recent_requests_5m) || 0;
        const supply = Number(z.online_instructors) || 0;

        const intensity = demand - supply + 1;

        return [lat, lng, Math.max(intensity, 0.1)];

      })
      .filter(Boolean); // ❗ remove invalid points

    // ❗ Prevent Leaflet crash
    if (points.length === 0) return;

    const heatLayer = L.heatLayer(points, {
      radius: 40,
      blur: 30,
      maxZoom: 15
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };

  }, [zones, map]);

  return null;
}
