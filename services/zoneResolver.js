// services/zoneResolver.js

export function resolveZone(lat, lng) {
  const zones = [
    { id: 1, name: "DHA",        minLat: 31.440, maxLat: 31.520, minLng: 74.380, maxLng: 74.470 },
    { id: 2, name: "Gulberg",    minLat: 31.500, maxLat: 31.540, minLng: 74.320, maxLng: 74.370 },
    { id: 3, name: "JoharTown",  minLat: 31.450, maxLat: 31.500, minLng: 74.260, maxLng: 74.310 },
    { id: 4, name: "WapdaTown",  minLat: 31.430, maxLat: 31.470, minLng: 74.260, maxLng: 74.300 },
    { id: 5, name: "ModelTown",  minLat: 31.470, maxLat: 31.500, minLng: 74.300, maxLng: 74.330 },
    { id: 6, name: "Township",   minLat: 31.430, maxLat: 31.460, minLng: 74.300, maxLng: 74.340 },
    { id: 7, name: "Shahdara",   minLat: 31.600, maxLat: 31.660, minLng: 74.250, maxLng: 74.320 },
    { id: 8, name: "Cantt",      minLat: 31.500, maxLat: 31.540, minLng: 74.360, maxLng: 74.410 }
  ];

  for (const z of zones) {
    if (
      lat >= z.minLat &&
      lat <= z.maxLat &&
      lng >= z.minLng &&
      lng <= z.maxLng
    ) {
      return z.id;
    }
  }

  return null;
}
