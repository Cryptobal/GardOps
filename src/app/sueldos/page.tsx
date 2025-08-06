'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SueldoInput, SueldoResultado } from '@/lib/sueldo/tipos/sueldo';
import { formatearCLP } from '@/lib/sueldo/utils/redondeo';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function SueldosPage() {
  const [input, setInput] = useState<SueldoInput>({
    sueldoBase: 0,
    fecha: new Date(),
    afp: '',
    tipoContrato: 'indefinido',
    horasExtras: { cincuenta: 0, cien: 0 },
    bonos: {},
    comisiones: 0,
    noImponible: {},
    anticipos: 0,
    judiciales: 0,
    apv: 0,
    cuenta2: 0,
    cotizacionAdicionalUF: 0,
    diasAusencia: 0
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
        ...(prev[parent as keyof SueldoInput] as any || {}),
        [field]: value
      }
    }));
  };

  const handleCalcular = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sueldos/calcular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al calcular sueldo');
      }

      setResultado(data.data);
    } catch (err: any) {
      setError(err.message || 'Error al calcular sueldo');
      console.error('Error en cálculo:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = input.sueldoBase > 0 && input.afp;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cálculo de Sueldos</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Beta</Badge>
          <Link href="/sueldos/parametros">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Parámetros
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de entrada */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de Entrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sueldoBase">Sueldo Base *</Label>
                <Input
                  id="sueldoBase"
                  type="number"
                  value={input.sueldoBase || ''}
                  onChange={(e) => handleInputChange('sueldoBase', Number(e.target.value) || 0)}
                  placeholder="Ingrese sueldo base"
                />
              </div>

              <div>
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={input.fecha.toISOString().split('T')[0]}
                  onChange={(e) => handleInputChange('fecha', new Date(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="afp">AFP *</Label>
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
                <Label htmlFor="cotizacionAdicionalUF">Cotización Adicional (UF)</Label>
                <Input
                  id="cotizacionAdicionalUF"
                  type="text"
                  value={input.cotizacionAdicionalUF ? input.cotizacionAdicionalUF.toString().replace('.', ',') : ''}
                  onChange={(e) => {
                    // Permitir solo números con coma decimal
                    const value = e.target.value.replace('.', ',');
                    if (/^\d*,?\d{0,2}$/.test(value) || value === '') {
                      const numValue = parseFloat(value.replace(',', '.')) || 0;
                      handleInputChange('cotizacionAdicionalUF', numValue);
                    }
                  }}
                  placeholder="0,4"
                />
              </div>

              <div>
                <Label htmlFor="diasAusencia">Días de Ausencia</Label>
                <Input
                  id="diasAusencia"
                  type="number"
                  value={input.diasAusencia || ''}
                  onChange={(e) => handleInputChange('diasAusencia', Number(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  max="30"
                />
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

              <div>
                <Label htmlFor="comisiones">Comisiones</Label>
                <Input
                  id="comisiones"
                  type="number"
                  value={input.comisiones || ''}
                  onChange={(e) => handleInputChange('comisiones', Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Horas Extras */}
            <div>
              <Label className="text-sm font-medium">Horas Extras</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label htmlFor="horas50" className="text-xs">50%</Label>
                  <Input
                    id="horas50"
                    type="number"
                    value={input.horasExtras?.cincuenta || ''}
                    onChange={(e) => handleNestedInputChange('horasExtras', 'cincuenta', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="horas100" className="text-xs">100%</Label>
                  <Input
                    id="horas100"
                    type="number"
                    value={input.horasExtras?.cien || ''}
                    onChange={(e) => handleNestedInputChange('horasExtras', 'cien', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Bonos */}
            <div>
              <Label className="text-sm font-medium">Bonos</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label htmlFor="nocturnidad" className="text-xs">Nocturnidad</Label>
                  <Input
                    id="nocturnidad"
                    type="number"
                    value={input.bonos?.nocturnidad || ''}
                    onChange={(e) => handleNestedInputChange('bonos', 'nocturnidad', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="festivo" className="text-xs">Festivo</Label>
                  <Input
                    id="festivo"
                    type="number"
                    value={input.bonos?.festivo || ''}
                    onChange={(e) => handleNestedInputChange('bonos', 'festivo', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* No Imponible */}
            <div>
              <Label className="text-sm font-medium">No Imponible</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label htmlFor="colacion" className="text-xs">Colación</Label>
                  <Input
                    id="colacion"
                    type="number"
                    value={input.noImponible?.colacion || ''}
                    onChange={(e) => handleNestedInputChange('noImponible', 'colacion', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="movilizacion" className="text-xs">Movilización</Label>
                  <Input
                    id="movilizacion"
                    type="number"
                    value={input.noImponible?.movilizacion || ''}
                    onChange={(e) => handleNestedInputChange('noImponible', 'movilizacion', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Descuentos */}
            <div>
              <Label className="text-sm font-medium">Descuentos</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label htmlFor="anticipos" className="text-xs">Anticipos</Label>
                  <Input
                    id="anticipos"
                    type="number"
                    value={input.anticipos || ''}
                    onChange={(e) => handleInputChange('anticipos', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="judiciales" className="text-xs">Judiciales</Label>
                  <Input
                    id="judiciales"
                    type="number"
                    value={input.judiciales || ''}
                    onChange={(e) => handleInputChange('judiciales', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleCalcular} 
              disabled={loading || !isFormValid}
              size="lg"
              className="w-full"
            >
              {loading ? 'Calculando...' : 'Calcular Sueldo'}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado del Cálculo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800">Sueldo Líquido</h3>
                <p className="text-2xl font-bold text-green-700">{formatearCLP(resultado.sueldoLiquido)}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold">Desglose Imponible</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sueldo Base:</span>
                    <span>{formatearCLP(resultado.imponible.sueldoBase)}</span>
                  </div>
                  {resultado.imponible.descuentoDiasAusencia > 0 && (
                    <>
                      <div className="flex justify-between text-red-600">
                        <span>Descuento por Días de Ausencia:</span>
                        <span>-{formatearCLP(resultado.imponible.descuentoDiasAusencia)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Sueldo Base Ajustado:</span>
                        <span>{formatearCLP(resultado.imponible.sueldoBaseAjustado)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span>Gratificación Legal:</span>
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
                  <div className="flex justify-between font-semibold">
                    <span>Total Imponible:</span>
                    <span>{formatearCLP(resultado.imponible.total)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold">Cotizaciones</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>AFP:</span>
                    <span>{formatearCLP(resultado.cotizaciones.afp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salud (7%):</span>
                    <span>{formatearCLP(resultado.cotizaciones.salud)}</span>
                  </div>
                  {resultado.entrada.cotizacionAdicionalUF && resultado.entrada.cotizacionAdicionalUF > 0 && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span className="ml-4">
                        (Incluye {resultado.entrada.cotizacionAdicionalUF.toString().replace('.', ',')} UF adicionales)
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>AFC:</span>
                    <span>{formatearCLP(resultado.cotizaciones.afc)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Cotizaciones:</span>
                    <span>{formatearCLP(resultado.cotizaciones.total)}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-3 sm:my-4" />

              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-semibold text-sm sm:text-base">No Imponible</h4>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">Colación:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.noImponible.colacion)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">Movilización:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.noImponible.movilizacion)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">Viático:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.noImponible.viatico)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">Desgaste:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.noImponible.desgaste)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">Asignación Familiar:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.noImponible.asignacionFamiliar)}</span>
                  </div>
                  <div className="flex justify-between items-center font-semibold pt-2 mt-2 border-t text-sm sm:text-base">
                    <span>Total No Imponible:</span>
                    <span className="tabular-nums">{formatearCLP(resultado.noImponible.total)}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-3 sm:my-4" />

              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-semibold text-sm sm:text-base">Impuesto Único</h4>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">Base Tributable:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.impuesto.baseTributable)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">Impuesto Único:</span>
                    <span className="font-medium tabular-nums text-red-600 dark:text-red-400">{formatearCLP(resultado.impuesto.impuestoUnico)}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-3 sm:my-4" />

              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-semibold text-sm sm:text-base">Costo Empleador</h4>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">SIS:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.empleador.sis)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">AFC:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.empleador.afc)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">Mutual:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.empleador.mutual)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors">
                    <span className="text-muted-foreground">Reforma Previsional:</span>
                    <span className="font-medium tabular-nums">{formatearCLP(resultado.empleador.reformaPrevisional)}</span>
                  </div>
                  <div className="flex justify-between items-center font-semibold pt-2 mt-2 border-t text-sm sm:text-base">
                    <span>Costo Total:</span>
                    <span className="tabular-nums text-blue-600 dark:text-blue-400">{formatearCLP(resultado.empleador.costoTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
