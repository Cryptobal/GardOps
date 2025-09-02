"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Webhook, 
  Eye, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Link,
  ExternalLink,
  TestTube
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface TenantConfig {
  id: string;
  nombre: string;
  url_webhook: string | null;
  webhook_activo: boolean;
  formulario_url: string;
}

interface WebhookLog {
  id: string;
  guardia_id: string;
  guardia_nombre: string;
  url_webhook: string;
  response_status: number;
  error_message: string | null;
  created_at: string;
}

export default function ConfiguracionPostulacionesPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookActivo, setWebhookActivo] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [activeTab, setActiveTab] = useState("configuracion");

  useEffect(() => {
    cargarConfiguracion();
    cargarWebhookLogs();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configuracion/postulaciones');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setWebhookUrl(data.config.url_webhook || "");
        setWebhookActivo(data.config.webhook_activo);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast.error("No se pudo cargar la configuración", "Error");
    } finally {
      setLoading(false);
    }
  };

  const cargarWebhookLogs = async () => {
    try {
      const response = await fetch('/api/configuracion/postulaciones/webhook-logs');
      if (response.ok) {
        const data = await response.json();
        setWebhookLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error cargando logs de webhook:', error);
    }
  };

  const toggleWebhook = async (activo: boolean) => {
    try {
      setWebhookSaving(true);
      const response = await fetch('/api/configuracion/postulaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url_webhook: webhookUrl,
          webhook_activo: activo
        })
      });

      if (response.ok) {
        setWebhookActivo(activo);
        toast.success(activo ? "Webhook activado correctamente" : "Webhook desactivado correctamente", "Webhook actualizado");
        await cargarConfiguracion();
      } else {
        throw new Error('Error actualizando webhook');
      }
    } catch (error) {
      console.error('Error actualizando webhook:', error);
      toast.error("No se pudo actualizar el webhook", "Error");
      // Revertir el estado en caso de error
      setWebhookActivo(!activo);
    } finally {
      setWebhookSaving(false);
    }
  };

  const probarWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Debe configurar una URL de webhook primero", "Error");
      return;
    }

    try {
      setTestingWebhook(true);
      const response = await fetch('/api/configuracion/postulaciones/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url_webhook: webhookUrl })
      });

      if (response.ok) {
        toast.success("El webhook respondió correctamente", "Éxito");
      } else {
        throw new Error('Error probando webhook');
      }
    } catch (error) {
      console.error('Error probando webhook:', error);
              toast.error("No se pudo probar el webhook", "Error");
    } finally {
      setTestingWebhook(false);
    }
  };

  const copiarURL = async () => {
    try {
      await navigator.clipboard.writeText(config?.formulario_url || '');
      toast.success("La URL del formulario se ha copiado al portapapeles", "Éxito");
    } catch (error) {
      console.error('Error copiando URL:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600">No se pudo cargar la configuración</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">
            ⚙️ Configuración de Postulaciones
          </h1>
          <p className="text-lg text-muted-foreground">
            Configura tu sistema de postulaciones y webhooks
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configuracion">Configuración</TabsTrigger>
            <TabsTrigger value="formulario">Vista del Formulario</TabsTrigger>
            <TabsTrigger value="webhooks">Logs de Webhook</TabsTrigger>
          </TabsList>

          {/* Tab: Configuración */}
          <TabsContent value="configuracion">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Configuración General</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Información del Tenant */}
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-foreground mb-2">Información del Tenant</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Nombre del Tenant</Label>
                        <p className="font-medium text-foreground">{config.nombre}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">ID del Tenant</Label>
                        <p className="font-mono text-sm text-foreground">{config.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* URL del Formulario */}
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-foreground mb-2">URL del Formulario Público</h3>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={config.formulario_url}
                        readOnly
                        className="bg-background"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copiarURL}
                        className="flex items-center space-x-2"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(config.formulario_url, '_blank')}
                        className="flex items-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir</span>
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Comparte esta URL con los postulantes para que puedan acceder al formulario
                    </p>
                  </div>

                  {/* Configuración del Webhook */}
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-foreground mb-2">Configuración del Webhook</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="webhook_url">URL del Webhook</Label>
                        <Input
                          id="webhook_url"
                          placeholder="https://tu-servicio.com/webhook"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          URL donde se enviarán los datos de las postulaciones
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="webhook_activo"
                          checked={webhookActivo}
                          onCheckedChange={toggleWebhook}
                          disabled={webhookSaving}
                        />
                        <Label htmlFor="webhook_activo">
                          Webhook activo
                          {webhookSaving && <span className="ml-2 text-sm text-muted-foreground">(guardando...)</span>}
                        </Label>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          onClick={probarWebhook}
                          disabled={testingWebhook || !webhookUrl}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          {testingWebhook ? 'Probando...' : 'Probar Webhook'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Nota informativa */}
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground text-center">
                      💡 Los cambios se guardan automáticamente al activar/desactivar el webhook
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Tab: Vista del Formulario */}
          <TabsContent value="formulario">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <span>Vista Previa del Formulario</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-6 rounded-lg border">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-2">
                        🚀 Postulación de Guardia
                      </h2>
                      <p className="text-muted-foreground">
                        Vista previa del formulario que verán los postulantes
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-card p-4 rounded border">
                        <h3 className="font-semibold mb-2 text-foreground">📋 Información Personal</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>• RUT (obligatorio)</p>
                          <p>• Nombre completo (obligatorio)</p>
                          <p>• Sexo, fecha nacimiento, nacionalidad</p>
                          <p>• Email y celular (obligatorios)</p>
                          <p>• Dirección con autocompletado</p>
                        </div>
                      </div>
                      
                      <div className="bg-card p-4 rounded border">
                        <h3 className="font-semibold mb-2 text-foreground">💼 Información Laboral</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>• AFP y previsión de salud</p>
                          <p>• Datos bancarios completos</p>
                          <p>• Tallas y medidas físicas</p>
                          <p>• Asignación familiar</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-card p-4 rounded border">
                      <h3 className="font-semibold mb-2 text-foreground">📄 Documentos Requeridos</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <p>• Certificado OS10</p>
                        <p>• Carnet identidad (frontal/reverso)</p>
                        <p>• Certificado antecedentes</p>
                        <p>• Certificado enseñanza media</p>
                        <p>• Certificado AFP</p>
                        <p>• Certificado AFC</p>
                        <p>• Certificado FONASA/ISAPRE</p>
                      </div>
                    </div>
                    
                    <div className="text-center mt-6">
                      <Button
                        onClick={() => window.open(config.formulario_url, '_blank')}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir Formulario Completo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Tab: Logs de Webhook */}
          <TabsContent value="webhooks">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Webhook className="w-5 h-5" />
                    <span>Logs de Webhook</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {webhookLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Webhook className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No hay logs de webhook disponibles</p>
                      <p className="text-sm">Los logs aparecerán cuando se envíen postulaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {webhookLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-4 rounded-lg border ${
                            log.error_message 
                              ? 'bg-red-50 border-red-200' 
                              : 'bg-green-50 border-green-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {log.error_message ? (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              <span className="font-medium">
                                {log.guardia_nombre}
                              </span>
                              <Badge variant={log.error_message ? "destructive" : "default"}>
                                {log.error_message ? 'Error' : 'Exitoso'}
                              </Badge>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(log.created_at).toLocaleString('es-CL')}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>URL:</strong> {log.url_webhook}</p>
                            {log.response_status && (
                              <p><strong>Status:</strong> {log.response_status}</p>
                            )}
                            {log.error_message && (
                              <p><strong>Error:</strong> {log.error_message}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      onClick={cargarWebhookLogs}
                      className="bg-muted hover:bg-muted/80"
                    >
                      Actualizar Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
