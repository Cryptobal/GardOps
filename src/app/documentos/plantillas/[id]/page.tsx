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
import { useRouter, useParams } from "next/navigation";
import { getJSON, postJSON, putJSON } from "../../../../lib/api";
import { Editor } from '@tinymce/tinymce-react';

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
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'nueva';
  
  const [plantilla, setPlantilla] = useState<Partial<Plantilla>>({
    name: '',
    content_html: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPlantilla, setLoadingPlantilla] = useState(!isNew);
  
  const editorRef = useRef<any>(null);

  // Cargar plantilla existente si no es nueva
  useEffect(() => {
    if (!isNew) {
      const fetchPlantilla = async () => {
        try {
          setLoadingPlantilla(true);
          const result = await getJSON<{ success: boolean; data: Plantilla }>(`/api/doc/templates/${id}`);

          if (result.success) {
            setPlantilla(result.data);
          } else {
            console.error("Error al cargar plantilla:", result);
            router.push('/documentos/plantillas');
          }
        } catch (error) {
          console.error("Error cargando plantilla:", error);
          router.push('/documentos/plantillas');
        } finally {
          setLoadingPlantilla(false);
        }
      };

      fetchPlantilla();
    }
  }, [id, isNew, router]);

  const handleSave = async () => {
    if (!plantilla.name?.trim()) {
      alert('El nombre de la plantilla es obligatorio');
      return;
    }

    if (!plantilla.content_html?.trim()) {
      alert('El contenido de la plantilla es obligatorio');
      return;
    }

    try {
      setSaving(true);
      
      if (isNew) {
        const result = await postJSON('/api/doc/templates', {
          name: plantilla.name,
          content_html: plantilla.content_html
        });
        
        if (result.success) {
          alert('Plantilla creada correctamente');
          router.push('/documentos/plantillas');
        }
      } else {
        const result = await putJSON(`/api/doc/templates/${id}`, {
          name: plantilla.name,
          content_html: plantilla.content_html
        });
        
        if (result.success) {
          alert('Plantilla actualizada correctamente');
          router.push('/documentos/plantillas');
        }
      }
    } catch (error: any) {
      console.error("Error guardando plantilla:", error);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (content: string) => {
    setPlantilla(prev => ({
      ...prev,
      content_html: content
    }));
  };

  const handleEditorInit = (evt: any, editor: any) => {
    editorRef.current = editor;
  };

  if (loadingPlantilla) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col space-y-4 md:space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/documentos/plantillas')}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {isNew ? 'Nueva Plantilla' : 'Editar Plantilla'}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {isNew ? 'Crea una nueva plantilla de documento' : 'Edita la plantilla existente'}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        {/* Panel izquierdo - Configuración */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configuración
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Plantilla *</Label>
                <Input
                  id="name"
                  value={plantilla.name || ''}
                  onChange={(e) => setPlantilla(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Contrato de Guardia"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Variables Detectadas
                </Label>
                <div className="mt-2 p-3 bg-muted rounded-md min-h-[60px]">
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
                    skin: 'oxide-dark',
                    content_css: 'dark',
                    menubar: 'file edit view insert format tools table help',
                    plugins: 'paste lists table link image code codesample searchreplace wordcount preview fullscreen charmap visualblocks mentions',
                    toolbar: 'undo redo | blocks | bold italic underline strikethrough | align | bullist numlist outdent indent | table | link | removeformat | preview fullscreen | code',
                    placeholder: 'Escribe tu plantilla. Presiona # para insertar variables...',
                    paste_data_images: false,
                    paste_as_text: false,
                    mentions_selector: 'span',
                    mentions_item_type: 'profile',
                    mentions_fetch: async (query: any, success: any) => {
                      try {
                        const response = await fetch(`/api/vars/variables?search=${query.term}`);
                        const result = await response.json();
                        
                        if (result.success) {
                          const vars = result.data.map((v: any) => ({
                            id: v.var_key,
                            name: v.var_key
                          }));
                          success(vars);
                        } else {
                          success([]);
                        }
                      } catch (error) {
                        console.error('Error fetching variables:', error);
                        success([]);
                      }
                    },
                    mentions_menu_complete: (editor: any, item: any) => {
                      editor.insertContent(` {{${item.name}}} `);
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

// Editor de plantillas listo
