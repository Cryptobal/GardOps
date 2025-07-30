export const GOOGLE_MAPS_CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBHIoHJDp6StLJlUAQV_gK7woFsEYgbzHY',
  LIBRARIES: ['places'] as ("places")[],
  DEFAULT_CENTER: { lat: -33.4489, lng: -70.6693 }, // Santiago, Chile
  DEFAULT_ZOOM: 13,
  CHILE_BOUNDS: {
    north: -17.5,
    south: -56.0,
    east: -66.4,
    west: -109.5
  }
};

export type GoogleMapsLibraries = typeof GOOGLE_MAPS_CONFIG.LIBRARIES; 