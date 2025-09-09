"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [savingSwitch, setSavingSwitch] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const cargarConfiguraciones = async () => {
    try {
      const res = await fetch('/api/central-monitoring/config');
      const data = await res.json();
      if (data.success) {
        setConfiguraciones(data.data);
      }
    } catch (error) {
      logger.error('Error cargando configuraciones::', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para guardar solo el switch de monitoreo activo
  const guardarSwitchMonitoreo = async (config: Configuracion, habilitado: boolean) => {
    setSavingSwitch(prev => ({ ...prev, [config.id]: true }));
    try {
      const res = await fetch('/api/central-monitoring/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, habilitado })
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: "Monitoreo actualizado",
          description: `Monitoreo ${habilitado ? 'activado' : 'desactivado'} para ${config.instalacion_nombre}`,
        });
        // Actualizar solo el campo habilitado en el estado local
        setConfiguraciones(prev => 
          prev.map(c => c.id === config.id ? { ...c, habilitado } : c)
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error('Error guardando switch de monitoreo::', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del monitoreo",
        variant: "destructive"
      });
      // Revertir el cambio en caso de error
      setConfiguraciones(prev => 
        prev.map(c => c.id === config.id ? { ...c, habilitado: !habilitado } : c)
      );
    } finally {
      setSavingSwitch(prev => ({ ...prev, [config.id]: false }));
    }
  };

  // Función para guardar configuración completa (método y mensaje)
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
      logger.error('Error guardando configuración::', error);
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
                    <Label htmlFor={`habilitado-${config.id}`}>Monitoreo Activo</Label>
                    <Switch
                      id={`habilitado-${config.id}`}
                      checked={config.habilitado}
                      disabled={savingSwitch[config.id]}
                      onCheckedChange={(checked) => {
                        // Guardar automáticamente al cambiar el switch
                        guardarSwitchMonitoreo(config, checked);
                      }}
                    />
                    {savingSwitch[config.id] && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Configuración Básica - Se guarda automáticamente */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-gray-700">📋 Configuración Básica</h3>
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
                      <Label htmlFor={`inicio-${config.id}`}>Ventana de Monitoreo</Label>
                      <Input
                        id={`inicio-${config.id}`}
                        type="time"
                        value={config.ventana_inicio}
                        onChange={(e) => actualizarCampo(config.id, 'ventana_inicio', e.target.value)}
                        onBlur={() => guardarConfiguracion(config)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`fin-${config.id}`}>&nbsp;</Label>
                      <Input
                        id={`fin-${config.id}`}
                        type="time"
                        value={config.ventana_fin}
                        onChange={(e) => actualizarCampo(config.id, 'ventana_fin', e.target.value)}
                        onBlur={() => guardarConfiguracion(config)}
                      />
                    </div>
                  </div>
                </div>

                {/* Método de Contacto y Mensaje - Requiere botón Guardar */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-gray-700">📞 Contacto y Mensaje</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`modo-${config.id}`}>Método</Label>
                      <Select
                        value={config.modo}
                        onValueChange={(valor) => actualizarCampo(config.id, 'modo', valor)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="telefono">Teléfono</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`template-${config.id}`}>Mensaje</Label>
                      <Textarea
                        id={`template-${config.id}`}
                        value={config.mensaje_template}
                        onChange={(e) => actualizarCampo(config.id, 'mensaje_template', e.target.value)}
                        placeholder="Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?"
                        rows={2}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Variables: {'{instalacion}'} = nombre instalación, {'{hora}'} = hora del llamado
                      </p>
                    </div>
                  </div>
                  
                  {/* Botón Guardar solo para método y mensaje */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => guardarConfiguracion(config)}
                      disabled={saving[config.id]}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving[config.id] ? 'Guardando...' : '💾 Guardar Cambios'}
                    </Button>
                  </div>
                </div>

                {/* Información */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">ℹ️ Información</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Llamadas automáticas según pauta</li>
                    <li>• Solo en ventana configurada</li>
                    <li>• Estados: Pendiente, Exitoso, No contesta, Incidente</li>
                    <li>• Usa teléfono de instalación o guardia</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
