// Utilidades para geocodificación de direcciones usando Google Maps

export interface GeocodingResult {
  latitud: number;
  longitud: number;
  comuna: string;
  ciudad: string;
  region: string;
  direccionCompleta: string;
}

// Función para cargar Google Maps si no está disponible
export async function cargarGoogleMaps(): Promise<boolean> {
  try {
    // Verificar si Google Maps ya está cargado
    if (typeof google !== 'undefined' && google.maps) {
      console.log('Google Maps ya está cargado');
      return true;
    }

    console.log('Cargando Google Maps dinámicamente...');

    // Cargar Google Maps dinámicamente usando el loader
    const { Loader } = await import('@googlemaps/js-api-loader');
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBHIoHJDp6StLJlUAQV_gK7woFsEYgbzHY',
      version: 'weekly',
      libraries: ['places'],
    });

    await loader.load();
    console.log('Google Maps cargado dinámicamente exitosamente');
    return true;
  } catch (error) {
    console.error('Error al cargar Google Maps:', error);
    return false;
  }
}

export async function geocodificarDireccion(direccion: string): Promise<GeocodingResult | null> {
  try {
    console.log('Iniciando geocodificación para:', direccion);

    // Cargar Google Maps si no está disponible
    const mapsLoaded = await cargarGoogleMaps();
    if (!mapsLoaded) {
      console.error('No se pudo cargar Google Maps');
      return null;
    }

    // Verificar que Google Maps esté disponible
    if (typeof google === 'undefined' || !google.maps || !google.maps.Geocoder) {
      console.error('Google Maps no está disponible después de la carga');
      return null;
    }

    console.log('Google Maps está disponible, creando geocoder...');

    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve, reject) => {
      console.log('Ejecutando geocodificación...');
      
      geocoder.geocode({ 
        address: direccion,
        region: 'CL' // Especificar Chile para mejores resultados
      }, (results, status) => {
        console.log('Resultado de geocodificación:', status, results);
        
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const location = result.geometry.location;
          
          // Extraer componentes de dirección
          const componentes = {
            comuna: '',
            ciudad: '',
            region: '',
            direccionCompleta: result.formatted_address
          };

          if (result.address_components) {
            console.log('Componentes de dirección encontrados:', result.address_components);
            
            // Primera pasada: recolectar todos los componentes
            const localityComponents: string[] = [];
            const sublocalityComponents: string[] = [];
            let administrativeLevel2 = '';
            let administrativeLevel1 = '';
            let administrativeLevel3 = '';

            result.address_components.forEach((component) => {
              const types = component.types;
              const name = component.long_name;
              console.log('Componente:', name, 'Tipos:', types);

              if (types.includes('locality')) {
                localityComponents.push(name);
              } else if (types.includes('sublocality')) {
                sublocalityComponents.push(name);
              } else if (types.includes('administrative_area_level_2')) {
                administrativeLevel2 = name;
              } else if (types.includes('administrative_area_level_1')) {
                administrativeLevel1 = name;
              } else if (types.includes('administrative_area_level_3')) {
                administrativeLevel3 = name;
              }
            });

            // Lógica específica para Chile
            // Para direcciones como "Av. La Dehesa 224, Santiago, Lo Barnechea, Región Metropolitana"
            
            // Determinar comuna: priorizar sublocality sobre locality
            if (sublocalityComponents.length > 0) {
              // Si hay sublocality, es probablemente la comuna (ej: Lo Barnechea)
              componentes.comuna = sublocalityComponents[0];
              console.log('Comuna encontrada (sublocality):', sublocalityComponents[0]);
              // Y locality es la ciudad (ej: Santiago)
              if (localityComponents.length > 0) {
                componentes.ciudad = localityComponents[0];
                console.log('Ciudad encontrada (locality):', localityComponents[0]);
              }
            } else if (localityComponents.length > 0) {
              // Si no hay sublocality, locality puede ser la comuna
              componentes.comuna = localityComponents[0];
              console.log('Comuna encontrada (locality):', localityComponents[0]);
              // Usar administrative_area_level_2 como ciudad si está disponible
              if (administrativeLevel2) {
                componentes.ciudad = administrativeLevel2;
                console.log('Ciudad encontrada (level_2):', administrativeLevel2);
              }
            }

            // Si no se determinó ciudad, usar administrative_area_level_2 o level_3
            if (!componentes.ciudad) {
              if (administrativeLevel2) {
                componentes.ciudad = administrativeLevel2;
                console.log('Ciudad encontrada (level_2):', administrativeLevel2);
              } else if (administrativeLevel3) {
                componentes.ciudad = administrativeLevel3;
                console.log('Ciudad encontrada (level_3):', administrativeLevel3);
              }
            }

            // Región
            if (administrativeLevel1) {
              componentes.region = administrativeLevel1;
              console.log('Región encontrada:', administrativeLevel1);
            }

            // Si no se determinó comuna, buscar en la dirección formateada
            if (!componentes.comuna) {
              const direccionParts = result.formatted_address.split(', ');
              for (const part of direccionParts) {
                // Buscar patrones comunes de comunas chilenas
                if (part.includes('Lo Barnechea') || 
                    part.includes('Providencia') || 
                    part.includes('Las Condes') ||
                    part.includes('Ñuñoa') ||
                    part.includes('Santiago') ||
                    part.includes('Maipú') ||
                    part.includes('Puente Alto')) {
                  componentes.comuna = part;
                  console.log('Comuna extraída de dirección formateada:', part);
                  break;
                }
              }
            }

            // Fallback: si no se determinó ciudad, usar la región
            if (!componentes.ciudad && componentes.region) {
              componentes.ciudad = componentes.region;
              console.log('Usando región como ciudad:', componentes.region);
            }
          }

          const geocodingResult: GeocodingResult = {
            latitud: location.lat(),
            longitud: location.lng(),
            comuna: componentes.comuna,
            ciudad: componentes.ciudad,
            region: componentes.region,
            direccionCompleta: componentes.direccionCompleta
          };

          console.log('Geocodificación exitosa:', geocodingResult);
          resolve(geocodingResult);
        } else if (status === 'ZERO_RESULTS') {
          console.warn('No se encontraron resultados para la dirección:', direccion);
          
          // Intentar diferentes variaciones de la dirección
          const variaciones = [
            // Intentar sin el número
            direccion.replace(/\d+$/, '').trim(),
            // Intentar solo la primera parte de la dirección
            direccion.split(' ').slice(0, 2).join(' '),
            // Intentar con "Sanara" en lugar de "Sanará"
            direccion.replace('Sanará', 'Sanara'),
            // Intentar con "Sanara" y solo la calle
            direccion.replace('Sanará', 'Sanara').split(' ').slice(0, 2).join(' ')
          ];

          console.log('Intentando variaciones:', variaciones);

          const intentarVariacion = (index: number) => {
            if (index >= variaciones.length) {
              console.error('Todas las variaciones fallaron');
              reject(new Error(`No se pudo encontrar la ubicación para: ${direccion}`));
              return;
            }

            const variacion = variaciones[index];
            console.log(`Intentando variación ${index + 1}:`, variacion);

            geocoder.geocode({ 
              address: variacion,
              region: 'CL'
            }, (results2, status2) => {
              if (status2 === 'OK' && results2 && results2[0]) {
                const result = results2[0];
                const location = result.geometry.location;
                
                const geocodingResult: GeocodingResult = {
                  latitud: location.lat(),
                  longitud: location.lng(),
                  comuna: 'No especificada',
                  ciudad: 'No especificada',
                  region: 'Chile',
                  direccionCompleta: direccion
                };

                console.log('Geocodificación parcial exitosa con variación:', variacion, geocodingResult);
                resolve(geocodingResult);
              } else {
                console.log(`Variación ${index + 1} falló, intentando siguiente...`);
                intentarVariacion(index + 1);
              }
            });
          };

          intentarVariacion(0);
        } else {
          console.error('Error en geocodificación:', status);
          reject(new Error(`Error en geocodificación: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error('Error al geocodificar dirección:', error);
    return null;
  }
} 