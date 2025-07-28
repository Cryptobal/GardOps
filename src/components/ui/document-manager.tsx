"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { useToast } from "./toast";

interface Documento {
  id: string;
  nombre_original: string;
  tipo: string;
  url: string;
  creado_en: string;
}

interface DocumentManagerProps {
  modulo: string;
  entidad_id: string;
  onDocumentUploaded?: () => void;
}

export function DocumentManager({ modulo, entidad_id, onDocumentUploaded }: DocumentManagerProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const cargarDocumentos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents?modulo=${modulo}&entidad_id=${entidad_id}`);
      const data = await response.json();
      
      if (response.ok) {
        setDocumentos(data.documentos);
      } else {
        toast.error("No se pudieron cargar los documentos", "Error");
      }
          } catch (error) {
        console.error("Error cargando documentos:", error);
        toast.error("Error de conexión", "Error");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      cargarDocumentos();
    }, [modulo, entidad_id]);

    const subirDocumento = async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("modulo", modulo);
        formData.append("entidad_id", entidad_id);

        const response = await fetch("/api/upload-document", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          toast.success(`Documento "${file.name}" subido correctamente`, "Éxito");
          cargarDocumentos();
          onDocumentUploaded?.();
        } else {
          toast.error(data.error || "Error subiendo documento", "Error");
        }
      } catch (error) {
        console.error("Error subiendo documento:", error);
        toast.error("Error de conexión", "Error");
      } finally {
        setUploading(false);
      }
    };

    const descargarDocumento = async (documento: Documento) => {
      try {
        const response = await fetch("/api/document-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: documento.url }),
        });

        const data = await response.json();

        if (response.ok) {
          window.open(data.url, "_blank");
        } else {
          toast.error("No se pudo generar el enlace de descarga", "Error");
        }
      } catch (error) {
        console.error("Error descargando documento:", error);
        toast.error("Error de conexión", "Error");
      }
    };

    const eliminarDocumento = async (id: string) => {
      if (!confirm("¿Estás seguro de que quieres eliminar este documento?")) {
        return;
      }

      try {
        const response = await fetch(`/api/documents?id=${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast.success("Documento eliminado correctamente", "Éxito");
          cargarDocumentos();
        } else {
          toast.error("No se pudo eliminar el documento", "Error");
        }
      } catch (error) {
        console.error("Error eliminando documento:", error);
        toast.error("Error de conexión", "Error");
      }
    };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      subirDocumento(file);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Documentos</h3>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button
            onClick={() => document.getElementById("file-upload")?.click()}
            disabled={uploading}
            size="sm"
          >
            {uploading ? "Subiendo..." : "Subir Documento"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Cargando documentos...</div>
      ) : documentos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hay documentos subidos
        </div>
      ) : (
        <div className="space-y-2">
          {documentos.map((documento) => (
            <div
              key={documento.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">
                    {documento.tipo?.split("/")[1]?.toUpperCase() || "DOC"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{documento.nombre_original}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(documento.creado_en).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => descargarDocumento(documento)}
                >
                  Descargar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => eliminarDocumento(documento.id)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
} 