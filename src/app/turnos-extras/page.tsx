"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';

interface TurnoExtra {
  id: string;
  fecha: string;
  instalacion: string;
  rol: string;
  horario: string;
  guardia: {
    id: string;
    nombre: string;
  };
  tipo: 'ppc' | 'reemplazo';
  estado: string;
}

export default function TurnosExtrasPage() {
  const router = useRouter();
  const [turnosExtras, setTurnosExtras] = useState<TurnoExtra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarTurnosExtras();
  }, []);

  const cargarTurnosExtras = async () => {
    try {
      setLoading(true);
      logger.debug('🔍 Cargando turnos extras...');
      
      // Usar el endpoint existente de turnos extras
      const response = await fetch('/api/pauta-diaria/turno-extra');
      if (response.ok) {
        const data = await response.json();
        logger.debug('✅ Turnos extras cargados:', data);
        setTurnosExtras(data || []);
      } else {
        logger.error('❌ Error cargando turnos extras');
        setTurnosExtras([]);
      }
    } catch (error) {
      logger.error('❌ Error cargando turnos extras:', error);
      setTurnosExtras([]);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return fecha;
    }
  };

  const obtenerColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'ppc':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'reemplazo':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const obtenerIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'ppc':
        return '🟦';
      case 'reemplazo':
        return '🟧';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Cargando turnos extras...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Turnos Extras
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestión de turnos extras asignados
              </p>
            </div>
          </div>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {turnosExtras.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Turnos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 text-lg">🟦</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {turnosExtras.filter(t => t.tipo === 'ppc').length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      PPCs
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 dark:text-orange-400 text-lg">🟧</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {turnosExtras.filter(t => t.tipo === 'reemplazo').length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Reemplazos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de Turnos Extras */}
        {turnosExtras.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay turnos extras
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No se han encontrado turnos extras asignados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {turnosExtras.map((turno) => (
              <Card key={turno.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Información principal */}
                    <div className="flex-1 space-y-3">
                      {/* Header con tipo y fecha */}
                      <div className="flex items-center gap-3">
                        <Badge className={obtenerColorTipo(turno.tipo)}>
                          {obtenerIconoTipo(turno.tipo)} {turno.tipo.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatearFecha(turno.fecha)}
                        </span>
                      </div>
                      
                      {/* Detalles del turno */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {turno.instalacion}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {turno.guardia.nombre}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Rol:
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {turno.rol}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {turno.horario}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Estado */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {turno.estado}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
