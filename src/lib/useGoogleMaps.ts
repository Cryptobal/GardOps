import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { GOOGLE_MAPS_CONFIG } from './config/google-maps';

// Singleton para manejar la carga de Google Maps
class GoogleMapsManager {
  private static instance: GoogleMapsManager;
  private loadingPromise: Promise<void> | null = null;
  private isLoaded = false;
  private loaders: Set<Loader> = new Set();

  private constructor() {}

  static getInstance(): GoogleMapsManager {
    if (!GoogleMapsManager.instance) {
      GoogleMapsManager.instance = new GoogleMapsManager();
    }
    return GoogleMapsManager.instance;
  }

  async load(): Promise<void> {
    // Si ya está cargado, retornar inmediatamente
    if (this.isLoaded) {
      return Promise.resolve();
    }

    // Si ya está cargando, esperar a que termine
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Iniciar la carga
    this.loadingPromise = new Promise((resolve, reject) => {
      const loader = new Loader({
        apiKey: GOOGLE_MAPS_CONFIG.API_KEY,
        version: 'weekly',
        libraries: GOOGLE_MAPS_CONFIG.LIBRARIES,
        ...GOOGLE_MAPS_CONFIG.LOADER_OPTIONS
      });

      this.loaders.add(loader);

      loader.load()
        .then(() => {
          this.isLoaded = true;
          this.loadingPromise = null;
          console.log('✅ Google Maps cargado exitosamente');
          resolve();
        })
        .catch((error) => {
          this.loadingPromise = null;
          console.error('❌ Error cargando Google Maps:', error);
          reject(error);
        });
    });

    return this.loadingPromise;
  }

  isGoogleMapsLoaded(): boolean {
    return this.isLoaded;
  }

  reset(): void {
    this.isLoaded = false;
    this.loadingPromise = null;
    this.loaders.clear();
  }
}

// Hook personalizado para usar Google Maps
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const managerRef = useRef<GoogleMapsManager>();

  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!managerRef.current) {
          managerRef.current = GoogleMapsManager.getInstance();
        }

        await managerRef.current.load();
        setIsLoaded(true);
      } catch (err) {
        console.error('Error al cargar Google Maps:', err);
        setError('Error al cargar Google Maps. Verifica la conexión a internet.');
      } finally {
        setIsLoading(false);
      }
    };

    loadGoogleMaps();
  }, []);

  return {
    isLoaded,
    isLoading,
    error,
    reset: () => managerRef.current?.reset()
  };
}

export default GoogleMapsManager;
