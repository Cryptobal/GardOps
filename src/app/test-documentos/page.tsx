"use client";

import { DocumentManager } from "@/components/ui/document-manager";
import DocumentUploader from "@/components/DocumentUploader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function TestDocumentosPage() {
  const [testId] = useState("test-123");

  const ejecutarMigracion = async () => {
    try {
      const response = await fetch("/api/migrate-documentos");
      const data = await response.json();
      console.log("Migración:", data);
      alert("Migración completada. Revisa la consola para detalles.");
    } catch (error) {
      console.error("Error en migración:", error);
      alert("Error en migración. Revisa la consola.");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prueba del Sistema de Documentos</h1>
        <Button onClick={ejecutarMigracion} variant="outline">
          Ejecutar Migración
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Instrucciones</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Primero ejecuta la migración para crear la tabla de documentos</li>
          <li>Usa el componente DocumentManager para subir archivos de prueba</li>
          <li>Los archivos se almacenarán en Cloudflare R2</li>
          <li>Puedes descargar y eliminar documentos</li>
        </ol>
      </Card>

      <div className="grid gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">📁 Gestión Completa de Documentos</h3>
          <DocumentManager 
            modulo="test"
            entidad_id={testId}
            onDocumentUploaded={() => console.log("Documento subido exitosamente")}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">📤 Subida Simple de Documentos</h3>
          <DocumentUploader modulo="test" entidadId={testId} />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Información del Sistema</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Almacenamiento:</strong> Cloudflare R2</p>
            <p><strong>Base de datos:</strong> PostgreSQL (Neon)</p>
            <p><strong>URLs temporales:</strong> 10 minutos</p>
            <p><strong>Módulo de prueba:</strong> "test"</p>
            <p><strong>ID de prueba:</strong> {testId}</p>
          </div>
        </Card>
      </div>
    </div>
  );
} 