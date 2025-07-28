"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "@/lib/utils";
import { logDocumentoSubido } from "@/lib/api/logs-clientes";

interface TipoDocumento {
  id: string;
  modulo: string;
  nombre: string;
  requiere_vencimiento: boolean;
  dias_antes_alarma: number;
}

interface DocumentUploaderProps {
  modulo: string;
  entidadId: string;
  onUploadSuccess?: () => void;
}

export default function DocumentUploader({ modulo, entidadId, onUploadSuccess }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tipoDocumentoId, setTipoDocumentoId] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [loadingTipos, setLoadingTipos] = useState(true);

  // Obtener el tipo seleccionado para verificar si requiere vencimiento
  const tipoSeleccionado = tiposDocumentos.find(tipo => tipo.id === tipoDocumentoId);

  // Cargar tipos de documentos SIN caché y filtrando por módulo
  useEffect(() => {
    const cargarTipos = async () => {
      try {
        setLoadingTipos(true);
        console.log(`🔄 Cargando tipos de documentos para módulo: ${modulo}`);
        
        // Añadir timestamp para evitar cache del navegador
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/tipos-documentos?_t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        const data = await response.json();
        console.log('📄 Respuesta tipos:', data);
        
        if (data.success) {
          // Filtrar por módulo específico
          const tiposFiltrados = data.data.filter((tipo: TipoDocumento) => tipo.modulo === modulo);
          console.log(`✅ ${tiposFiltrados.length} tipos encontrados para módulo "${modulo}":`, 
            tiposFiltrados.map((t: TipoDocumento) => t.nombre));
          setTiposDocumentos(tiposFiltrados);
        } else {
          console.error('❌ Error cargando tipos:', data.error);
          setTiposDocumentos([]);
        }
      } catch (error) {
        console.error("❌ Error cargando tipos:", error);
        setTiposDocumentos([]);
      } finally {
        setLoadingTipos(false);
      }
    };

    cargarTipos();
  }, [modulo]); // Re-cargar cuando cambie el módulo

  const handleUpload = async () => {
    if (!file || !tipoDocumentoId) {
      setStatus("error");
      console.error("❌ Archivo y tipo de documento son requeridos");
      return;
    }

    // Validar fecha de vencimiento si es requerida
    if (tipoSeleccionado?.requiere_vencimiento && !fechaVencimiento) {
      setStatus("error");
      console.error("❌ Fecha de vencimiento requerida para este tipo de documento");
      return;
    }
    
    setStatus("uploading");
    console.log('📤 Iniciando subida de documento:', {
      archivo: file.name,
      tipo_documento_id: tipoDocumentoId,
      fecha_vencimiento: fechaVencimiento || 'sin fecha',
      modulo,
      entidad_id: entidadId
    });

    try {
      // Crear FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("modulo", modulo);
      formData.append("entidad_id", entidadId);
      formData.append("tipo_documento_id", tipoDocumentoId);
      
      // Agregar fecha de vencimiento si está presente
      if (fechaVencimiento) {
        formData.append("fecha_vencimiento", fechaVencimiento);
      }

      // Subir archivo
      const uploadResponse = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Error en upload: ${uploadResponse.status}`);
      }

      const result = await uploadResponse.json();

      // Verificar que tenemos la key
      if (!result || !result.key) {
        throw new Error("Respuesta inválida: falta key");
      }

      console.log('✅ Documento subido exitosamente:', result);
      setStatus("success");
      
      // Registrar log si es un documento de cliente
      if (modulo === "clientes") {
        await logDocumentoSubido(entidadId, file.name);
      }
      
      // Limpiar formulario
      setFile(null);
      setTipoDocumentoId("");
      setFechaVencimiento("");
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }

    } catch (error) {
      console.error("❌ Error en upload:", error);
      setStatus("error");
    }
  };

  return (
    <div className="border border-muted rounded-xl p-6 bg-background shadow-sm space-y-4 w-full max-w-md">
      <label className="text-white text-sm font-medium">📄 Documento</label>

      {/* Selector de tipo */}
      <div className="space-y-2">
        <label className="text-white text-sm font-medium">
          Tipo de documento {loadingTipos && <span className="text-xs text-white/60">(cargando...)</span>}
        </label>
        <Select value={tipoDocumentoId} onValueChange={setTipoDocumentoId} disabled={loadingTipos}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loadingTipos ? "Cargando tipos..." : "Seleccionar tipo"} />
          </SelectTrigger>
          <SelectContent>
            {tiposDocumentos.length === 0 && !loadingTipos ? (
              <SelectItem value="no-tipos" disabled>
                No hay tipos disponibles para {modulo}
              </SelectItem>
            ) : (
              tiposDocumentos.map((tipo) => (
                <SelectItem key={tipo.id} value={tipo.id}>
                  {tipo.nombre} {tipo.requiere_vencimiento && "📅"}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        
        {tiposDocumentos.length === 0 && !loadingTipos && (
          <p className="text-xs text-yellow-400">
            ⚠️ No hay tipos de documentos configurados para el módulo &quot;{modulo}&quot;. 
            Ve a Configuración → Tipos de Documentos para crearlos.
          </p>
        )}
      </div>

      {/* Campo de fecha de vencimiento si es requerido */}
      {tipoSeleccionado?.requiere_vencimiento && (
        <div className="space-y-2">
          <label className="text-white text-sm font-medium flex items-center gap-2">
            📅 Fecha de vencimiento
            <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full text-base cursor-pointer"
              min={new Date().toISOString().split('T')[0]} // No permitir fechas pasadas
              style={{
                colorScheme: 'dark'
              }}
            />
            {!fechaVencimiento && (
              <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                <span className="text-white/40 text-sm">Haz clic para seleccionar fecha</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-amber-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Alerta {tipoSeleccionado.dias_antes_alarma} días antes</span>
            </div>
            {fechaVencimiento && (
              <div className="text-blue-400">
                • Vence: {new Date(fechaVencimiento).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Área de archivo */}
      <div className={cn(
        "w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground relative",
        file ? "border-green-500" : "border-muted"
      )}>
        <Input
          type="file"
          accept=".pdf,.jpg,.png"
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <span className="text-sm relative z-0">
          {file ? file.name : "Seleccionar archivo"}
        </span>
      </div>

      {/* Botón de subida */}
      <Button
        onClick={handleUpload}
        disabled={!file || !tipoDocumentoId || status === "uploading" || loadingTipos}
        className="w-full"
      >
        {status === "uploading" ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            Subiendo...
          </div>
        ) : (
          "Subir documento"
        )}
      </Button>

      {/* Estados */}
      {status === "success" && (
        <p className="text-green-400 text-sm">✅ Documento subido con éxito</p>
      )}
      {status === "error" && (
        <p className="text-red-400 text-sm">❌ Error al subir el documento</p>
      )}
    </div>
  );
} 