"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { instalacionesApi, guardiasApi } from '@/lib/api/payroll';
import { planillasApi } from '@/lib/api/planillas';
import BackToPayroll from '@/components/BackToPayroll';

export default function PayrollCalculosPage() {
  const [instalaciones, setInstalaciones] = useState<any[]>([]);
  const [instalacionId, setInstalacionId] = useState<string>("");
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [guardias, setGuardias] = useState<any[]>([]);
  const [guardiaSeleccionada, setGuardiaSeleccionada] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await instalacionesApi.getInstalaciones();
        setInstalaciones(r.data || []);
        if (r.data?.length) {
          // Buscar "Condominio La Florida" que sabemos que tiene guardias
          const instalacionConGuardias = r.data.find(inst => 
            inst.nombre === "Condominio La Florida" || 
            inst.id === "254b6b4a-6d74-4f1a-a1ca-d3e23960998c"
          );
          setInstalacionId(instalacionConGuardias?.id || r.data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!instalacionId) return;
      try {
        const g = await guardiasApi.getGuardias(instalacionId);
        setGuardias(g.data || []);
      } catch (e) {
        console.error('Error cargando guardias:', e);
      }
    })();
  }, [instalacionId]);

  const kpis = useMemo(() => {
    if (!result?.planilla) return null;
    const p = result.planilla as any[];
    const ok = p.filter(x => !x.error);
    return {
      totalGuardias: result.totales?.totalGuardias ?? ok.length,
      totalLiquido: ok.reduce((s, x) => s + (x.resultado?.sueldoLiquido || 0), 0),
      totalImponible: ok.reduce((s, x) => s + (x.resultado?.imponible?.total || 0), 0),
      costoEmpleador: ok.reduce((s, x) => s + (x.resultado?.empleador?.costoTotal || 0), 0),
    };
  }, [result]);

  const generarPlanilla = async () => {
    try {
      setLoading(true);
      const r = await planillasApi.generar({ mes, anio, incluirTurnosExtras: true });
      setResult(r);
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || 'Error al generar');
    } finally {
      setLoading(false);
    }
  };

  const calcularGuardiaIndividual = async () => {
    if (!guardiaSeleccionada) {
      alert('Selecciona un guardia para calcular');
      return;
    }
    
    try {
      setLoading(true);
      const r = await planillasApi.generar({ 
        mes, 
        anio, 
        incluirTurnosExtras: true,
        guardiaId: guardiaSeleccionada 
      });
      setResult(r);
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || 'Error al calcular');
    } finally {
      setLoading(false);
    }
  };

  const exportar = () => planillasApi.descargarXlsx({ mes, anio, incluirTurnosExtras: true });

  return (
    <div className="p-6 space-y-6">
      <BackToPayroll />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cálculo de Sueldos</h1>
          <p className="text-sm text-muted-foreground">
            Genera planillas completas por instalación o calcula sueldo individual por guardia
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generarPlanilla} disabled={!instalacionId || loading}>
            {loading ? 'Calculando...' : 'Generar Planilla Completa'}
          </Button>
          <Button 
            onClick={calcularGuardiaIndividual} 
            disabled={!guardiaSeleccionada || loading}
            variant="outline"
          >
            {loading ? 'Calculando...' : 'Calcular Guardia Individual'}
          </Button>
          <Button variant="outline" onClick={exportar} disabled={!result}>Exportar XLSX</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Instalación</Label>
            <Select value={instalacionId} onValueChange={setInstalacionId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar instalación" />
              </SelectTrigger>
              <SelectContent>
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
            <Label>Guardia (Individual)</Label>
            <Select value={guardiaSeleccionada} onValueChange={setGuardiaSeleccionada}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar guardia" />
              </SelectTrigger>
              <SelectContent>
                {guardias.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nombre_completo} - {g.rut}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Total Guardias</Label>
            <div className="text-sm text-muted-foreground pt-2">{guardias.length} activos</div>
          </div>
        </CardContent>
      </Card>

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle>Total Guardias</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.totalGuardias}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Total Líquido</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${kpis.totalLiquido.toLocaleString('es-CL')}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Total Imponible</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${kpis.totalImponible.toLocaleString('es-CL')}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Costo Empleador</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${kpis.costoEmpleador.toLocaleString('es-CL')}</div></CardContent></Card>
        </div>
      )}

      {result?.planilla && (
        <Card>
          <CardHeader>
            <CardTitle>
              {result.tipo === 'individual' ? 'Cálculo Individual' : 'Planilla Completa'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 text-left">Guardia</th>
                    <th className="p-2 text-right">Imponible</th>
                    <th className="p-2 text-right">No Imponible</th>
                    <th className="p-2 text-right">Cotizaciones</th>
                    <th className="p-2 text-right">Impuesto</th>
                    <th className="p-2 text-right">Descuentos</th>
                    <th className="p-2 text-right">Líquido</th>
                    <th className="p-2 text-right">Costo Empleador</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.planilla as any[]).map((row, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">
                        <div className="font-medium">{row.guardia?.nombre}</div>
                        {row.error && <Badge className="bg-red-100 text-red-700">Error</Badge>}
                      </td>
                      <td className="p-2 text-right">${(row.resultado?.imponible?.total || 0).toLocaleString('es-CL')}</td>
                      <td className="p-2 text-right">${(row.resultado?.noImponible?.total || 0).toLocaleString('es-CL')}</td>
                      <td className="p-2 text-right">${(row.resultado?.cotizaciones?.total || 0).toLocaleString('es-CL')}</td>
                      <td className="p-2 text-right">${(row.resultado?.impuesto?.impuestoUnico || 0).toLocaleString('es-CL')}</td>
                      <td className="p-2 text-right">${(row.resultado?.descuentos?.total || 0).toLocaleString('es-CL')}</td>
                      <td className="p-2 text-right">${(row.resultado?.sueldoLiquido || 0).toLocaleString('es-CL')}</td>
                      <td className="p-2 text-right">${(row.resultado?.empleador?.costoTotal || 0).toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


