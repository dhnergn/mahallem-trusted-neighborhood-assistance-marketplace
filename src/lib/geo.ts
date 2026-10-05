// Spatial calculations & privacy quantization

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface NeighborhoodLocation {
  district: string;
  neighborhood: string;
  centroid: GeoPoint;
}

// Known Istanbul neighborhood centroids for realistic neighborhood mapping
export const ISTANBUL_NEIGHBORHOODS: Record<string, NeighborhoodLocation> = {
  'moda-kadikoy': {
    district: 'Kadıköy',
    neighborhood: 'Moda',
    centroid: { lat: 40.9833, lng: 29.0267 },
  },
  'caferaga-kadikoy': {
    district: 'Kadıköy',
    neighborhood: 'Caferağa',
    centroid: { lat: 40.9888, lng: 29.0294 },
  },
  'rasimpasa-kadikoy': {
    district: 'Kadıköy',
    neighborhood: 'Rasimpaşa / Yeldeğirmeni',
    centroid: { lat: 40.9956, lng: 29.0322 },
  },
  'akaretler-besiktas': {
    district: 'Beşiktaş',
    neighborhood: 'Akaretler',
    centroid: { lat: 41.0428, lng: 29.0019 },
  },
  'sinanpasa-besiktas': {
    district: 'Beşiktaş',
    neighborhood: 'Sinanpaşa / Köyiçi',
    centroid: { lat: 41.0436, lng: 29.0069 },
  },
  'kuzguncuk-uskudar': {
    district: 'Üsküdar',
    neighborhood: 'Kuzguncuk',
    centroid: { lat: 41.0344, lng: 29.0297 },
  },
  'fenerbahce-kadikoy': {
    district: 'Kadıköy',
    neighborhood: 'Fenerbahçe',
    centroid: { lat: 40.9722, lng: 29.0431 },
  },
  'levent-besiktas': {
    district: 'Beşiktaş',
    neighborhood: 'Levent',
    centroid: { lat: 41.0822, lng: 29.0142 },
  },
};

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(pointA: GeoPoint, pointB: GeoPoint): number {
  const R = 6371; // Earth radius in km
  const dLat = ((pointB.lat - pointA.lat) * Math.PI) / 180;
  const dLng = ((pointB.lng - pointA.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pointA.lat * Math.PI) / 180) *
      Math.cos((pointB.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Number(dist.toFixed(1));
}

/**
 * Privacy-by-design Spatial Quantization:
 * Jitters precise coordinates by a pseudo-random 350m to 650m radius to generate
 * coarse discovery coordinates that obscure the user's home or real-time location.
 */
export function applyPrivacyJitter(point: GeoPoint): GeoPoint {
  // 1 degree latitude ~ 111.32 km
  // 500 meters is approximately 0.0045 degrees
  const angle = Math.random() * 2 * Math.PI;
  const distanceKm = 0.35 + Math.random() * 0.3; // 350m - 650m
  const deltaLat = (distanceKm / 111.32) * Math.cos(angle);
  const deltaLng =
    (distanceKm / (111.32 * Math.cos((point.lat * Math.PI) / 180))) * Math.sin(angle);

  return {
    lat: Number((point.lat + deltaLat).toFixed(5)),
    lng: Number((point.lng + deltaLng).toFixed(5)),
  };
}

/**
 * Formats approximate distance for discovery cards
 */
export function formatApproximateDistance(distanceKm: number): string {
  if (distanceKm < 0.4) {
    return 'Within ~400m';
  }
  if (distanceKm < 1) {
    return `~${Math.round(distanceKm * 1000)}m away`;
  }
  return `~${distanceKm} km away`;
}
