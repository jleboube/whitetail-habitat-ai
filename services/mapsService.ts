import { LatLng } from '../types';
import { readEnv } from '../utils/env';

interface GoogleBounds {
  northeast: LatLng;
  southwest: LatLng;
}

export interface PropertyBoundary {
  address: string;
  areaAcres: number;
  polygon: LatLng[];
}

const getMapsWebApiKey = (): string | undefined => {
  return (
    readEnv('VITE_GOOGLE_MAPS_API_KEY') ||
    readEnv('REACT_APP_GOOGLE_MAPS_API_KEY') ||
    readEnv('GOOGLE_MAPS_API_KEY')
  );
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const haversineDistanceMeters = (a: LatLng, b: LatLng): number => {
  const R = 6378137; // Earth radius in meters
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

const approximateAreaAcres = (bounds: GoogleBounds): number => {
  const northWest = { lat: bounds.northeast.lat, lng: bounds.southwest.lng };
  const northEast = { lat: bounds.northeast.lat, lng: bounds.northeast.lng };
  const southWest = { lat: bounds.southwest.lat, lng: bounds.southwest.lng };

  const widthMeters = haversineDistanceMeters(northWest, northEast);
  const heightMeters = haversineDistanceMeters(northWest, southWest);
  const areaSqMeters = widthMeters * heightMeters;
  const acres = areaSqMeters / 4046.85642;
  return Math.max(acres, 0);
};

const formatPolygon = (bounds: GoogleBounds): LatLng[] => {
  return [
    { lat: bounds.northeast.lat, lng: bounds.southwest.lng },
    { lat: bounds.northeast.lat, lng: bounds.northeast.lng },
    { lat: bounds.southwest.lat, lng: bounds.northeast.lng },
    { lat: bounds.southwest.lat, lng: bounds.southwest.lng },
    { lat: bounds.northeast.lat, lng: bounds.southwest.lng },
  ];
};

const extractAddressFromPrompt = (prompt: string): string | null => {
  const patterns = [
    /address\s*:\s*(.+)/i,
    /property\s+(?:located\s+)?at\s+(.+)/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      const line = match[1].split('\n')[0].trim();
      if (line.length) {
        return line;
      }
    }
  }
  return null;
};

export const buildPropertyContextFromPrompt = async (prompt: string): Promise<string | null> => {
  const apiKey = getMapsWebApiKey();
  if (!apiKey) {
    return null;
  }

  const address = extractAddressFromPrompt(prompt);
  if (!address) {
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    if (!response.ok) {
      console.error('Geocode API failed', await response.text());
      return null;
    }
    const data = await response.json();
    if (!data.results?.length) {
      return null;
    }
    const result = data.results[0];
    const bounds: GoogleBounds | undefined = result.geometry?.bounds || result.geometry?.viewport;
    if (!bounds) {
      return null;
    }
    const areaAcres = approximateAreaAcres(bounds);
    const polygon = formatPolygon(bounds)
      .map((point) => `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`)
      .join(' | ');

    return `Property boundary (Google Maps) for ${result.formatted_address}:
- Approximate area: ${areaAcres.toFixed(2)} acres
- Boundary coordinates (lat,lng): ${polygon}`;
  } catch (error) {
    console.error('Failed to build property boundary context', error);
    return null;
  }
};
