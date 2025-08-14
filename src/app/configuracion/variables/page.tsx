import { Authorize, GuardButton, can } from '@/lib/authz-ui'
"use client";

import React, { useState, useEffect } from "react";
import { useCan } from "@/lib/permissions";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { 
  Hash, 
  Plus, 
  Trash2,
  Save,
  ArrowLeft,
  FileText,
  Search
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable, Column } from "../../../components/ui/data-table";

interface Variable {
  id?: string;
  var_key: string;
  description?: string;
  category?: string;
  example?: string;
}

// Variables predefinidas del sistema
const SYSTEM_VARIABLES: Variable[] = [
  { var_key: "guardia_nombre", description: "Nombre completo del guardia", category: "Guardia", example: "Juan Pérez" },
  { var_key: "guardia_rut", description: "RUT del guardia", category: "Guardia", example: "12.345.678-9" },
  { var_key: "guardia_telefono", description: "Teléfono del guardia", category: "Guardia", example: "+56 9 1234 5678" },
  { var_key: "guardia_email", description: "Email del guardia", category: "Guardia", example: "juan.perez@ejemplo.cl" },
  { var_key: "guardia_direccion", description: "Dirección del guardia", category: "Guardia", example: "Av. Principal 123" },
  
  { var_key: "instalacion_nombre", description: "Nombre de la instalación", category: "Instalación", example: "Edificio Central" },
  { var_key: "instalacion_direccion", description: "Dirección de la instalación", category: "Instalación", example: "Av. Las Condes 1234" },
  { var_key: "instalacion_comuna", description: "Comuna de la instalación", category: "Instalación", example: "Las Condes" },
  
  { var_key: "cliente_nombre", description: "Nombre del cliente", category: "Cliente", example: "Empresa ABC S.A." },
  { var_key: "cliente_rut", description: "RUT del cliente", category: "Cliente", example: "76.123.456-7" },
  { var_key: "cliente_representante", description: "Representante legal del cliente", category: "Cliente", example: "María González" },
  
  { var_key: "fecha_actual", description: "Fecha actual", category: "Sistema", example: "07/01/2025" },
  { var_key: "fecha_contrato", description: "Fecha del contrato", category: "Sistema", example: "01/01/2025" },
  { var_key: "fecha_vencimiento", description: "Fecha de vencimiento", category: "Sistema", example: "31/12/2025" },
  
  { var_key: "sueldo_base", description: "Sueldo base", category: "Sueldo", example: "$500.000" },
  { var_key: "sueldo_liquido", description: "Sueldo líquido", category: "Sueldo", example: "$450.000" },
  { var_key: "bonos_total", description: "Total de bonos", category: "Sueldo", example: "$150.000" },
  
  { var_key: "turno_horario", description: "Horario del turno", category: "Turno", example: "08:00 - 20:00" },
  { var_key: "turno_tipo", description: "Tipo de turno", category: "Turno", example: "4x4" },
  { var_key: "rol_servicio", description: "Rol de servicio", category: "Turno", example: "Guardia Diurno" }
];

export default function VariablesPage() {
  const { allowed } = useCan('config.variables.view');
  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          Acceso denegado
        </div>
      </div>
    );
  }
  const router = useRouter();
  const [variables] = useState<Variable[]>(SYSTEM_VARIABLES);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

  // Obtener categorías únicas
  const categories = ["Todas", ...new Set(variables.map(v => v.category).filter(Boolean))];

  // Filtrar variables
  const filteredVariables = React.useMemo(() => {
    let filtered = [...variables];

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(variable => 
        variable.var_key.toLowerCase().includes(search) ||
        variable.description?.toLowerCase().includes(search) ||
        variable.example?.toLowerCase().includes(search)
      );
    }

    // Filtro por categoría
    if (selectedCategory !== "Todas") {
      filtered = filtered.filter(variable => variable.category === selectedCategory);
    }

    return filtered;
  }, [variables, searchTerm, selectedCategory]);

  // Configuración de columnas para DataTable
  const columns: Column<Variable>[] = [
    {
      key: "var_key",
      label: "Variable",
      render: (variable) => (
        <div className="font-mono">
          <Badge variant="secondary" className="text-xs">
            <Hash className="h-3 w-3 mr-1" />
            {variable.var_key}
          </Badge>
        </div>
      )
    },
    {
      key: "description",
      label: "Descripción",
      render: (variable) => (
        <span className="text-sm">{variable.description || "Sin descripción"}</span>
      )
    },
    {
      key: "category",
      label: "Categoría",
      render: (variable) => (
        <Badge variant="outline" className="text-xs">
          {variable.category || "General"}
        </Badge>
      )
    },
    {
      key: "example",
      label: "Ejemplo",
      render: (variable) => (
        <span className="text-sm text-muted-foreground font-mono">
          {variable.example || "-"}
        </span>
      )
    }
  ];

  // Card para móvil
  const mobileCard = (variable: Variable) => (
    <Card 
      className="hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50 h-full"
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <Badge variant="secondary" className="text-xs font-mono">
              <Hash className="h-3 w-3 mr-1" />
              {variable.var_key}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {variable.category || "General"}
            </Badge>
          </div>
          
          <p className="text-xs">{variable.description || "Sin descripción"}</p>
          
          {variable.example && (
            <p className="text-xs text-muted-foreground font-mono">
              Ej: {variable.example}
            </p>
          )}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/documentos/plantillas')}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Plantillas
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Variables del Sistema
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Variables disponibles para usar en plantillas de documentos
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-500 mt-1" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Cómo usar las variables</p>
              <p className="text-sm text-muted-foreground">
                Para usar una variable en una plantilla, escríbela entre llaves dobles: 
                <span className="font-mono mx-2 text-blue-400">{'{{variable}}'}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Por ejemplo: "Estimado {'{{guardia_nombre}}'}, su contrato vence el {'{{fecha_vencimiento}}'}."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar variables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de variables */}
      <div className="flex-1 min-h-0">
        <DataTable
          data={filteredVariables}
          columns={columns}
          loading={false}
          emptyMessage="No hay variables que coincidan con la búsqueda"
          emptyIcon={Hash}
          mobileCard={mobileCard}
          className="h-full"
        />
      </div>
    </motion.div>
  );
}
