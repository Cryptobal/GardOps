"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Calculator, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Lock,
  Eye,
  Users
} from 'lucide-react';
import BackToPayroll from '@/components/BackToPayroll';

export default function PayrollParametrosPage() {
  const [activeTab, setActiveTab] = useState('afp');
  const [loading, setLoading] = useState(false);
  const [parametros, setParametros] = useState({
    afp: [],
    isapre: [],
    tramos: [],
    uf: { valor: 0, fecha: '' },
    generales: {}
  });

  useEffect(() => {
    cargarParametros();
    cargarValoresUTMUF();
  }, []);

  const cargarParametros = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payroll/parametros');
      if (response.ok) {
        const data = await response.json();
        setParametros(data.data);
      } else {
        console.error('Error al cargar parámetros');
      }
    } catch (error) {
      console.error('Error al cargar parámetros:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarValoresUTMUF = async () => {
    try {
      const response = await fetch('/api/payroll/valores-utm-uf');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Actualizar valores UF
          const ufInput = document.getElementById('uf-valor') as HTMLInputElement;
          const ufFecha = document.getElementById('uf-fecha');
          if (ufInput && ufFecha) {
            ufInput.value = data.data.uf.valor.toString();
            ufFecha.textContent = `Actualizado: ${new Date(data.data.uf.fecha).toLocaleDateString('es-CL')}`;
          }
          
          // Actualizar valores UTM
          const utmInput = document.getElementById('utm-valor') as HTMLInputElement;
          const utmFecha = document.getElementById('utm-fecha');
          if (utmInput && utmFecha) {
            utmInput.value = data.data.utm.valor.toString();
            utmFecha.textContent = `Actualizado: ${new Date(data.data.utm.fecha).toLocaleDateString('es-CL')}`;
          }
        }
      } else {
        console.error('Error al cargar valores UF/UTM');
      }
    } catch (error) {
      console.error('Error al cargar valores UF/UTM:', error);
    }
  };



  return (
    <div className="p-6 space-y-6">
      <BackToPayroll />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Parámetros Generales</h1>
          <p className="text-sm text-muted-foreground">
            Visualiza y consulta AFP, ISAPRE, impuestos, valores UF/UTM y otros parámetros del sistema de payroll (solo lectura)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={cargarParametros} variant="outline" disabled={loading}>
            {loading ? 'Cargando...' : 'Recargar'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="afp" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            AFP
          </TabsTrigger>
          <TabsTrigger value="isapre" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            ISAPRE
          </TabsTrigger>
          <TabsTrigger value="impuestos" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Impuestos
          </TabsTrigger>
          <TabsTrigger value="asignacion" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Asignación Familiar
          </TabsTrigger>
          <TabsTrigger value="valores" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Valores UF/UTM
          </TabsTrigger>
          <TabsTrigger value="generales" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Generales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="afp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Administradoras de Fondos de Pensiones (AFP)
              </CardTitle>
              <CardDescription>
                Tasas de cotización y comisiones de las AFP (valores oficiales 2025 - solo lectura)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cotización Obligatoria - Solo Lectura */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cotizacionObligatoria" className="flex items-center gap-2">
                    Cotización Obligatoria (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="cotizacionObligatoria" 
                      type="number" 
                      step="0.01" 
                      placeholder="10.0"
                      defaultValue="10.0"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor fijo según normativa chilena
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cotizacionVoluntaria" className="flex items-center gap-2">
                    Cotización Voluntaria (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="cotizacionVoluntaria" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.0"
                      defaultValue="0.0"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configurado por el trabajador
                  </p>
                </div>
              </div>
              
              {/* AFP Disponibles con Tasas */}
              <div className="space-y-2">
                <Label>AFP Disponibles con Tasas de Comisión</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { nombre: 'AFP Capital', comision: 11.44, sis: 1.88, total: 13.32 },
                    { nombre: 'AFP Cuprum', comision: 11.44, sis: 1.88, total: 13.32 },
                    { nombre: 'AFP Habitat', comision: 11.27, sis: 1.88, total: 13.15 },
                    { nombre: 'AFP Modelo', comision: 10.77, sis: 1.88, total: 12.65 },
                    { nombre: 'AFP PlanVital', comision: 11.10, sis: 1.88, total: 12.98 },
                    { nombre: 'AFP ProVida', comision: 11.45, sis: 1.88, total: 13.33 },
                    { nombre: 'AFP UNO', comision: 10.69, sis: 1.88, total: 12.57 }
                  ].map((afp) => (
                    <div key={afp.nombre} className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{afp.nombre}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Comisión: {afp.comision}% | SIS: {afp.sis}%
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs">
                          Total: {afp.total}%
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Activa
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  Las tasas de AFP son valores oficiales 2025 y no pueden ser modificadas
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="isapre" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Instituciones de Salud Previsional (ISAPRE)
              </CardTitle>
              <CardDescription>
                Visualiza las tasas de cotización de salud (solo lectura)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cotizacionSalud" className="flex items-center gap-2">
                    Cotización Salud (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="cotizacionSalud" 
                      type="number" 
                      step="0.01" 
                      placeholder="7.0"
                      defaultValue="7.0"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tasa fija según normativa chilena
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>ISAPRE Disponibles</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {['Banmédica', 'Colmena', 'Consalud', 'Cruz Blanca', 'Fonasa', 'Vida Tres'].map((isapre) => (
                    <div key={isapre} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{isapre}</span>
                      <Badge variant="outline">Activa</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impuestos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Impuesto Único de Segunda Categoría
              </CardTitle>
              <CardDescription>
                Visualiza los tramos del impuesto único (editables)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tramos de Impuesto</Label>
                <div className="space-y-2">
                  {[
                    { desde: 0, hasta: 13.5, tasa: 0, rebaja: 0 },
                    { desde: 13.5, hasta: 30, tasa: 4, rebaja: 0.6 },
                    { desde: 30, hasta: 50, tasa: 8, rebaja: 1.8 },
                    { desde: 50, hasta: 70, tasa: 13.5, rebaja: 4.5 },
                    { desde: 70, hasta: 90, tasa: 23, rebaja: 10.5 },
                    { desde: 90, hasta: 120, tasa: 30.4, rebaja: 17.1 },
                    { desde: 120, hasta: null, tasa: 35, rebaja: 23.1 }
                  ].map((tramo, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium">
                          {tramo.desde} - {tramo.hasta || '∞'} UF
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{tramo.tasa}%</Badge>
                        <Badge variant="secondary">Rebaja: {tramo.rebaja} UF</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="asignacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Asignación Familiar
              </CardTitle>
              <CardDescription>
                Tramos de asignación familiar según ingresos del trabajador (solo lectura)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tramos de Asignación Familiar</Label>
                <div className="space-y-2">
                  {[
                    { tramo: '-', desde: 0, hasta: 0, monto: 0, descripcion: 'Sin asignación' },
                    { tramo: 'A', desde: 1, hasta: 620251, monto: 22007, descripcion: 'Tramo A - Bajo ingreso' },
                    { tramo: 'B', desde: 620252, hasta: 905941, monto: 13505, descripcion: 'Tramo B - Ingreso medio bajo' },
                    { tramo: 'C', desde: 905942, hasta: 1412957, monto: 4267, descripcion: 'Tramo C - Ingreso medio' },
                    { tramo: 'D', desde: 1412958, hasta: null, monto: 0, descripcion: 'Tramo D - Alto ingreso' }
                  ].map((tramo) => (
                    <div key={tramo.tramo} className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant={tramo.monto > 0 ? "default" : "secondary"} className="text-sm">
                            Tramo {tramo.tramo}
                          </Badge>
                          <span className="font-medium text-sm">{tramo.descripcion}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Ingresos: ${tramo.desde.toLocaleString('es-CL')} - {tramo.hasta ? `$${tramo.hasta.toLocaleString('es-CL')}` : 'Sin límite'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-sm">
                          ${tramo.monto.toLocaleString('es-CL')}
                        </Badge>
                        <Badge variant={tramo.monto > 0 ? "default" : "secondary"} className="text-xs">
                          {tramo.monto > 0 ? 'Activo' : 'Sin asignación'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  Los tramos de asignación familiar se aplican automáticamente según los ingresos del trabajador
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Valores UF/UTM en Tiempo Real
              </CardTitle>
              <CardDescription>
                Valores oficiales obtenidos desde la API de la CMF (solo lectura)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Valor UF Actual (Tiempo Real)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="39280.76"
                        defaultValue="39280.76"
                        id="uf-valor"
                        readOnly
                        className="w-full bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <Badge variant="secondary">CLP</Badge>
                    <Badge variant="outline" className="text-green-600">CMF</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span id="uf-fecha">Actualizado: Cargando...</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => cargarValoresUTMUF()}
                      className="h-6 px-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Valor UTM Actual (Tiempo Real)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="68647"
                        defaultValue="68647"
                        id="utm-valor"
                        readOnly
                        className="w-full bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <Badge variant="secondary">CLP</Badge>
                    <Badge variant="outline" className="text-green-600">CMF</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span id="utm-fecha">Actualizado: Cargando...</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  Los valores UF/UTM se obtienen automáticamente desde las APIs oficiales de la CMF
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Parámetros Generales
              </CardTitle>
              <CardDescription>
                Parámetros del sistema de payroll (solo lectura)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sueldoMinimo" className="flex items-center gap-2">
                    Sueldo Mínimo (CLP)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="sueldoMinimo" 
                      type="number" 
                      placeholder="529000"
                      defaultValue="529000"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horasSemanales" className="flex items-center gap-2">
                    Horas Semanales de Jornada
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="horasSemanales" 
                      type="number" 
                      placeholder="44"
                      defaultValue="44"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ufTopeImponible" className="flex items-center gap-2">
                    UF Tope Imponible
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="ufTopeImponible" 
                      type="number" 
                      step="0.01"
                      placeholder="87.8"
                      defaultValue="87.8"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horasExtras50" className="flex items-center gap-2">
                    Horas Extras 50% (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="horasExtras50" 
                      type="number" 
                      step="0.01" 
                      placeholder="50.0"
                      defaultValue="50.0"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horasExtras100" className="flex items-center gap-2">
                    Horas Extras 100% (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="horasExtras100" 
                      type="number" 
                      step="0.01" 
                      placeholder="100.0"
                      defaultValue="100.0"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asignacionFamiliar" className="flex items-center gap-2">
                    Asignación Familiar Base (CLP)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="asignacionFamiliar" 
                      type="number" 
                      placeholder="15000"
                      defaultValue="15000"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colacion" className="flex items-center gap-2">
                    Colación Diaria (CLP)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="colacion" 
                      type="number" 
                      placeholder="5000"
                      defaultValue="5000"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movilizacion" className="flex items-center gap-2">
                    Movilización Diaria (CLP)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="movilizacion" 
                      type="number" 
                      placeholder="3000"
                      defaultValue="3000"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gratificacionTope" className="flex items-center gap-2">
                    Tope Gratificación Mensual (CLP)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="gratificacionTope" 
                      type="number" 
                      placeholder="209396"
                      defaultValue="209396"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horasExtrasMax" className="flex items-center gap-2">
                    Horas Extras Máximo/Mes
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="horasExtrasMax" 
                      type="number" 
                      placeholder="60"
                      defaultValue="60"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="afcTrabajador" className="flex items-center gap-2">
                    AFC Trabajador Indefinido (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="afcTrabajador" 
                      type="number" 
                      step="0.01"
                      placeholder="0.6"
                      defaultValue="0.6"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="afcEmpleadorIndefinido" className="flex items-center gap-2">
                    AFC Empleador Indefinido (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="afcEmpleadorIndefinido" 
                      type="number" 
                      step="0.01"
                      placeholder="2.4"
                      defaultValue="2.4"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="afcEmpleadorPlazoFijo" className="flex items-center gap-2">
                    AFC Empleador Plazo Fijo (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="afcEmpleadorPlazoFijo" 
                      type="number" 
                      step="0.01"
                      placeholder="3.0"
                      defaultValue="3.0"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sisEmpleador" className="flex items-center gap-2">
                    SIS Empleador (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="sisEmpleador" 
                      type="number" 
                      step="0.01"
                      placeholder="1.88"
                      defaultValue="1.88"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reformaPrevisional" className="flex items-center gap-2">
                    Reforma Previsional (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="reformaPrevisional" 
                      type="number" 
                      step="0.01"
                      placeholder="1.0"
                      defaultValue="1.0"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mutualidadBase" className="flex items-center gap-2">
                    Mutualidad Base (%)
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input 
                      id="mutualidadBase" 
                      type="number" 
                      step="0.01"
                      placeholder="0.90"
                      defaultValue="0.90"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  Los parámetros generales son de solo lectura y se aplican automáticamente en los cálculos de sueldo
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
