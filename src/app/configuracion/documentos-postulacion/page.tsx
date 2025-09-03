"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  AlertTriangle,
  Calendar,
  CheckCircle,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

interface TipoDocumentoPostulacion {
  id: string;
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  formato_permitido: string;
  orden: number;
  activo: boolean;
  dias_antes_alarma: number;
  requiere_vencimiento: boolean;
}

export default function ConfiguracionDocumentosPostulacionPage() {
  const { toast } = useToast();
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumentoPostulacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevoTipo, setNuevoTipo] = useState<Partial<TipoDocumentoPostulacion>>({
    nombre: '',
    descripcion: '',
    obligatorio: false,
    formato_permitido: 'PDF,IMAGEN',
    orden: 0,
    activo: true,
    dias_antes_alarma: 30,
    requiere_vencimiento: false
  });

  // Cargar tipos de documentos existentes
  const cargarTiposDocumentos = useCallback(async () => {
    try {
      setCargando(true);
      const response = await fetch('/api/setup-document-types');
      if (response.ok) {
        const data = await response.json();
        // Convertir tipos de documentos_tipos a formato de postulación
        const tiposConvertidos = data.tipos_documentos.map((tipo: any) => ({
          id: tipo.id,
          nombre: tipo.nombre,
          descripcion: tipo.nombre, // Usar nombre como descripción por defecto
          obligatorio: tipo.nombre === 'Certificado OS10' || tipo.nombre === 'Carnet Identidad Frontal',
          formato_permitido: 'PDF,IMAGEN',
          orden: tipo.nombre === 'Certificado OS10' ? 1 : 
                 tipo.nombre === 'Carnet Identidad Frontal' ? 2 : 99,
          activo: tipo.activo,
          dias_antes_alarma: tipo.dias_antes_alarma || 30,
          requiere_vencimiento: tipo.requiere_vencimiento || false
        }));
        setTiposDocumentos(tiposConvertidos);
      }
    } catch (error) {
      console.error('Error cargando tipos:', error);
      toast.error('Error al cargar tipos de documentos');
    } finally {
      setCargando(false);
    }
  }, [toast]);

  // Guardar configuración
  const guardarConfiguracion = useCallback(async () => {
    try {
      const response = await fetch('/api/setup-document-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipos_documentos: tiposDocumentos
        })
      });

      if (response.ok) {
        toast.success('Configuración guardada exitosamente');
        await cargarTiposDocumentos();
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error: any) {
      console.error('Error guardando:', error);
      toast.error(error.message || 'Error al guardar configuración');
    }
  }, [tiposDocumentos, cargarTiposDocumentos, toast]);

  // Agregar nuevo tipo
  const agregarNuevoTipo = useCallback(() => {
    if (!nuevoTipo.nombre?.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    const nuevo: TipoDocumentoPostulacion = {
      id: `nuevo-${Date.now()}`,
      nombre: nuevoTipo.nombre.trim(),
      descripcion: nuevoTipo.descripcion || nuevoTipo.nombre.trim(),
      obligatorio: nuevoTipo.obligatorio || false,
      formato_permitido: nuevoTipo.formato_permitido || 'PDF,IMAGEN',
      orden: tiposDocumentos.length + 1,
      activo: true,
      dias_antes_alarma: nuevoTipo.dias_antes_alarma || 30,
      requiere_vencimiento: nuevoTipo.requiere_vencimiento || false
    };

    setTiposDocumentos(prev => [...prev, nuevo]);
    setNuevoTipo({
      nombre: '',
      descripcion: '',
      obligatorio: false,
      formato_permitido: 'PDF,IMAGEN',
      orden: 0,
      activo: true,
      dias_antes_alarma: 30,
      requiere_vencimiento: false
    });
    toast.success('Nuevo tipo de documento agregado');
  }, [nuevoTipo, tiposDocumentos, toast]);

  // Eliminar tipo
  const eliminarTipo = useCallback((id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este tipo de documento?')) {
      setTiposDocumentos(prev => prev.filter(tipo => tipo.id !== id));
      toast.success('Tipo de documento eliminado');
    }
  }, [toast]);

  // Actualizar tipo
  const actualizarTipo = useCallback((id: string, campo: keyof TipoDocumentoPostulacion, valor: any) => {
    setTiposDocumentos(prev => prev.map(tipo => 
      tipo.id === id ? { ...tipo, [campo]: valor } : tipo
    ));
  }, []);

  // Iniciar edición
  const iniciarEdicion = useCallback((id: string) => {
    setEditando(id);
  }, []);

  // Finalizar edición
  const finalizarEdicion = useCallback(() => {
    setEditando(null);
  }, []);

  useEffect(() => {
    cargarTiposDocumentos();
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            📋 Configuración de Documentos para Postulaciones
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Configura qué documentos son obligatorios y sus fechas de vencimiento para guardias
          </p>
        </motion.div>

        {/* Formulario para nuevo tipo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-500" />
                Agregar Nuevo Tipo de Documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Nombre *</label>
                  <Input
                    value={nuevoTipo.nombre}
                    onChange={(e) => setNuevoTipo(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Certificado de Capacitación"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Input
                    value={nuevoTipo.descripcion}
                    onChange={(e) => setNuevoTipo(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Descripción del documento"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Formato Permitido</label>
                  <Input
                    value={nuevoTipo.formato_permitido}
                    onChange={(e) => setNuevoTipo(prev => ({ ...prev, formato_permitido: e.target.value }))}
                    placeholder="PDF,IMAGEN"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Button onClick={agregarNuevoTipo} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={nuevoTipo.obligatorio}
                    onCheckedChange={(checked) => setNuevoTipo(prev => ({ ...prev, obligatorio: checked }))}
                  />
                  <label className="text-sm font-medium">Documento Obligatorio</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={nuevoTipo.requiere_vencimiento}
                    onCheckedChange={(checked) => setNuevoTipo(prev => ({ ...prev, requiere_vencimiento: checked }))}
                  />
                  <label className="text-sm font-medium">Requiere Vencimiento</label>
                </div>
                {nuevoTipo.requiere_vencimiento && (
                  <div>
                    <label className="text-sm font-medium">Días antes del aviso</label>
                    <Input
                      type="number"
                      value={nuevoTipo.dias_antes_alarma}
                      onChange={(e) => setNuevoTipo(prev => ({ ...prev, dias_antes_alarma: parseInt(e.target.value) || 30 }))}
                      min="1"
                      max="365"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Lista de tipos de documentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Tipos de Documentos Configurados
                </CardTitle>
                <Button onClick={guardarConfiguracion} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tiposDocumentos.map((tipo, index) => (
                  <div key={tipo.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                      {/* Nombre */}
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nombre</label>
                        {editando === tipo.id ? (
                          <Input
                            value={tipo.nombre}
                            onChange={(e) => actualizarTipo(tipo.id, 'nombre', e.target.value)}
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-sm font-medium mt-1">{tipo.nombre}</p>
                        )}
                      </div>

                      {/* Descripción */}
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Descripción</label>
                        {editando === tipo.id ? (
                          <Input
                            value={tipo.descripcion}
                            onChange={(e) => actualizarTipo(tipo.id, 'descripcion', e.target.value)}
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tipo.descripcion}</p>
                        )}
                      </div>

                      {/* Configuración */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={tipo.obligatorio}
                            onCheckedChange={(checked) => actualizarTipo(tipo.id, 'obligatorio', checked)}
                          />
                          <label className="text-sm font-medium">Obligatorio</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={tipo.requiere_vencimiento}
                            onCheckedChange={(checked) => actualizarTipo(tipo.id, 'requiere_vencimiento', checked)}
                          />
                          <label className="text-sm font-medium">Con vencimiento</label>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2">
                        {editando === tipo.id ? (
                          <>
                            <Button size="sm" onClick={finalizarEdicion}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={finalizarEdicion}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => iniciarEdicion(tipo.id)}>
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => eliminarTipo(tipo.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Configuración adicional */}
                    {tipo.requiere_vencimiento && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Días antes del aviso
                            </label>
                            {editando === tipo.id ? (
                              <Input
                                type="number"
                                value={tipo.dias_antes_alarma}
                                onChange={(e) => actualizarTipo(tipo.id, 'dias_antes_alarma', parseInt(e.target.value) || 30)}
                                min="1"
                                max="365"
                                className="mt-1"
                              />
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {tipo.dias_antes_alarma} días
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Formato permitido
                            </label>
                            {editando === tipo.id ? (
                              <Input
                                value={tipo.formato_permitido}
                                onChange={(e) => actualizarTipo(tipo.id, 'formato_permitido', e.target.value)}
                                className="mt-1"
                              />
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {tipo.formato_permitido}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Orden
                            </label>
                            {editando === tipo.id ? (
                              <Input
                                type="number"
                                value={tipo.orden}
                                onChange={(e) => actualizarTipo(tipo.id, 'orden', parseInt(e.target.value) || 0)}
                                min="0"
                                className="mt-1"
                              />
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {tipo.orden}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Indicadores visuales */}
                    <div className="mt-3 flex items-center gap-2">
                      {tipo.obligatorio && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Obligatorio
                        </span>
                      )}
                      {tipo.requiere_vencimiento && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          <Calendar className="h-3 w-3 mr-1" />
                          Vence en {tipo.dias_antes_alarma} días
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        <FileText className="h-3 w-3 mr-1" />
                        {tipo.formato_permitido}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
