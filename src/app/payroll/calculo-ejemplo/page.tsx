'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import BackToPayroll from '@/components/BackToPayroll';

interface CalculoResultado {
  valoresUtilizados: {
    uf: { valor: number; formateado: string };
    utm: { valor: number; formateado: string };
  };
  sueldo: {
    base: { valor: number; formateado: string };
    rentaImponible: { valor: number; formateado: string; enUF: string };
  };
  descuentos: {
    afp: { valor: number; formateado: string; porcentaje: string; tope: { valor: number; formateado: string; enUF: string } };
    isapre: { valor: number; formateado: string; porcentaje: string; tope: { valor: number; formateado: string; enUF: string } };
    impuestoUnico: { valor: number; formateado: string; tramo: string; rentaEnUF: string };
  };
  beneficios: {
    gratificacion: { valor: number; formateado: string; porcentaje: string; tope: { valor: number; formateado: string; enUF: string }; mesesTrabajados: number };
  };
  totales: {
    totalDescuentos: { valor: number; formateado: string };
    sueldoLiquido: { valor: number; formateado: string };
    sueldoTotal: { valor: number; formateado: string };
  };
  informacion: {
    timestamp: string;
    fuente: string;
    observaciones: string[];
  };
}

export default function CalculoEjemploPage() {
  const [sueldoBase, setSueldoBase] = useState<number>(800000);
  const [mesesTrabajados, setMesesTrabajados] = useState<number>(12);
  const [resultado, setResultado] = useState<CalculoResultado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realizarCalculo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/payroll/calculo-ejemplo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sueldoBase,
          mesesTrabajados
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResultado(data.data);
      } else {
        setError(data.error || 'Error en el cálculo');
      }
    } catch (error) {
      setError('Error de conexión');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <BackToPayroll />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ejemplo de Cálculo con UF/UTM</h1>
          <p className="text-sm text-muted-foreground">
            Demostración de cálculos de payroll usando valores UF/UTM en tiempo real
          </p>
        </div>
      </div>

      {/* Información */}
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Ejemplo de integración:</strong> Esta página demuestra cómo los valores UF/UTM obtenidos en tiempo real 
          desde las APIs de la CMF se integran en los cálculos de payroll.
        </AlertDescription>
      </Alert>

      {/* Formulario de entrada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Parámetros de Cálculo
          </CardTitle>
          <CardDescription>
            Ingresa los datos para realizar el cálculo de ejemplo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sueldoBase">Sueldo Base (CLP)</Label>
              <Input
                id="sueldoBase"
                type="number"
                value={sueldoBase}
                onChange={(e) => setSueldoBase(Number(e.target.value))}
                placeholder="800000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mesesTrabajados">Meses Trabajados</Label>
              <Input
                id="mesesTrabajados"
                type="number"
                min="1"
                max="12"
                value={mesesTrabajados}
                onChange={(e) => setMesesTrabajados(Number(e.target.value))}
                placeholder="12"
              />
            </div>
          </div>
          
          <Button 
            onClick={realizarCalculo} 
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Realizar Cálculo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="space-y-6">
          {/* Valores UF/UTM utilizados */}
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <TrendingUp className="h-5 w-5" />
                Valores UF/UTM Utilizados
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Valores obtenidos en tiempo real desde las APIs de la CMF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {resultado.valoresUtilizados.uf.formateado}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Unidad de Fomento</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {resultado.valoresUtilizados.utm.formateado}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Unidad Tributaria Mensual</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desglose del sueldo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sueldo y renta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Sueldo Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {resultado.sueldo.base.formateado}
                  </div>
                  <div className="text-sm text-muted-foreground">Sueldo Base</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Renta Imponible:</span>
                    <span className="font-medium">{resultado.sueldo.rentaImponible.formateado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">En UF:</span>
                    <span className="font-medium">{resultado.sueldo.rentaImponible.enUF}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Descuentos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Descuentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">AFP ({resultado.descuentos.afp.porcentaje}):</span>
                    <div className="text-right">
                      <div className="font-medium">{resultado.descuentos.afp.formateado}</div>
                      <div className="text-xs text-muted-foreground">
                        Tope: {resultado.descuentos.afp.tope.enUF}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">ISAPRE ({resultado.descuentos.isapre.porcentaje}):</span>
                    <div className="text-right">
                      <div className="font-medium">{resultado.descuentos.isapre.formateado}</div>
                      <div className="text-xs text-muted-foreground">
                        Tope: {resultado.descuentos.isapre.tope.enUF}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Impuesto Único:</span>
                    <div className="text-right">
                      <div className="font-medium">{resultado.descuentos.impuestoUnico.formateado}</div>
                      <div className="text-xs text-muted-foreground">
                        {resultado.descuentos.impuestoUnico.tramo}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Descuentos:</span>
                      <span>{resultado.totales.totalDescuentos.formateado}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Beneficios */}
          <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <DollarSign className="h-5 w-5" />
                Beneficios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">
                  {resultado.beneficios.gratificacion.formateado}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                  Gratificación Legal ({resultado.beneficios.gratificacion.porcentaje})
                </div>
                <div className="text-xs text-yellow-500 dark:text-yellow-300 mt-1">
                  Tope: {resultado.beneficios.gratificacion.tope.enUF} • 
                  Meses: {resultado.beneficios.gratificacion.mesesTrabajados}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totales */}
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                <Calculator className="h-5 w-5" />
                Resumen Final
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {resultado.totales.sueldoLiquido.formateado}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">Sueldo Líquido</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {resultado.beneficios.gratificacion.formateado}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">Gratificación</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {resultado.totales.sueldoTotal.formateado}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">Total a Recibir</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información adicional */}
          <Card className="bg-gray-50 dark:bg-gray-900/50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Cálculo realizado el: {new Date(resultado.informacion.timestamp).toLocaleString('es-CL')}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Fuente de datos:</strong> {resultado.informacion.fuente}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Observaciones:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {resultado.informacion.observaciones.map((obs, index) => (
                      <li key={index}>{obs}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

