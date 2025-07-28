"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { InputDireccion, type AddressData } from "../../components/ui/input-direccion";
import { Button } from "../../components/ui/button";
import GoogleMap from "../../components/ui/google-map";

export default function TestDireccionPage() {
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState({ lat: -33.4489, lng: -70.6693 }); // Santiago centro
  const [mapMarkers, setMapMarkers] = useState<Array<{
    position: { lat: number; lng: number };
    title: string;
    info: string;
  }>>([]);

  const handleAddressSelect = (address: AddressData) => {
    setSelectedAddress(address);
    
    // Actualizar mapa
    const newCenter = { lat: address.latitud, lng: address.longitud };
    setMapCenter(newCenter);
    
    const newMarker = {
      position: newCenter,
      title: address.direccionCompleta.split(',')[0], // Primera parte de la dirección
      info: address.direccionCompleta
    };
    setMapMarkers([newMarker]);
    
    console.log("Dirección seleccionada:", address);
  };

  const handleAddressChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleMapClick = (position: { lat: number; lng: number }) => {
    console.log("Click en mapa:", position);
    // Opcionalmente agregar marcador temporal en click
  };

  const handleReset = () => {
    setSelectedAddress(null);
    setSearchQuery("");
    setMapCenter({ lat: -33.4489, lng: -70.6693 });
    setMapMarkers([]);
  };

  // Mostrar mensaje de éxito en consola
  console.log("Autocomplete Google Maps integrado con éxito");

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Prueba de Autocompletado de Direcciones</h1>
        <p className="text-muted-foreground">
          Prueba el componente InputDireccion con Google Maps API
        </p>
      </div>

      {/* Mapa principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-blue-500">📍</span>
            Mapa Interactivo
          </CardTitle>
          <CardDescription>
            {selectedAddress 
              ? `Mostrando: ${selectedAddress.direccionCompleta}`
              : "Busca y selecciona una dirección para ver su ubicación en el mapa"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleMap
            center={mapCenter}
            zoom={selectedAddress ? 16 : 11}
            markers={mapMarkers}
            height="500px"
            onMapClick={handleMapClick}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario de prueba */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Dirección</CardTitle>
            <CardDescription>
              Escribe al menos 3 caracteres para ver sugerencias
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="direccion" className="text-sm font-medium">
                Dirección *
              </label>
              <InputDireccion
                id="direccion"
                name="direccion"
                placeholder="Ej: Av. Providencia 1234, Santiago"
                onAddressSelect={handleAddressSelect}
                onAddressChange={handleAddressChange}
                required
              />
            </div>

            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset}
              className="w-full"
            >
              Limpiar Formulario
            </Button>
          </CardContent>
        </Card>

        {/* Datos de la dirección seleccionada */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Capturados</CardTitle>
            <CardDescription>
              Información extraída de la dirección seleccionada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedAddress ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    DIRECCIÓN COMPLETA
                  </label>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">
                    {selectedAddress.direccionCompleta}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      LATITUD
                    </label>
                    <p className="text-sm mt-1 p-2 bg-muted rounded">
                      {selectedAddress.latitud.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      LONGITUD
                    </label>
                    <p className="text-sm mt-1 p-2 bg-muted rounded">
                      {selectedAddress.longitud.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Componentes de Dirección:</h4>
                  
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between py-1 px-2 bg-muted rounded">
                      <span className="font-medium">Ciudad:</span>
                      <span>{selectedAddress.componentes.ciudad || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-muted rounded">
                      <span className="font-medium">Comuna:</span>
                      <span>{selectedAddress.componentes.comuna || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-muted rounded">
                      <span className="font-medium">Región:</span>
                      <span>{selectedAddress.componentes.region || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-muted rounded">
                      <span className="font-medium">País:</span>
                      <span>{selectedAddress.componentes.pais || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-muted rounded">
                      <span className="font-medium">Código Postal:</span>
                      <span>{selectedAddress.componentes.codigoPostal || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Selecciona una dirección para ver los datos capturados</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información de uso */}
      <Card>
        <CardHeader>
          <CardTitle>Cómo Usar el Componente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Importación:</h4>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`import { InputDireccion, type AddressData } from "@/components/ui/input-direccion";`}
            </pre>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Uso básico:</h4>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`<InputDireccion
  placeholder="Buscar dirección..."
  onAddressSelect={(address) => console.log(address)}
  onAddressChange={(query) => console.log(query)}
  required
/>`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Campos ocultos generados automáticamente:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <code className="text-xs bg-muted px-1 rounded">direccion_latitud</code></li>
              <li>• <code className="text-xs bg-muted px-1 rounded">direccion_longitud</code></li>
              <li>• <code className="text-xs bg-muted px-1 rounded">direccion_ciudad</code></li>
              <li>• <code className="text-xs bg-muted px-1 rounded">direccion_comuna</code></li>
              <li>• <code className="text-xs bg-muted px-1 rounded">direccion_region</code></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Funcionalidades del Mapa:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Vista automática:</strong> Se centra en la dirección seleccionada</li>
              <li>• <strong>Marcadores dinámicos:</strong> Muestra la ubicación exacta</li>
              <li>• <strong>Información emergente:</strong> Click en el marcador para ver detalles</li>
              <li>• <strong>Controles completos:</strong> Zoom, vista de calle, pantalla completa</li>
              <li>• <strong>Interactivo:</strong> Click en el mapa para obtener coordenadas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 