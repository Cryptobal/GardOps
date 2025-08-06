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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SueldoInput, SueldoResultado } from '@/lib/sueldo/tipos/sueldo';
import { formatearCLP } from '@/lib/sueldo/utils/redondeo';
import { Settings, Calculator, TrendingUp, DollarSign, FileText, Shield, Users, Building2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState("resumen");

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Calculadora de Sueldos
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Cálculo completo según normativa chilena 2025
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                Actualizado 2025
              </Badge>
              <Link href="/sueldos/parametros">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Settings className="h-4 w-4 mr-2" />
                  Parámetros
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="xl:col-span-1">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Datos de Entrada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Building2 className="h-4 w-4" />
                    Información Básica
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sueldoBase" className="text-sm font-medium">
                        Sueldo Base *
                      </Label>
                      <Input
                        id="sueldoBase"
                        type="number"
                        value={input.sueldoBase || ''}
                        onChange={(e) => handleInputChange('sueldoBase', Number(e.target.value) || 0)}
                        placeholder="550.000"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fecha" className="text-sm font-medium">
                        Fecha *
                      </Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={input.fecha.toISOString().split('T')[0]}
                        onChange={(e) => handleInputChange('fecha', new Date(e.target.value))}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="afp" className="text-sm font-medium">
                        AFP *
                      </Label>
                      <Select value={input.afp} onValueChange={(value) => handleInputChange('afp', value)}>
                        <SelectTrigger className="h-10">
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

                    <div className="space-y-2">
                      <Label htmlFor="tipoContrato" className="text-sm font-medium">
                        Tipo de Contrato
                      </Label>
                      <Select value={input.tipoContrato} onValueChange={(value) => handleInputChange('tipoContrato', value)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="indefinido">Indefinido</SelectItem>
                          <SelectItem value="plazo_fijo">Plazo Fijo</SelectItem>
                          <SelectItem value="obra_faena">Obra o Faena</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Horas Extras */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <TrendingUp className="h-4 w-4" />
                    Horas Extras
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="horas50" className="text-xs font-medium">
                        50% (Se consideran)
                      </Label>
                      <Input
                        id="horas50"
                        type="number"
                        value={input.horasExtras?.cincuenta || ''}
                        onChange={(e) => handleNestedInputChange('horasExtras', 'cincuenta', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="horas100" className="text-xs font-medium text-slate-500">
                        100% (No se consideran)
                      </Label>
                      <Input
                        id="horas100"
                        type="number"
                        value={input.horasExtras?.cien || ''}
                        onChange={(e) => handleNestedInputChange('horasExtras', 'cien', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10 bg-slate-50 dark:bg-slate-700"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* Bonos y Comisiones */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <DollarSign className="h-4 w-4" />
                    Bonos y Comisiones
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="comisiones" className="text-xs font-medium">
                        Comisiones
                      </Label>
                      <Input
                        id="comisiones"
                        type="number"
                        value={input.comisiones || ''}
                        onChange={(e) => handleInputChange('comisiones', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nocturnidad" className="text-xs font-medium">
                        Bono Nocturnidad
                      </Label>
                      <Input
                        id="nocturnidad"
                        type="number"
                        value={input.bonos?.nocturnidad || ''}
                        onChange={(e) => handleNestedInputChange('bonos', 'nocturnidad', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* No Imponible */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Shield className="h-4 w-4" />
                    No Imponible
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="colacion" className="text-xs font-medium">
                        Colación
                      </Label>
                      <Input
                        id="colacion"
                        type="number"
                        value={input.noImponible?.colacion || ''}
                        onChange={(e) => handleNestedInputChange('noImponible', 'colacion', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="movilizacion" className="text-xs font-medium">
                        Movilización
                      </Label>
                      <Input
                        id="movilizacion"
                        type="number"
                        value={input.noImponible?.movilizacion || ''}
                        onChange={(e) => handleNestedInputChange('noImponible', 'movilizacion', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Descuentos */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Users className="h-4 w-4" />
                    Descuentos
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="anticipos" className="text-xs font-medium">
                        Anticipos
                      </Label>
                      <Input
                        id="anticipos"
                        type="number"
                        value={input.anticipos || ''}
                        onChange={(e) => handleInputChange('anticipos', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="judiciales" className="text-xs font-medium">
                        Judiciales
                      </Label>
                      <Input
                        id="judiciales"
                        type="number"
                        value={input.judiciales || ''}
                        onChange={(e) => handleInputChange('judiciales', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleCalcular} 
                  disabled={loading || !isFormValid}
                  size="lg"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Calculando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Calcular Sueldo
                    </div>
                  )}
                </Button>

                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resultados */}
          {resultado && (
            <div className="xl:col-span-2">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Resultado del Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="resumen">Resumen</TabsTrigger>
                      <TabsTrigger value="imponible">Imponible</TabsTrigger>
                      <TabsTrigger value="cotizaciones">Cotizaciones</TabsTrigger>
                      <TabsTrigger value="empleador">Empleador</TabsTrigger>
                    </TabsList>

                    {/* Resumen */}
                    <TabsContent value="resumen" className="space-y-6">
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-2">
                            Sueldo Líquido
                          </h3>
                          <p className="text-3xl sm:text-4xl font-bold text-green-700 dark:text-green-300">
                            {formatearCLP(resultado.sueldoLiquido)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Imponible</div>
                          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            {formatearCLP(resultado.imponible.total)}
                          </div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                          <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">Cotizaciones</div>
                          <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                            {formatearCLP(resultado.cotizaciones.total)}
                          </div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                          <div className="text-sm text-red-600 dark:text-red-400 font-medium">Impuesto Único</div>
                          <div className="text-lg font-bold text-red-700 dark:text-red-300">
                            {formatearCLP(resultado.impuesto.impuestoUnico)}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Imponible */}
                    <TabsContent value="imponible" className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">Sueldo Base:</span>
                          <span className="font-bold">{formatearCLP(resultado.imponible.sueldoBase)}</span>
                        </div>
                        
                        {resultado.imponible.descuentoDiasAusencia > 0 && (
                          <>
                            <div className="flex justify-between items-center py-2 px-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <span className="font-medium text-red-700 dark:text-red-400">Descuento por Días de Ausencia:</span>
                              <span className="font-bold text-red-700 dark:text-red-400">-{formatearCLP(resultado.imponible.descuentoDiasAusencia)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <span className="font-medium">Sueldo Base Ajustado:</span>
                              <span className="font-bold">{formatearCLP(resultado.imponible.sueldoBaseAjustado)}</span>
                            </div>
                          </>
                        )}
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">Gratificación Legal:</span>
                          <span className="font-bold">{formatearCLP(resultado.imponible.gratificacionLegal)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">Horas Extras (50%):</span>
                          <span className="font-bold">{formatearCLP(resultado.imponible.horasExtras)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">Comisiones:</span>
                          <span className="font-bold">{formatearCLP(resultado.imponible.comisiones)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">Bonos:</span>
                          <span className="font-bold">{formatearCLP(resultado.imponible.bonos)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                          <span className="font-bold">Total Imponible:</span>
                          <span className="font-bold text-lg">{formatearCLP(resultado.imponible.total)}</span>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Cotizaciones */}
                    <TabsContent value="cotizaciones" className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">AFP ({resultado.entrada.afp.toUpperCase()}):</span>
                          <span className="font-bold">{formatearCLP(resultado.cotizaciones.afp)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">Salud:</span>
                          <span className="font-bold">{formatearCLP(resultado.cotizaciones.salud)}</span>
                        </div>
                        
                        {resultado.entrada.cotizacionAdicionalUF && resultado.entrada.cotizacionAdicionalUF > 0 && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 px-3">
                            Incluye {resultado.entrada.cotizacionAdicionalUF.toString().replace('.', ',')} UF adicionales
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">AFC:</span>
                          <span className="font-bold">{formatearCLP(resultado.cotizaciones.afc)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
                          <span className="font-bold">Total Cotizaciones:</span>
                          <span className="font-bold text-lg">{formatearCLP(resultado.cotizaciones.total)}</span>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Empleador */}
                    <TabsContent value="empleador" className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">SIS:</span>
                          <span className="font-bold">{formatearCLP(resultado.empleador.sis)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">AFC:</span>
                          <span className="font-bold">{formatearCLP(resultado.empleador.afc)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">Mutual:</span>
                          <span className="font-bold">{formatearCLP(resultado.empleador.mutual)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="font-medium">Reforma Previsional:</span>
                          <span className="font-bold">{formatearCLP(resultado.empleador.reformaPrevisional)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                          <span className="font-bold">Costo Total Empleador:</span>
                          <span className="font-bold text-lg text-blue-700 dark:text-blue-300">{formatearCLP(resultado.empleador.costoTotal)}</span>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
