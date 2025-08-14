'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, CreditCard, DollarSign } from 'lucide-react';

interface Banco {
  id: string;
  nombre: string;
  codigo: string;
}

interface DatosBancarios {
  id: string;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  banco_nombre: string | null;
}

interface Pago {
  id: string;
  fecha_pago: string;
  glosa: string;
  monto_total: number;
  estado: string;
  observaciones?: string;
  created_at: string;
}

interface DatosBancariosProps {
  guardiaId: string;
}

const TIPOS_CUENTA = [
  { value: 'CCT', label: 'Cuenta Corriente' },
  { value: 'CTE', label: 'Cuenta de Ahorro' },
  { value: 'CTA', label: 'Cuenta Vista' },
  { value: 'RUT', label: 'Cuenta RUT' }
];

export default function DatosBancarios({ guardiaId }: DatosBancariosProps) {
  const [datosBancarios, setDatosBancarios] = useState<DatosBancarios | null>(null);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [guardiaId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar datos bancarios del guardia
      const datosResponse = await fetch(`/api/guardias/${guardiaId}/banco`);
      if (datosResponse.ok) {
        const datos = await datosResponse.json();
        setDatosBancarios(datos);
      }

      // Cargar lista de bancos
      const bancosResponse = await fetch('/api/bancos');
      if (bancosResponse.ok) {
        const bancosData = await bancosResponse.json();
        setBancos(bancosData.bancos || []);
      }

      // Cargar historial de pagos de turnos extras
      const pagosResponse = await fetch(`/api/guardias/${guardiaId}/pagos-turnos-extras`);
      if (pagosResponse.ok) {
        const pagosData = await pagosResponse.json();
        setPagos(pagosData.pagos || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarCSV = async (pagoId: string) => {
    try {
      const response = await fetch(`/api/guardias/${guardiaId}/pagos/${pagoId}/csv`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pago_${pagoId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error al descargar el archivo CSV');
      }
    } catch (error) {
      console.error('Error descargando CSV:', error);
      alert('Error al descargar el archivo CSV');
    }
  };

  // Función para obtener el nombre del banco
  const obtenerNombreBanco = (bancoId: string | null) => {
    if (!bancoId) return 'No especificado';
    const banco = bancos.find(b => b.id === bancoId);
    return banco ? banco.nombre : 'Banco no encontrado';
  };

  // Función para obtener el nombre del tipo de cuenta
  const obtenerNombreTipoCuenta = (tipoCuenta: string | null) => {
    if (!tipoCuenta) return 'No especificado';
    const tipo = TIPOS_CUENTA.find(t => t.value === tipoCuenta);
    return tipo ? tipo.label : tipoCuenta;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        <span className="ml-2">Cargando datos bancarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Datos Bancarios de Solo Lectura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Datos Bancarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Banco</label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                <p className="text-sm">
                  {datosBancarios?.banco ? obtenerNombreBanco(datosBancarios.banco) : 'No especificado'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Tipo de Cuenta</label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                <p className="text-sm">
                  {datosBancarios?.tipo_cuenta ? obtenerNombreTipoCuenta(datosBancarios.tipo_cuenta) : 'No especificado'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Número de Cuenta</label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                <p className="text-sm">
                  {datosBancarios?.numero_cuenta || 'No especificado'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Nota:</strong> Para modificar los datos bancarios, utiliza el botón "Editar" en la parte superior de la página.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Historial de Pagos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Historial de Pagos por Turnos Extras
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Este guardia no registra pagos de turnos extras</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha de Pago</TableHead>
                    <TableHead>Glosa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((pago) => (
                    <TableRow key={pago.id}>
                      <TableCell>
                        {new Date(pago.fecha_pago).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>{pago.glosa}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          pago.estado === 'pagado' 
                            ? 'bg-green-100 text-green-800' 
                            : pago.estado === 'pendiente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {pago.estado === 'pagado' ? 'Pagado' : 
                           pago.estado === 'pendiente' ? 'Pendiente' : 'Cancelado'}
                        </span>
                      </TableCell>
                      <TableCell>
                        ${pago.monto_total.toLocaleString('es-CL')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDescargarCSV(pago.id)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Descargar CSV
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 