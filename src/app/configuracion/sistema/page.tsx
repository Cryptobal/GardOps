"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Globe, 
  Clock, 
  DollarSign, 
  Calendar,
  Save,
  RefreshCw,
  Info
} from "lucide-react";

interface ConfiguracionSistema {
  id: string;
  tenant_id?: string;
  zona_horaria: string;
  formato_hora: string;
  pais: string;
  codigo_pais: string;
  moneda: string;
  simbolo_moneda: string;
  idioma: string;
  formato_fecha: string;
  separador_miles: string;
  separador_decimales: string;
}

const ZONAS_HORARIAS = [
  { value: 'America/Santiago', label: 'Chile (Santiago) - UTC-3/-4' },
  { value: 'America/Buenos_Aires', label: 'Argentina (Buenos Aires) - UTC-3' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México) - UTC-6' },
  { value: 'America/Lima', label: 'Perú (Lima) - UTC-5' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá) - UTC-5' },
  { value: 'Europe/Madrid', label: 'España (Madrid) - UTC+1/+2' },
];

const PAISES = [
  { value: 'CL', label: 'Chile 🇨🇱', codigo: '+56', moneda: 'CLP', simbolo: '$' },
  { value: 'AR', label: 'Argentina 🇦🇷', codigo: '+54', moneda: 'ARS', simbolo: '$' },
  { value: 'MX', label: 'México 🇲🇽', codigo: '+52', moneda: 'MXN', simbolo: '$' },
  { value: 'PE', label: 'Perú 🇵🇪', codigo: '+51', moneda: 'PEN', simbolo: 'S/' },
  { value: 'CO', label: 'Colombia 🇨🇴', codigo: '+57', moneda: 'COP', simbolo: '$' },
  { value: 'ES', label: 'España 🇪🇸', codigo: '+34', moneda: 'EUR', simbolo: '€' },
];

export default function SistemaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ConfiguracionSistema>({
    id: '',
    zona_horaria: 'America/Santiago',
    formato_hora: '24h',
    pais: 'CL',
    codigo_pais: '+56',
    moneda: 'CLP',
    simbolo_moneda: '$',
    idioma: 'es-CL',
    formato_fecha: 'DD/MM/YYYY',
    separador_miles: '.',
    separador_decimales: ','
  });

  // Cargar configuración actual
  const cargarConfiguracion = async () => {
    setLoading(true);
    try {
      // Usar el tenant Gard por defecto (mismo que usa el resto del sistema)
      const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
      const response = await fetch(`/api/configuracion/sistema?tenant_id=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setConfig(data.data);
        }
      } else {
        logger.error('Error cargando configuración::', response.statusText);
      }
    } catch (error) {
      logger.error('Error cargando configuración::', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  // Guardar configuración
  const guardarConfiguracion = async () => {
    setSaving(true);
    try {
      // Incluir tenant_id en la configuración
      const configConTenant = {
        ...config,
        tenant_id: '1397e653-a702-4020-9702-3ae4f3f8b337'
      };
      
      const response = await fetch('/api/configuracion/sistema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configConTenant),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConfig(data.data);
        toast.success('Configuración guardada exitosamente');
      } else {
        toast.error(data.error || 'Error al guardar la configuración');
      }
    } catch (error) {
      logger.error('Error guardando configuración::', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // Manejar cambio de país (actualiza automáticamente otros campos)
  const handlePaisChange = (paisValue: string) => {
    const pais = PAISES.find(p => p.value === paisValue);
    if (pais) {
      setConfig(prev => ({
        ...prev,
        pais: paisValue,
        codigo_pais: pais.codigo,
        moneda: pais.moneda,
        simbolo_moneda: pais.simbolo
      }));
    }
  };

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold heading-gradient">⚙️ Configuración del Sistema</h2>
          <p className="text-muted-foreground">
            Configuración global para localización, zona horaria y formato de datos
          </p>
        </div>
        <Button 
          onClick={guardarConfiguracion}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Localización */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              🌍 Localización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Select value={config.pais} onValueChange={handlePaisChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  {PAISES.map((pais) => (
                    <SelectItem key={pais.value} value={pais.value}>
                      {pais.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zona_horaria">Zona Horaria</Label>
              <Select 
                value={config.zona_horaria} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, zona_horaria: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar zona horaria" />
                </SelectTrigger>
                <SelectContent>
                  {ZONAS_HORARIAS.map((zona) => (
                    <SelectItem key={zona.value} value={zona.value}>
                      {zona.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo_pais">Código de País</Label>
              <Input
                id="codigo_pais"
                value={config.codigo_pais}
                onChange={(e) => setConfig(prev => ({ ...prev, codigo_pais: e.target.value }))}
                placeholder="+56"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idioma">Idioma</Label>
              <Input
                id="idioma"
                value={config.idioma}
                onChange={(e) => setConfig(prev => ({ ...prev, idioma: e.target.value }))}
                placeholder="es-CL"
              />
            </div>
          </CardContent>
        </Card>

        {/* Formato de Tiempo */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              ⏰ Formato de Tiempo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formato_hora">Formato de Hora</Label>
              <Select 
                value={config.formato_hora} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, formato_hora: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 horas (militar) - 19:00</SelectItem>
                  <SelectItem value="12h">12 horas (AM/PM) - 7:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formato_fecha">Formato de Fecha</Label>
              <Select 
                value={config.formato_fecha} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, formato_fecha: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (06/09/2025)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (09/06/2025)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2025-09-06)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Zona Horaria Actual:</p>
                  <p>{config.zona_horaria}</p>
                  <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                    Esta configuración afecta Central de Monitoreo, reportes y todos los horarios del sistema
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Moneda y Formato Numérico */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              💰 Moneda y Números
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="moneda">Moneda</Label>
              <Input
                id="moneda"
                value={config.moneda}
                onChange={(e) => setConfig(prev => ({ ...prev, moneda: e.target.value }))}
                placeholder="CLP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="simbolo_moneda">Símbolo de Moneda</Label>
              <Input
                id="simbolo_moneda"
                value={config.simbolo_moneda}
                onChange={(e) => setConfig(prev => ({ ...prev, simbolo_moneda: e.target.value }))}
                placeholder="$"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="separador_miles">Separador de Miles</Label>
              <Input
                id="separador_miles"
                value={config.separador_miles}
                onChange={(e) => setConfig(prev => ({ ...prev, separador_miles: e.target.value }))}
                placeholder="."
                maxLength={1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="separador_decimales">Separador de Decimales</Label>
              <Input
                id="separador_decimales"
                value={config.separador_decimales}
                onChange={(e) => setConfig(prev => ({ ...prev, separador_decimales: e.target.value }))}
                placeholder=","
                maxLength={1}
              />
            </div>

            <Separator />

            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
              <div className="text-sm text-green-700 dark:text-green-300">
                <p className="font-medium">Ejemplo de formato:</p>
                <p>{config.simbolo_moneda}1{config.separador_miles}234{config.separador_decimales}56</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del Sistema */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              📊 Información del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Configuración ID:</span>
                <span className="text-sm text-muted-foreground font-mono">{config.id}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">Tenant ID:</span>
                <span className="text-sm text-muted-foreground">
                  {config.tenant_id || 'Por defecto'}
                </span>
              </div>

              <Separator />

              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    <p className="font-medium">Multitenant Ready</p>
                    <p className="text-xs mt-1">
                      Esta configuración se aplicará a todo el sistema y puede ser personalizada por tenant en el futuro.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botón de guardado inferior */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={guardarConfiguracion}
          disabled={saving}
          size="lg"
          className="flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Guardando Configuración...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
}
