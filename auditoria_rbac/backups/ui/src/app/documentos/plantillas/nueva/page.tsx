"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { 
  ArrowLeft, 
  Save, 
  FileText,
  Hash
} from "lucide-react";
import { useRouter } from "next/navigation";
import { postJSON } from "../../../../lib/api";
import { Editor } from '@tinymce/tinymce-react';
import { useToast } from "@/components/ui/toast";
import { extractVars } from "@/lib/vars";

export default function NuevaPlantillaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const editorRef = useRef<any>(null);
  
  const [nombre, setNombre] = useState("");
  const [contenido, setContenido] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const handleEditorChange = (content: string) => {
    setContenido(content);
    // Extraer variables del contenido
    const varsDetectadas = extractVars(content);
    setVariables(varsDetectadas);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la plantilla es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!contenido.trim()) {
      toast({
        title: "Error", 
        description: "El contenido de la plantilla es obligatorio",
        variant: "destructive"
      });
      return;
    }

    try {
      setGuardando(true);
      const result = await postJSON<{ success: boolean }>('/api/doc/templates', {
        name: nombre,
        content_html: contenido
      });

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Plantilla creada exitosamente"
        });
        router.push('/documentos/plantillas');
      }
    } catch (error) {
      console.error("Error guardando plantilla:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla",
        variant: "destructive"
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto p-4 max-w-7xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            Nueva Plantilla
          </h1>
          <p className="text-sm text-muted-foreground">
            Crea una nueva plantilla de documento con variables dinámicas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => router.push('/documentos/plantillas')}
            disabled={guardando}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button 
            onClick={handleGuardar}
            disabled={guardando}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel izquierdo - Configuración */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre de la Plantilla *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Contrato de Guardia"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Variables Detectadas
                </Label>
                <div className="mt-2">
                  {variables.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {variables.map((variable, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Escribe {'{{variable}}'} en el editor para crear variables
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Usa el formato {'{{nombre_variable}}'} para crear variables que se podrán reemplazar dinámicamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho - Editor */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Editor de Plantilla</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ minHeight: '600px' }}>
                <Editor
                  apiKey="xd1kc8hfnrb89bew1g0fqyynkefjrw4oue9p0jzj7os05e5m"
                  onInit={(evt, editor) => editorRef.current = editor}
                  value={contenido}
                  onEditorChange={handleEditorChange}
                  init={{
                    height: 600,
                    menubar: 'file edit view insert format tools table help',
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                      'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
                      'fullscreen', 'insertdatetime', 'media', 'table', 'help',
                      'wordcount'
                    ],
                    toolbar: 'undo redo | blocks | ' +
                      'bold italic underline strikethrough | alignleft aligncenter ' +
                      'alignright alignjustify | bullist numlist outdent indent | ' +
                      'insertVariable | table | link image | removeformat | preview fullscreen | code',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                    skin: 'oxide-dark',
                    content_css: 'dark',
                    placeholder: 'Escribe tu plantilla aquí. Usa el botón de variables o escribe {{nombre_variable}}...',
                    paste_data_images: false,
                    paste_as_text: false,
                    branding: false,
                    setup: (editor: any) => {
                      // Agregar botón personalizado para insertar variables
                      editor.ui.registry.addMenuButton('insertVariable', {
                        text: 'Variables',
                        icon: 'template',
                        tooltip: 'Insertar variable',
                        fetch: (callback: any) => {
                          const variables = [
                            // Guardias
                            { text: '👮 Guardias', type: 'separator' },
                            { text: 'Nombre del Guardia', value: '{{guardia_nombre}}' },
                            { text: 'RUT del Guardia', value: '{{guardia_rut}}' },
                            { text: 'Dirección del Guardia', value: '{{guardia_direccion}}' },
                            { text: 'Teléfono del Guardia', value: '{{guardia_telefono}}' },
                            { text: 'Email del Guardia', value: '{{guardia_email}}' },
                            { text: 'Cargo del Guardia', value: '{{guardia_cargo}}' },
                            // Instalaciones
                            { text: '🏢 Instalaciones', type: 'separator' },
                            { text: 'Nombre de la Instalación', value: '{{instalacion_nombre}}' },
                            { text: 'Dirección de la Instalación', value: '{{instalacion_direccion}}' },
                            { text: 'Comuna de la Instalación', value: '{{instalacion_comuna}}' },
                            { text: 'Región de la Instalación', value: '{{instalacion_region}}' },
                            // Cliente
                            { text: '👤 Cliente', type: 'separator' },
                            { text: 'Nombre del Cliente', value: '{{cliente_nombre}}' },
                            { text: 'RUT del Cliente', value: '{{cliente_rut}}' },
                            { text: 'Dirección del Cliente', value: '{{cliente_direccion}}' },
                            { text: 'Teléfono del Cliente', value: '{{cliente_telefono}}' },
                            // Fechas
                            { text: '📅 Fechas', type: 'separator' },
                            { text: 'Fecha Actual', value: '{{fecha_actual}}' },
                            { text: 'Fecha del Contrato', value: '{{fecha_contrato}}' },
                            { text: 'Fecha de Inicio', value: '{{fecha_inicio}}' },
                            { text: 'Fecha de Término', value: '{{fecha_termino}}' },
                            // Sueldos
                            { text: '💰 Sueldos', type: 'separator' },
                            { text: 'Sueldo Base', value: '{{sueldo_base}}' },
                            { text: 'Sueldo Líquido', value: '{{sueldo_liquido}}' },
                            { text: 'Total de Bonos', value: '{{bonos_total}}' },
                            // Otros
                            { text: '📋 Otros', type: 'separator' },
                            { text: 'Mes Actual', value: '{{mes_actual}}' },
                            { text: 'Año Actual', value: '{{año_actual}}' },
                            { text: 'Horario del Turno', value: '{{turno_horario}}' },
                            { text: 'Tipo de Turno', value: '{{turno_tipo}}' }
                          ];
                          
                          const items = variables.map(v => {
                            if (v.type === 'separator') {
                              return { type: 'separator', text: v.text };
                            }
                            return {
                              type: 'menuitem',
                              text: v.text,
                              onAction: () => {
                                editor.insertContent(v.value + ' ');
                              }
                            };
                          });
                          
                          callback(items);
                        }
                      });
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}