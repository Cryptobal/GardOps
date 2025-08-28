'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Satellite, Clock, MessageSquare, AlertCircle } from 'lucide-react';

interface MonitoreoConfig {
  id?: string;
  instalacion_id: string;
  habilitado: boolean;
  intervalo_minutos: number;
  ventana_inicio: string;
  ventana_fin: string;
  modo: string;
  mensaje_template: string;
}

interface MonitoreoInstalacionProps {
  instalacionId: string;
  instalacionNombre: string;
  effectivePermissions: Record<string, string[]>;
}

export default function MonitoreoInstalacion({ 
  instalacionId, 
  instalacionNombre, 
  effectivePermissions 
}: MonitoreoInstalacionProps) {
  const [config, setConfig] = useState<MonitoreoConfig | null>(null);
  const [configOriginal, setConfigOriginal] = useState<MonitoreoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const canConfigure = effectivePermissions['central_monitoring']?.includes('update') || 
                      effectivePermissions['central_monitoring']?.includes('create') || 
                      effectivePermissions['central_monitoring']?.includes('configure') || 
                      false;

  useEffect(() => {
    cargarConfiguracion();
  }, [instalacionId]);

  const cargarConfiguracion = async () => {
    try {
      const res = await fetch(`/api/central-monitoring/config?instalacion_id=${instalacionId}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const configData = data.data[0];
        setConfig(configData);
        setConfigOriginal(configData);
      } else {
        // Si no hay configuración, crear una por defecto
        const defaultConfig: MonitoreoConfig = {
          instalacion_id: instalacionId,
          habilitado: false,
          intervalo_minutos: 60,
          ventana_inicio: '21:00',
          ventana_fin: '07:00',
          modo: 'fijo',
          mensaje_template: `Central de Monitoreo GARD: Confirmar estado de turno en ${instalacionNombre} a las {hora}.`
        };
        setConfig(defaultConfig);
        setConfigOriginal(null); // No hay configuración original
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      // En caso de error, crear configuración por defecto
      const defaultConfig: MonitoreoConfig = {
        instalacion_id: instalacionId,
        habilitado: false,
        intervalo_minutos: 60,
        ventana_inicio: '21:00',
        ventana_fin: '07:00',
        modo: 'fijo',
        mensaje_template: `Central de Monitoreo GARD: Confirmar estado de turno en ${instalacionNombre} a las {hora}.`
      };
      setConfig(defaultConfig);
      setConfigOriginal(null);
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async () => {
    if (!canConfigure || !config) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para configurar monitoreo",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
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
          description: `Configuración de monitoreo actualizada para ${instalacionNombre}`,
        });
        // Actualizar la configuración original para reflejar los cambios guardados
        setConfigOriginal(data.data);
        setConfig(data.data);
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
      setSaving(false);
    }
  };

  const actualizarCampo = (campo: keyof MonitoreoConfig, valor: any) => {
    setConfig(prev => prev ? { ...prev, [campo]: valor } : null);
  };

  // Detectar si hay cambios pendientes
  const hayCambios = config && configOriginal && (
    config.habilitado !== configOriginal.habilitado ||
    config.intervalo_minutos !== configOriginal.intervalo_minutos ||
    config.ventana_inicio !== configOriginal.ventana_inicio ||
    config.ventana_fin !== configOriginal.ventana_fin ||
    config.mensaje_template !== configOriginal.mensaje_template
  );

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando configuración de monitoreo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5" />
            Configuración de Monitoreo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configura los parámetros de monitoreo para esta instalación
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estado del monitoreo */}
          <div className={`flex items-center justify-between p-4 rounded-lg ${hayCambios && configOriginal?.habilitado !== config.habilitado ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800' : 'bg-muted/50'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${config.habilitado ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <div>
                <Label className="text-base font-medium">
                  Monitoreo {config.habilitado ? 'Activo' : 'Inactivo'}
                  {hayCambios && configOriginal?.habilitado !== config.habilitado && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Cambio pendiente
                    </span>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {config.habilitado 
                    ? 'Esta instalación será monitoreada por la Central de Monitoreo'
                    : 'Esta instalación no será monitoreada'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={config.habilitado}
              onCheckedChange={(checked) => {
                actualizarCampo('habilitado', checked);
              }}
              disabled={!canConfigure}
            />
          </div>

          {/* Configuración de horarios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="intervalo" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Intervalo (minutos)
              </Label>
              <Input
                id="intervalo"
                type="number"
                min="15"
                max="180"
                value={config.intervalo_minutos}
                onChange={(e) => actualizarCampo('intervalo_minutos', parseInt(e.target.value))}
                disabled={!canConfigure}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cada cuántos minutos se realizarán los llamados
              </p>
            </div>
            <div>
              <Label htmlFor="inicio">Inicio (HH:MM)</Label>
              <Input
                id="inicio"
                type="time"
                value={config.ventana_inicio}
                onChange={(e) => actualizarCampo('ventana_inicio', e.target.value)}
                disabled={!canConfigure}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Hora de inicio del monitoreo
              </p>
            </div>
            <div>
              <Label htmlFor="fin">Fin (HH:MM)</Label>
              <Input
                id="fin"
                type="time"
                value={config.ventana_fin}
                onChange={(e) => actualizarCampo('ventana_fin', e.target.value)}
                disabled={!canConfigure}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Hora de fin del monitoreo
              </p>
            </div>
          </div>

          {/* Mensaje template */}
          <div>
            <Label htmlFor="template" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensaje Template
            </Label>
            <Textarea
              id="template"
              value={config.mensaje_template}
              onChange={(e) => actualizarCampo('mensaje_template', e.target.value)}
              disabled={!canConfigure}
              placeholder="Central de Monitoreo GARD: Confirmar estado de turno en {instalacion} a las {hora}."
              rows={3}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variables: {'{instalacion}'} = nombre instalación, {'{hora}'} = hora del llamado
            </p>
          </div>

          {/* Información adicional */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Información importante</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                  <li>• El monitoreo solo se activará si hay turnos asignados en esta instalación</li>
                  <li>• Los llamados se realizarán durante la ventana horaria configurada</li>
                  <li>• El intervalo mínimo es de 15 minutos y máximo de 180 minutos</li>
                  <li>• Los mensajes se enviarán por WhatsApp usando el template configurado</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botón guardar */}
          <div className="flex justify-end">
            <Button
              onClick={guardarConfiguracion}
              disabled={saving || !canConfigure || !hayCambios}
              className={`flex items-center gap-2 ${hayCambios ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            >
              {saving ? 'Guardando...' : hayCambios ? '💾 Guardar Cambios' : '✅ Configuración Guardada'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
