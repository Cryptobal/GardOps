"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MilitaryTimeSelect } from '@/components/ui/military-time-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Satellite, Clock, MessageSquare, Phone, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth-client';
import { useSystemConfig } from '@/hooks/useSystemConfig';

interface MonitoreoConfig {
  habilitado: boolean;
  intervalo_minutos: number;
  ventana_inicio: string;
  ventana_fin: string;
  modo: 'whatsapp' | 'telefonico';
  mensaje_template: string;
}

interface MonitoreoInstalacionProps {
  instalacionId: string;
  instalacionNombre: string;
}

export default function MonitoreoInstalacion({ instalacionId, instalacionNombre }: MonitoreoInstalacionProps) {
  const { formatTimeRange } = useSystemConfig();
  const [config, setConfig] = useState<MonitoreoConfig>({
    habilitado: false,
    intervalo_minutos: 60,
    ventana_inicio: '21:00',
    ventana_fin: '07:00',
    modo: 'whatsapp',
    mensaje_template: 'Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?'
  });
  const [configOriginal, setConfigOriginal] = useState<MonitoreoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, [instalacionId]);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      devLogger.search(' MonitoreoInstalacion: Cargando configuración para:', instalacionId);
      
      // Obtener el usuario actual
      const user = getCurrentUser();
      if (!user) {
        console.error('❌ MonitoreoInstalacion: Usuario no autenticado');
        toast.error('Usuario no autenticado');
        return;
      }
      
      devLogger.search(' MonitoreoInstalacion: Usuario autenticado:', user.email);
      
      // Preparar headers con autenticación
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'x-user-email': user.email,
      };
      
      const response = await fetch(`/api/central-monitoring/config?instalacionId=${instalacionId}`, {
        method: 'GET',
        headers,
        cache: 'no-store'
      });
      
      devLogger.search(' MonitoreoInstalacion: Respuesta status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        devLogger.search(' MonitoreoInstalacion: Datos recibidos:', data);
        
        if (data.data) {
          const configData = {
            habilitado: data.data.habilitado,
            intervalo_minutos: data.data.intervalo_minutos,
            ventana_inicio: data.data.ventana_inicio,
            ventana_fin: data.data.ventana_fin,
            modo: data.data.modo,
            mensaje_template: data.data.mensaje_template
          };
          setConfig(configData);
          setConfigOriginal(configData);
        } else {
          // Si no hay configuración, usar valores por defecto
          const defaultConfig = {
            habilitado: false,
            intervalo_minutos: 60,
            ventana_inicio: '21:00',
            ventana_fin: '07:00',
            modo: 'whatsapp' as const,
            mensaje_template: 'Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?'
          };
          setConfig(defaultConfig);
          setConfigOriginal(null); // No hay configuración original
        }
      } else {
        // Si hay error, mostrar detalles
        console.error('❌ MonitoreoInstalacion: Error HTTP:', response.status);
        const errorText = await response.text();
        console.error('❌ MonitoreoInstalacion: Error response:', errorText);
        toast.error(`Error ${response.status}: No se pudo cargar la configuración`);
      }
    } catch (error) {
      console.error('❌ MonitoreoInstalacion: Error cargando configuración:', error);
      toast.error('Error cargando configuración de monitoreo');
    } finally {
      setLoading(false);
    }
  };

  const mostrarConfirmacion = () => {
    setShowConfirmDialog(true);
  };

  const guardarConfiguracion = async () => {
    try {
      setSaving(true);
      setShowConfirmDialog(false);
      
      // Obtener el usuario actual
      const user = getCurrentUser();
      if (!user) {
        console.error('❌ MonitoreoInstalacion: Usuario no autenticado');
        toast.error('Usuario no autenticado');
        return;
      }
      
      const payload = {
        instalacion_id: instalacionId,
        ...config
      };
      
      // Preparar headers con autenticación
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'x-user-email': user.email,
      };
      
      const response = await fetch('/api/central-monitoring/config', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfigOriginal(config);
        toast.success('Configuración guardada exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error guardando configuración');
      }
    } catch (error) {
      logger.error('Error guardando configuración::', error);
      toast.error('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const hayCambios = !configOriginal || (
    config.habilitado !== configOriginal.habilitado ||
    config.intervalo_minutos !== configOriginal.intervalo_minutos ||
    config.ventana_inicio !== configOriginal.ventana_inicio ||
    config.ventana_fin !== configOriginal.ventana_fin ||
    config.modo !== configOriginal.modo ||
    config.mensaje_template !== configOriginal.mensaje_template
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
        <span className="ml-2">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Satellite className="h-5 w-5" />
            Configuración de Monitoreo
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configura el monitoreo automático para {instalacionNombre}
          </p>
        </CardHeader>
      </Card>

      {/* Configuración Principal - Diseño Compacto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Columna 1: Configuración Básica */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Configuración Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Switch de Activación */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Monitoreo Activo</Label>
              <Switch
                checked={config.habilitado}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, habilitado: checked }))}
              />
            </div>

            {/* Intervalo de Llamadas */}
            <div className="space-y-2">
              <Label className="text-sm">Intervalo (minutos)</Label>
              <Select
                value={config.intervalo_minutos.toString()}
                onValueChange={(value) => setConfig(prev => ({ ...prev, intervalo_minutos: parseInt(value) }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1.5 horas</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ventana de Tiempo */}
            <div className="space-y-2">
              <Label className="text-sm">Ventana de Monitoreo</Label>
              <div className="grid grid-cols-2 gap-2">
                <MilitaryTimeSelect
                  value={config.ventana_inicio}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, ventana_inicio: value }))}
                  placeholder="Hora inicio"
                  className="h-8 text-sm"
                />
                <MilitaryTimeSelect
                  value={config.ventana_fin}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, ventana_fin: value }))}
                  placeholder="Hora fin"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Columna 2: Configuración de Contacto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Modo de Contacto */}
            <div className="space-y-2">
              <Label className="text-sm">Método</Label>
              <Select
                value={config.modo}
                onValueChange={(value: 'whatsapp' | 'telefonico') => setConfig(prev => ({ ...prev, modo: value }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="telefonico">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Llamada
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mensaje Template */}
            <div className="space-y-2">
              <Label className="text-sm">Mensaje</Label>
              <Textarea
                value={config.mensaje_template}
                onChange={(e) => setConfig(prev => ({ ...prev, mensaje_template: e.target.value }))}
                placeholder="Mensaje predeterminado..."
                rows={2}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Columna 3: Información del Sistema */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>• Llamadas automáticas según pauta</p>
              <p>• Solo en ventana configurada</p>
              <p>• Estados: Pendiente, Exitoso, No contesta, Incidente</p>
              <p>• Usa teléfono de instalación o guardia</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botón de Guardar */}
      <div className="flex justify-end">
        <Button
          onClick={mostrarConfirmacion}
          disabled={saving || !hayCambios}
          className="flex items-center gap-2"
          size="sm"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : hayCambios ? 'Guardar Cambios' : 'Guardado'}
        </Button>
      </div>

      {/* Modal de Confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cambios</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas guardar los cambios en la configuración de monitoreo para {instalacionNombre}?
              {config.habilitado ? (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <p className="text-sm font-medium">Monitoreo será activado:</p>
                  <ul className="text-xs mt-1 space-y-1">
                    <li>• Intervalo: {config.intervalo_minutos} minutos</li>
                    <li>• Ventana: {config.ventana_inicio} - {config.ventana_fin}</li>
                    <li>• Modo: {config.modo === 'whatsapp' ? 'WhatsApp' : 'Telefónico'}</li>
                  </ul>
                </div>
              ) : (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-sm font-medium">Monitoreo será desactivado</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={guardarConfiguracion} disabled={saving}>
              {saving ? 'Guardando...' : 'Confirmar y Guardar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
