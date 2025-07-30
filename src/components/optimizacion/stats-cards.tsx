"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, MapPin, Target } from 'lucide-react';

interface StatsCardsProps {
  totalGuardias: number;
  totalInstalaciones: number;
  resultadosEncontrados: number;
  distanciaPromedio?: number;
}

export function StatsCards({ 
  totalGuardias, 
  totalInstalaciones, 
  resultadosEncontrados,
  distanciaPromedio 
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total de Guardias */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Guardias</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGuardias}</div>
          <p className="text-xs text-muted-foreground">
            Con coordenadas disponibles
          </p>
        </CardContent>
      </Card>

      {/* Total de Instalaciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Instalaciones</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalInstalaciones}</div>
          <p className="text-xs text-muted-foreground">
            Activas con ubicación
          </p>
        </CardContent>
      </Card>

      {/* Resultados Encontrados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resultados</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resultadosEncontrados}</div>
          <p className="text-xs text-muted-foreground">
            Ubicaciones cercanas
          </p>
        </CardContent>
      </Card>

      {/* Distancia Promedio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Distancia Promedio</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {distanciaPromedio ? `${distanciaPromedio.toFixed(1)} km` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {resultadosEncontrados > 0 ? 'De los resultados' : 'Sin resultados'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 