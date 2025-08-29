"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building,
  Download,
  BarChart3,
  PieChart,
  FileText,
  Calendar,
  Calculator
} from 'lucide-react';
import BackToPayroll from '@/components/BackToPayroll';

export default function PayrollReportesPage() {
  const [activeTab, setActiveTab] = useState('costos');
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [instalacionId, setInstalacionId] = useState<string>("");
  const [instalaciones, setInstalaciones] = useState<any[]>([]);
  const [reporteData, setReporteData] = useState<any>(null);

  useEffect(() => {
    cargarInstalaciones();
  }, []);

  const cargarInstalaciones = async () => {
    try {
      const response = await fetch('/api/payroll/instalaciones');
      if (response.ok) {
        const data = await response.json();
        setInstalaciones(data.data || []);
        if (data.data?.length) {
          setInstalacionId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error al cargar instalaciones:', error);
    }
  };

  const generarReporte = async (tipo: string) => {
    setLoading(true);
    try {
      // TODO: Implementar llamadas a APIs de reportes
      console.log(`Generando reporte de ${tipo} para ${mes}/${anio}`);
      
      // Simular datos de reporte
      setTimeout(() => {
        setReporteData({
          tipo,
          periodo: `${mes}/${anio}`,
          instalacion: instalaciones.find(i => i.id === instalacionId)?.nombre || 'Todas',
          datos: generarDatosSimulados(tipo)
        });
        setLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error al generar reporte:', error);
      setLoading(false);
    }
  };

  const generarDatosSimulados = (tipo: string) => {
    switch (tipo) {
      case 'costos':
        return {
          totalSueldos: 45000000,
          totalCotizaciones: 8500000,
          totalCostoEmpleador: 58000000,
          desglose: [
            { concepto: 'Sueldos Líquidos', monto: 45000000, porcentaje: 77.6 },
            { concepto: 'AFP', monto: 4500000, porcentaje: 7.8 },
            { concepto: 'Salud', monto: 3150000, porcentaje: 5.4 },
            { concepto: 'Mutual', monto: 405000, porcentaje: 0.7 },
            { concepto: 'SIS', monto: 450000, porcentaje: 0.8 },
            { concepto: 'Reforma Previsional', monto: 450000, porcentaje: 0.8 }
          ]
        };
      case 'bonos':
        return {
          totalBonos: 8500000,
          bonosPorTipo: [
            { tipo: 'Asistencia', monto: 3200000, cantidad: 158 },
            { tipo: 'Responsabilidad', monto: 2800000, cantidad: 45 },
            { tipo: 'Nocturnidad', monto: 1800000, cantidad: 23 },
            { tipo: 'Festivos', monto: 700000, cantidad: 12 }
          ]
        };
      case 'guardias':
        return {
          totalGuardias: 158,
          activos: 145,
          inactivos: 13,
          porInstalacion: [
            { instalacion: 'Condominio La Florida', cantidad: 6, sueldoPromedio: 550000 },
            { instalacion: 'Edificio Centro', cantidad: 8, sueldoPromedio: 520000 },
            { instalacion: 'Residencial Norte', cantidad: 4, sueldoPromedio: 580000 }
          ]
        };
      default:
        return {};
    }
  };

  const exportarReporte = (formato: 'excel' | 'pdf') => {
    if (!reporteData) return;
    
    console.log(`Exportando reporte ${reporteData.tipo} en formato ${formato}`);
    // TODO: Implementar exportación real
    alert(`Reporte exportado en formato ${formato.toUpperCase()}`);
  };

  return (
    <div className="p-6 space-y-6">
      <BackToPayroll />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reportes de Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Genera reportes y análisis detallados de costos laborales
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => exportarReporte('excel')} 
            disabled={!reporteData}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button 
            onClick={() => exportarReporte('pdf')} 
            disabled={!reporteData}
            variant="outline"
          >
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Instalación</Label>
            <Select value={instalacionId} onValueChange={setInstalacionId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las instalaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las instalaciones</SelectItem>
                {instalaciones.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mes</Label>
            <Select value={mes.toString()} onValueChange={(value) => setMes(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(2024, m - 1).toLocaleDateString('es-CL', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Año</Label>
            <Input 
              type="number" 
              value={anio} 
              onChange={e => setAnio(parseInt(e.target.value))}
              placeholder="2025"
            />
          </div>
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button 
              onClick={() => generarReporte(activeTab)} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generando...' : 'Generar Reporte'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="costos" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Costos Laborales
          </TabsTrigger>
          <TabsTrigger value="bonos" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Bonos y Descuentos
          </TabsTrigger>
          <TabsTrigger value="guardias" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Análisis por Guardia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="costos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Análisis de Costos Laborales
              </CardTitle>
              <CardDescription>
                Desglose detallado de todos los costos asociados a la nómina
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {reporteData?.tipo === 'costos' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 dark:bg-blue-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium">Total Sueldos</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          ${reporteData.datos.totalSueldos.toLocaleString('es-CL')}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 dark:bg-green-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">Cotizaciones</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          ${reporteData.datos.totalCotizaciones.toLocaleString('es-CL')}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 dark:bg-orange-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-orange-600" />
                          <span className="text-sm font-medium">Costo Empleador</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">
                          ${reporteData.datos.totalCostoEmpleador.toLocaleString('es-CL')}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <Label>Desglose de Costos</Label>
                    <div className="space-y-2">
                      {reporteData.datos.desglose.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{item.concepto}</span>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">{item.porcentaje}%</Badge>
                            <span className="font-bold">${item.monto.toLocaleString('es-CL')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Análisis de Bonos y Descuentos
              </CardTitle>
              <CardDescription>
                Distribución de bonos por tipo y guardias que los reciben
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {reporteData?.tipo === 'bonos' && (
                <>
                  <Card className="bg-purple-50 dark:bg-purple-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium">Total Bonos</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        ${reporteData.datos.totalBonos.toLocaleString('es-CL')}
                      </p>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label>Bonos por Tipo</Label>
                    <div className="space-y-2">
                      {reporteData.datos.bonosPorTipo.map((bono: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{bono.tipo}</span>
                            <p className="text-sm text-muted-foreground">
                              {bono.cantidad} guardias
                            </p>
                          </div>
                          <span className="font-bold">${bono.monto.toLocaleString('es-CL')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Análisis por Guardia
              </CardTitle>
              <CardDescription>
                Estadísticas de guardias activos y distribución por instalación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {reporteData?.tipo === 'guardias' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 dark:bg-blue-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium">Total Guardias</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {reporteData.datos.totalGuardias}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 dark:bg-green-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">Activos</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {reporteData.datos.activos}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 dark:bg-red-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium">Inactivos</span>
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                          {reporteData.datos.inactivos}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <Label>Distribución por Instalación</Label>
                    <div className="space-y-2">
                      {reporteData.datos.porInstalacion.map((inst: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{inst.instalacion}</span>
                            <p className="text-sm text-muted-foreground">
                              Sueldo promedio: ${inst.sueldoPromedio.toLocaleString('es-CL')}
                            </p>
                          </div>
                          <Badge variant="outline">{inst.cantidad} guardias</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

