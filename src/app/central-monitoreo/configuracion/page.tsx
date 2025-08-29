'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Configuracion {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  instalacion_telefono?: string;
  habilitado: boolean;
  intervalo_minutos: number;
  ventana_inicio: string;
  ventana_fin: string;
  modo: string;
  mensaje_template: string;
}

export default function ConfiguracionPage() {
  const [configuraciones, setConfiguraciones] = useState<Configuracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const cargarConfiguraciones = async () => {
    try {
      const res = await fetch('/api/central-monitoring/config');
      const data = await res.json();
      if (data.success) {
        setConfiguraciones(data.data);
      }
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async (config: Configuracion) => {
    setSaving(prev => ({ ...prev, [config.id]: true }));
    try {
      const res = await fetch('/api/central-monitoring/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: "Configuración guardada",
          description: `Configuración actualizada para ${config.instalacion_nombre}`,
        });
        await cargarConfiguraciones();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(prev => ({ ...prev, [config.id]: false }));
    }
  };

  const actualizarCampo = (id: string, campo: keyof Configuracion, valor: any) => {
    setConfiguraciones(prev => 
      prev.map(config => 
        config.id === id ? { ...config, [campo]: valor } : config
      )
    );
  };

  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando configuraciones...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">⚙️ Configuración de Monitoreo</h1>
          <p className="text-sm text-gray-600">
            Configuración de cadencia y ventanas por instalación
          </p>
        </div>
      </div>

      {/* Configuraciones */}
      <div className="space-y-4">
        {configuraciones.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <p>No hay configuraciones de monitoreo</p>
              <p className="text-sm">Las configuraciones se crean automáticamente</p>
            </CardContent>
          </Card>
        ) : (
          configuraciones.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{config.instalacion_nombre}</CardTitle>
                    {config.instalacion_telefono && (
                      <p className="text-sm text-gray-600">📞 {config.instalacion_telefono}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`habilitado-${config.id}`}>Habilitado</Label>
                    <Switch
                      id={`habilitado-${config.id}`}
                      checked={config.habilitado}
                      onCheckedChange={(checked) => {
                        actualizarCampo(config.id, 'habilitado', checked);
                        guardarConfiguracion({ ...config, habilitado: checked });
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`intervalo-${config.id}`}>Intervalo (minutos)</Label>
                    <Input
                      id={`intervalo-${config.id}`}
                      type="number"
                      min="15"
                      max="180"
                      value={config.intervalo_minutos}
                      onChange={(e) => actualizarCampo(config.id, 'intervalo_minutos', parseInt(e.target.value))}
                      onBlur={() => guardarConfiguracion(config)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`inicio-${config.id}`}>Inicio (HH:MM)</Label>
                    <Input
                      id={`inicio-${config.id}`}
                      type="time"
                      value={config.ventana_inicio}
                      onChange={(e) => actualizarCampo(config.id, 'ventana_inicio', e.target.value)}
                      onBlur={() => guardarConfiguracion(config)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fin-${config.id}`}>Fin (HH:MM)</Label>
                    <Input
                      id={`fin-${config.id}`}
                      type="time"
                      value={config.ventana_fin}
                      onChange={(e) => actualizarCampo(config.id, 'ventana_fin', e.target.value)}
                      onBlur={() => guardarConfiguracion(config)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`template-${config.id}`}>Mensaje Template</Label>
                  <Textarea
                    id={`template-${config.id}`}
                    value={config.mensaje_template}
                    onChange={(e) => actualizarCampo(config.id, 'mensaje_template', e.target.value)}
                    onBlur={() => guardarConfiguracion(config)}
                    placeholder="Central de Monitoreo GARD: Confirmar estado de turno en {instalacion} a las {hora}."
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables: {'{instalacion}'} = nombre instalación, {'{hora}'} = hora del llamado
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => guardarConfiguracion(config)}
                    disabled={saving[config.id]}
                    size="sm"
                  >
                    {saving[config.id] ? 'Guardando...' : '💾 Guardar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
