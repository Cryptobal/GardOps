import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { 
  FileText, 
  Plus, 
  Settings,
  Search,
  Calendar,
  Hash
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable, Column } from "../../../components/ui/data-table";
import { getJSON } from "../../../lib/api";

interface Plantilla {
  id: string;
  name: string;
  content_html: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export default function PlantillasPage() {
  const router = useRouter();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Cargar plantillas
  useEffect(() => {
    const fetchPlantillas = async () => {
      try {
        setLoading(true);
        const result = await getJSON<{ success: boolean; data: Plantilla[] }>("/api/doc/templates");

        if (result.success) {
          setPlantillas(result.data);
        } else {
          console.error("Error al cargar plantillas:", result);
        }
      } catch (error) {
        console.error("Error cargando plantillas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlantillas();
  }, []);

  // Filtrar plantillas
  const filteredPlantillas = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return plantillas;
    }

    const search = searchTerm.toLowerCase().trim();
    return plantillas.filter(plantilla => 
      plantilla.name.toLowerCase().includes(search) ||
      plantilla.variables.some(variable => variable.toLowerCase().includes(search))
    );
  }, [plantillas, searchTerm]);

  // Configuración de columnas para DataTable
  const columns: Column<Plantilla>[] = [
    {
      key: "name",
      label: "Nombre",
      render: (plantilla) => (
        <div>
          <div className="font-bold text-foreground">{plantilla.name}</div>
          <div className="text-xs text-muted-foreground">
            Creada: {new Date(plantilla.created_at).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      key: "variables",
      label: "Variables",
      render: (plantilla) => (
        <div className="flex flex-wrap gap-1">
          {plantilla.variables && plantilla.variables.length > 0 ? (
            plantilla.variables.map((variable, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Hash className="h-3 w-3 mr-1" />
                {variable}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">Sin variables</span>
          )}
        </div>
      )
    },
    {
      key: "updated_at",
      label: "Actualizado",
      render: (plantilla) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">
            {new Date(plantilla.updated_at).toLocaleDateString()}
          </span>
        </div>
      )
    }
  ];

  // Card para móvil
  const mobileCard = (plantilla: Plantilla) => (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50 h-full"
      onClick={() => router.push(`/documentos/plantillas/editor?id=${plantilla.id}`)}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{plantilla.name}</h3>
              <p className="text-xs text-muted-foreground">
                Creada: {new Date(plantilla.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              {new Date(plantilla.updated_at).toLocaleDateString()}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {plantilla.variables && plantilla.variables.length > 0 ? (
              plantilla.variables.slice(0, 3).map((variable, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <Hash className="h-3 w-3 mr-1" />
                  {variable}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Sin variables</span>
            )}
            {plantilla.variables && plantilla.variables.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{plantilla.variables.length - 3} más
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col space-y-4 md:space-y-6"
    >
      {/* Header con título y botones */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Plantillas de Documentos</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Crea y gestiona plantillas de documentos con variables dinámicas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => router.push('/configuracion/variables')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Variables
          </Button>
          <Button 
            onClick={() => router.push('/documentos/plantillas/nueva')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre o variables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de plantillas */}
      <div className="flex-1 min-h-0">
        <DataTable
          data={filteredPlantillas}
          columns={columns}
          loading={loading}
          emptyMessage="No hay plantillas registradas"
          emptyIcon={FileText}
          mobileCard={mobileCard}
          onRowClick={(plantilla) => router.push(`/documentos/plantillas/editor?id=${plantilla.id}`)}
          className="h-full"
        />
      </div>
    </motion.div>
  );
}

// Página de plantillas lista
