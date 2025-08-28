'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExternalLink, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface EstructuraCabecera {
  id: string;
  guardia_id: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
}

interface EstructuraItem {
  id: string;
  item_id: string;
  codigo: string;
  nombre: string;
  clase: string;
  naturaleza: string;
  monto: number;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  activo: boolean;
}

interface EstructuraServicio {
  id: string;
  instalacion_id: string;
  rol_id: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  lineas: EstructuraItem[];
}

interface HistorialEstructura {
  id: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  n_items: number;
}

interface Props {
  guardiaId: string;
}

export default function EstructuraGuardia({ guardiaId }: Props) {
  const { toast } = useToast();
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [estructuraPersonal, setEstructuraPersonal] = useState<{ cabecera: EstructuraCabecera; lineas: EstructuraItem[] } | null>(null);
  const [estructuraServicio, setEstructuraServicio] = useState<EstructuraServicio | null>(null);
  const [historial, setHistorial] = useState<HistorialEstructura[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [guardiaId, anio, mes]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar estructura personal vigente
      const responsePersonal = await fetch(
        `/api/payroll/estructuras-unificadas?guardia_id=${guardiaId}&tipo=guardia`
      );
      
      if (responsePersonal.status === 404) {
        setEstructuraPersonal(null);
        // Si no hay estructura personal, cargar estructura de servicio
        await cargarEstructuraServicio();
      } else if (responsePersonal.ok) {
        const data = await responsePersonal.json();
        setEstructuraPersonal(data);
      }

      // Cargar historial
      await cargarHistorial();
    } catch (error) {
      console.error('Error al cargar datos de estructura:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los datos de estructura',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarEstructuraServicio = async () => {
    try {
      // Primero obtener la asignación del guardia
      const responseAsignacion = await fetch(`/api/guardias/${guardiaId}/asignacion`);
      if (responseAsignacion.ok) {
        const asignacion = await responseAsignacion.json();
        if (asignacion.instalacion_id && asignacion.rol_id) {
          // Cargar estructura de servicio vigente
          const responseServicio = await fetch(
            `/api/payroll/estructuras-servicio/vigente?instalacion_id=${asignacion.instalacion_id}&rol_id=${asignacion.rol_id}&anio=${anio}&mes=${mes}`
          );
          if (responseServicio.ok) {
            const data = await responseServicio.json();
            setEstructuraServicio(data);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar estructura de servicio:', error);
    }
  };

  const cargarHistorial = async () => {
    try {
              const response = await fetch(`/api/payroll/estructuras-unificadas?guardia_id=${guardiaId}&tipo=guardia`);
      if (response.ok) {
        const data = await response.json();
        setHistorial(data.historial || []);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Período de Visualización</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Año</label>
              <Select value={anio.toString()} onValueChange={(value) => setAnio(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Mes</label>
              <Select value={mes.toString()} onValueChange={(value) => setMes(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                    <SelectItem key={mes} value={mes.toString()}>
                      {format(new Date(2024, mes - 1), 'MMMM', { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vista Vigente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vista Vigente
            <Badge variant="outline" className="ml-2">
              {format(new Date(anio, mes - 1, 1), 'MMMM yyyy', { locale: es })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {estructuraPersonal ? (
            /* Estructura Personal */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Estructura Personal</h3>
                  <p className="text-sm text-gray-600">
                    Vigente desde {format(new Date(estructuraPersonal.cabecera.vigencia_desde), 'dd/MM/yyyy')} 
                    {estructuraPersonal.cabecera.vigencia_hasta 
                      ? ` hasta ${format(new Date(estructuraPersonal.cabecera.vigencia_hasta), 'dd/MM/yyyy')}`
                      : ' (actual)'
                    }
                  </p>
                </div>
                <Link href={`/payroll/estructuras-unificadas?guardia_id=${guardiaId}&tipo=guardia`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir en Estructuras Unificadas
                  </Button>
                </Link>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Vigencia Desde</TableHead>
                    <TableHead>Vigencia Hasta</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estructuraPersonal.lineas.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.codigo}</TableCell>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>${item.monto.toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(item.vigencia_desde), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {item.vigencia_hasta 
                          ? format(new Date(item.vigencia_hasta), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.activo ? 'default' : 'secondary'}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : estructuraServicio ? (
            /* Estructura de Servicio (solo lectura) */
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Estructura de Servicio</h3>
                <p className="text-sm text-gray-600">
                  Vigente desde {format(new Date(estructuraServicio.vigencia_desde), 'dd/MM/yyyy')} 
                  {estructuraServicio.vigencia_hasta 
                    ? ` hasta ${format(new Date(estructuraServicio.vigencia_hasta), 'dd/MM/yyyy')}`
                    : ' (actual)'
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Esta es la estructura de servicio aplicable al rol e instalación del guardia
                </p>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Vigencia Desde</TableHead>
                    <TableHead>Vigencia Hasta</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estructuraServicio.lineas.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.codigo}</TableCell>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>${item.monto.toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(item.vigencia_desde), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {item.vigencia_hasta 
                          ? format(new Date(item.vigencia_hasta), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.activo ? 'default' : 'secondary'}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Sin estructura */
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin estructura vigente</h3>
              <p className="text-sm text-gray-600 mb-4">
                No hay estructura personal ni de servicio vigente para el período seleccionado
              </p>
              <Link href={`/payroll/estructuras-unificadas?guardia_id=${guardiaId}&tipo=guardia`}>
                <Authorize resource="guardias" action="create" eff={effectivePermissions}>
  <GuardButton resource="guardias" action="create" eff={effectivePermissions} >
                  Crear Estructura Personal
                </GuardButton>
</Authorize>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Estructuras Personales</CardTitle>
        </CardHeader>
        <CardContent>
          {historial.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vigencia Desde</TableHead>
                  <TableHead>Vigencia Hasta</TableHead>
                  <TableHead>N° de Líneas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.vigencia_desde), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      {item.vigencia_hasta 
                        ? format(new Date(item.vigencia_hasta), 'dd/MM/yyyy')
                        : 'Actual'
                      }
                    </TableCell>
                    <TableCell>{item.n_items}</TableCell>
                    <TableCell>
                      <Link href={`/payroll/estructuras-unificadas?guardia_id=${guardiaId}&tipo=guardia`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir en Estructuras Unificadas
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600">No hay estructuras personales registradas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
