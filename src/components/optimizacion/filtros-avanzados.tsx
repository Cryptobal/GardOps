"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Users, Building2 } from 'lucide-react';
import { BuscadorEntidades, EntityOption } from '@/components/ui/buscador-entidades';

interface FiltrosAvanzadosProps {
  tipoReferencia: 'guardia' | 'instalacion';
  onTipoChange: (tipo: 'guardia' | 'instalacion') => void;
  busqueda: string;
  onBusquedaChange: (busqueda: string) => void;
  distancia: number;
  onDistanciaChange: (distancia: number) => void;
  referenciaSeleccionada: any;
  onLimpiarReferencia: () => void;
  onSeleccionarOpcion: (opcion: any) => void;
  // Nuevas props para el buscador
  guardias: EntityOption[];
  instalaciones: EntityOption[];
  isLoading: boolean;
}

export function FiltrosAvanzados({
  tipoReferencia,
  onTipoChange,
  busqueda,
  onBusquedaChange,
  distancia,
  onDistanciaChange,
  referenciaSeleccionada,
  onLimpiarReferencia,
  onSeleccionarOpcion,
  guardias,
  instalaciones,
  isLoading
}: FiltrosAvanzadosProps) {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Configurar búsqueda</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {filtrosAbiertos ? 'Ocultar' : 'Mostrar'} filtros
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo de referencia */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de referencia</label>
            <Select value={tipoReferencia} onValueChange={onTipoChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instalacion">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Instalación
                  </div>
                </SelectItem>
                <SelectItem value="guardia">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Guardia
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Búsqueda */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {tipoReferencia === 'instalacion' ? 'Instalación' : 'Guardia'}
            </label>
            <BuscadorEntidades
              placeholder={`Buscar ${tipoReferencia === 'instalacion' ? 'instalación' : 'guardia'}...`}
              value={busqueda}
              onSearchChange={onBusquedaChange}
              onEntitySelect={onSeleccionarOpcion}
              showGuardias={tipoReferencia === 'guardia'}
              showInstalaciones={tipoReferencia === 'instalacion'}
              guardias={guardias}
              instalaciones={instalaciones}
              isLoading={isLoading}
              filterByRut={true}
              filterByApellido={true}
            />
          </div>

          {/* Distancia */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Distancia</label>
            <Select value={distancia.toString()} onValueChange={(value) => onDistanciaChange(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 km</SelectItem>
                <SelectItem value="10">10 km</SelectItem>
                <SelectItem value="15">15 km</SelectItem>
                <SelectItem value="20">20 km</SelectItem>
                <SelectItem value="30">30 km</SelectItem>
                <SelectItem value="50">50 km</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Referencia seleccionada */}
        {referenciaSeleccionada && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {tipoReferencia === 'instalacion' ? (
                    <Building2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Users className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-medium">{referenciaSeleccionada.nombre}</span>
                  <Badge variant="secondary">
                    {tipoReferencia === 'instalacion' ? 'Instalación' : 'Guardia'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{referenciaSeleccionada.direccion}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLimpiarReferencia}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Filtros adicionales (se pueden expandir) */}
        {filtrosAbiertos && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium mb-3">Filtros adicionales</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select defaultValue="todos">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ordenar por</label>
                <Select defaultValue="distancia">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distancia">Distancia</SelectItem>
                    <SelectItem value="nombre">Nombre</SelectItem>
                    <SelectItem value="ciudad">Ciudad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 