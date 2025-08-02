'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    banco_id: '',
    tipo_cuenta: '',
    numero_cuenta: ''
  });

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
        setFormData({
          banco_id: datos.banco || '',
          tipo_cuenta: datos.tipo_cuenta || '',
          numero_cuenta: datos.numero_cuenta || ''
        });
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

  const handleGuardar = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/guardias/${guardiaId}/bancarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Datos bancarios guardados con éxito');
        
        // Recargar datos
        await cargarDatos();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error guardando datos:', error);
      alert('Error al guardar los datos bancarios');
    } finally {
      setSaving(false);
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
      {/* Formulario de Datos Bancarios */}
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
              <Label htmlFor="banco">Banco</Label>
              <Select
                value={formData.banco_id}
                onValueChange={(value) => setFormData({ ...formData, banco_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar banco" />
                </SelectTrigger>
                <SelectContent>
                  {bancos.map((banco) => (
                    <SelectItem key={banco.id} value={banco.id}>
                      {banco.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_cuenta">Tipo de Cuenta</Label>
              <Select
                value={formData.tipo_cuenta}
                onValueChange={(value) => setFormData({ ...formData, tipo_cuenta: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CUENTA.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_cuenta">Número de Cuenta</Label>
              <Input
                id="numero_cuenta"
                value={formData.numero_cuenta}
                onChange={(e) => setFormData({ ...formData, numero_cuenta: e.target.value })}
                placeholder="Ingrese número de cuenta"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleGuardar} 
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                'Guardar Datos Bancarios'
              )}
            </Button>
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