import { Authorize, GuardButton, can } from '@/lib/authz-ui'
"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { useRouter, useSearchParams } from "next/navigation";
import { getJSON, postJSON, putJSON } from "../../../../lib/api";
import { Editor } from '@tinymce/tinymce-react';
import { useToast } from "@/components/ui/toast";

interface Plantilla {
  id: string;
  name: string;
  content_html: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export default function EditorPlantillaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const mode = searchParams.get('mode');
  const id = searchParams.get('id');
  const isNew = mode === 'new';
  
  const [plantilla, setPlantilla] = useState<Plantilla>({
    id: '',
    name: '',
    content_html: '',
    variables: [],
    created_at: '',
    updated_at: ''
  });
  const [loadingPlantilla, setLoadingPlantilla] = useState(!isNew);
  
  const editorRef = useRef<any>(null);

  // Cargar plantilla existente si no es nueva
  useEffect(() => {
    if (!isNew && id) {
      const fetchPlantilla = async () => {
        try {
          setLoadingPlantilla(true);
          const result = await getJSON<{ success: boolean; data: Plantilla }>(`/api/doc/templates/${id}`);

          if (result.success) {
            setPlantilla(result.data);
          } else {
            console.error("Error al cargar plantilla:", result);
            toast({
              title: "Error",
              description: "No se pudo cargar la plantilla",
              variant: "destructive"
            });
            router.push('/documentos/plantillas');
          }
        } catch (error) {
          console.error("Error cargando plantilla:", error);
          toast({
            title: "Error",
            description: "No se pudo cargar la plantilla",
            variant: "destructive"
          });
          router.push('/documentos/plantillas');
        } finally {
          setLoadingPlantilla(false);
        }
      };

      fetchPlantilla();
    }
  }, [id, isNew, router, toast]);

  const handleSave = async () => {
    if (!plantilla.name?.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la plantilla es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!plantilla.content_html?.trim()) {
      toast({
        title: "Error",
        description: "El contenido de la plantilla es obligatorio",
        variant: "destructive"
      });
      return;
    }

    try {
      const endpoint = isNew ? '/api/doc/templates' : `/api/doc/templates/${id}`;
      const method = isNew ? postJSON : putJSON;
      
      const result = await method<{ success: boolean; data: Plantilla }>(
        endpoint,
        {
          name: plantilla.name,
          content_html: plantilla.content_html
        }
      );

      if (result.success) {
        toast({
          title: "Éxito",
          description: isNew ? "Plantilla creada exitosamente" : "Plantilla actualizada exitosamente"
        });
        router.push('/documentos/plantillas');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error("Error guardando plantilla:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla",
        variant: "destructive"
      });
    }
  };

  const handleEditorInit = (evt: any, editor: any) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (content: string) => {
    setPlantilla(prev => ({ ...prev, content_html: content }));
  };

  if (loadingPlantilla) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            {isNew ? 'Nueva Plantilla' : 'Editar Plantilla'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew ? 'Crea una nueva plantilla de documento' : 'Edita la plantilla existente'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => router.push('/documentos/plantillas')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
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
                <Label htmlFor="name">Nombre de la Plantilla *</Label>
                <Input
                  id="name"
                  value={plantilla.name}
                  onChange={(e) => setPlantilla(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Contrato de Guardia"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Variables Detectadas
                </Label>
                <div className="mt-2 space-y-1">
                  {plantilla.variables && plantilla.variables.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {plantilla.variables.map((variable, index) => (
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
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho - Editor */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Editor de Plantilla</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <div className="h-[600px]">
                <Editor
                  apiKey="xd1kc8hfnrb89bew1g0fqyynkefjrw4oue9p0jzj7os05e5m"
                  onInit={handleEditorInit}
                  value={plantilla.content_html || ''}
                  onEditorChange={handleEditorChange}
                  init={{
                    height: 600,
                    menubar: 'file edit view insert format tools table help',
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                      'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
                      'fullscreen', 'insertdatetime', 'media', 'table', 'help',
                      'wordcount', 'codesample'
                    ],
                    toolbar: 'undo redo | blocks | ' +
                      'bold italic underline strikethrough | alignleft aligncenter ' +
                      'alignright alignjustify | bullist numlist outdent indent | ' +
                      'table | link image | removeformat | preview fullscreen | code | help',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                    skin: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oxide-dark' : 'oxide',
                    content_css: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
                    placeholder: 'Escribe tu plantilla aquí. Usa {{nombre_variable}} para insertar variables dinámicas...',
                    paste_data_images: false,
                    paste_as_text: false,
                    branding: false
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
