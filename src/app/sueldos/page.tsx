'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { calcularSueldo, SueldoInput, SueldoResultado } from '@/lib/sueldo/calcularSueldo';
import { formatearCLP, formatearNumero } from '@/lib/sueldo/utils/redondeo';

export default function SueldosPage() {
  const [input, setInput] = useState<SueldoInput>({
    sueldoBase: 0,
    fecha: new Date(),
    afp: '',
    mutualidad: '',
    tipoContrato: 'indefinido',
    horasExtras: { cincuenta: 0, cien: 0 },
    bonos: {},
    comisiones: 0,
    noImponible: {},
    anticipos: 0,
    judiciales: 0,
    apv: 0,
    cuenta2: 0
  });

  const [resultado, setResultado] = useState<SueldoResultado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setInput(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setInput(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof SueldoInput],
        [field]: value
      }
    }));
  };

  const handleCalcular = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const resultado = await calcularSueldo(input);
      setResultado(resultado);
    } catch (err: any) {
      setError(err.message || 'Error al calcular sueldo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cálculo de Sueldos</h1>
        <Badge variant="secondary">Beta</Badge>
      </div>

      <Tabs defaultValue="entrada" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entrada">Datos de Entrada</TabsTrigger>
          <TabsTrigger value="resultado" disabled={!resultado}>
            Resultado
          </TabsTrigger>
          <TabsTrigger value="detalle" disabled={!resultado}>
            Detalle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entrada" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Información Básica */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sueldoBase">Sueldo Base</Label>
                  <Input
                    id="sueldoBase"
                    type="number"
                    value={input.sueldoBase}
                    onChange={(e) => handleInputChange('sueldoBase', Number(e.target.value))}
                    placeholder="Ingrese sueldo base"
                  />
                </div>

                <div>
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={input.fecha.toISOString().split('T')[0]}
                    onChange={(e) => handleInputChange('fecha', new Date(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="afp">AFP</Label>
                  <Select value={input.afp} onValueChange={(value) => handleInputChange('afp', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione AFP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="capital">Capital</SelectItem>
                      <SelectItem value="cuprum">Cuprum</SelectItem>
                      <SelectItem value="habitat">Habitat</SelectItem>
                      <SelectItem value="modelo">Modelo</SelectItem>
                      <SelectItem value="planvital">PlanVital</SelectItem>
                      <SelectItem value="provida">ProVida</SelectItem>
                      <SelectItem value="uno">Uno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="mutualidad">Mutualidad</Label>
                  <Select value={input.mutualidad} onValueChange={(value) => handleInputChange('mutualidad', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione mutualidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acach">ACACH</SelectItem>
                      <SelectItem value="achs">ACHS</SelectItem>
                      <SelectItem value="ist">IST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
                  <Select value={input.tipoContrato} onValueChange={(value) => handleInputChange('tipoContrato', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                      <SelectItem value="plazo_fijo">Plazo Fijo</SelectItem>
                      <SelectItem value="obra_faena">Obra o Faena</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Horas Extras y Bonos */}
            <Card>
              <CardHeader>
                <CardTitle>Horas Extras y Bonos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="horas50">Horas Extras 50%</Label>
                  <Input
                    id="horas50"
                    type="number"
                    value={input.horasExtras?.cincuenta || 0}
                    onChange={(e) => handleNestedInputChange('horasExtras', 'cincuenta', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="horas100">Horas Extras 100%</Label>
                  <Input
                    id="horas100"
                    type="number"
                    value={input.horasExtras?.cien || 0}
                    onChange={(e) => handleNestedInputChange('horasExtras', 'cien', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="comisiones">Comisiones</Label>
                  <Input
                    id="comisiones"
                    type="number"
                    value={input.comisiones || 0}
                    onChange={(e) => handleInputChange('comisiones', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="nocturnidad">Bono Nocturnidad</Label>
                  <Input
                    id="nocturnidad"
                    type="number"
                    value={input.bonos?.nocturnidad || 0}
                    onChange={(e) => handleNestedInputChange('bonos', 'nocturnidad', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="festivo">Bono Festivo</Label>
                  <Input
                    id="festivo"
                    type="number"
                    value={input.bonos?.festivo || 0}
                    onChange={(e) => handleNestedInputChange('bonos', 'festivo', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* No Imponible */}
            <Card>
              <CardHeader>
                <CardTitle>No Imponible</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="colacion">Colación</Label>
                  <Input
                    id="colacion"
                    type="number"
                    value={input.noImponible?.colacion || 0}
                    onChange={(e) => handleNestedInputChange('noImponible', 'colacion', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="movilizacion">Movilización</Label>
                  <Input
                    id="movilizacion"
                    type="number"
                    value={input.noImponible?.movilizacion || 0}
                    onChange={(e) => handleNestedInputChange('noImponible', 'movilizacion', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="viatico">Viático</Label>
                  <Input
                    id="viatico"
                    type="number"
                    value={input.noImponible?.viatico || 0}
                    onChange={(e) => handleNestedInputChange('noImponible', 'viatico', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="desgaste">Desgaste</Label>
                  <Input
                    id="desgaste"
                    type="number"
                    value={input.noImponible?.desgaste || 0}
                    onChange={(e) => handleNestedInputChange('noImponible', 'desgaste', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="asignacionFamiliar">Asignación Familiar</Label>
                  <Input
                    id="asignacionFamiliar"
                    type="number"
                    value={input.noImponible?.asignacionFamiliar || 0}
                    onChange={(e) => handleNestedInputChange('noImponible', 'asignacionFamiliar', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={handleCalcular} 
              disabled={loading || !input.sueldoBase || !input.afp || !input.mutualidad}
              size="lg"
            >
              {loading ? 'Calculando...' : 'Calcular Sueldo'}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="resultado" className="space-y-6">
          {resultado && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Resumen Principal */}
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle>Resumen del Cálculo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatearCLP(resultado.sueldoLiquido)}
                      </div>
                      <div className="text-sm text-gray-500">Sueldo Líquido</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold">
                        {formatearCLP(resultado.imponible.total)}
                      </div>
                      <div className="text-sm text-gray-500">Imponible</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold">
                        {formatearCLP(resultado.cotizaciones.total)}
                      </div>
                      <div className="text-sm text-gray-500">Cotizaciones</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold">
                        {formatearCLP(resultado.empleador.costoTotal)}
                      </div>
                      <div className="text-sm text-gray-500">Costo Empleador</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Imponible */}
              <Card>
                <CardHeader>
                  <CardTitle>Imponible</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sueldo Base:</span>
                    <span>{formatearCLP(resultado.imponible.sueldoBase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gratificación:</span>
                    <span>{formatearCLP(resultado.imponible.gratificacionLegal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas Extras:</span>
                    <span>{formatearCLP(resultado.imponible.horasExtras)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comisiones:</span>
                    <span>{formatearCLP(resultado.imponible.comisiones)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bonos:</span>
                    <span>{formatearCLP(resultado.imponible.bonos)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatearCLP(resultado.imponible.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Cotizaciones */}
              <Card>
                <CardHeader>
                  <CardTitle>Cotizaciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>AFP:</span>
                    <span>{formatearCLP(resultado.cotizaciones.afp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salud:</span>
                    <span>{formatearCLP(resultado.cotizaciones.salud)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AFC:</span>
                    <span>{formatearCLP(resultado.cotizaciones.afc)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatearCLP(resultado.cotizaciones.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Empleador */}
              <Card>
                <CardHeader>
                  <CardTitle>Costo Empleador</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>SIS:</span>
                    <span>{formatearCLP(resultado.empleador.sis)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AFC:</span>
                    <span>{formatearCLP(resultado.empleador.afc)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mutual:</span>
                    <span>{formatearCLP(resultado.empleador.mutual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reforma Previsional:</span>
                    <span>{formatearCLP(resultado.empleador.reformaPrevisional)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatearCLP(resultado.empleador.costoTotal)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="detalle" className="space-y-6">
          {resultado && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalle Completo</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(resultado, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
