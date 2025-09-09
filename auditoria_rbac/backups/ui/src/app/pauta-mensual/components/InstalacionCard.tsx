"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { 
  Building2, 
  Users, 
  Shield, 
  AlertCircle, 
  UserCheck, 
  Plus, 
  Edit,
  ExternalLink,
  Loader2,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";

interface RolServicio {
  id: string;
  nombre: string;
  cantidad_guardias: number;
  patron_turno?: string;
}

interface InstalacionConPauta {
  id: string;
  nombre: string;
  direccion: string;
  cliente_nombre?: string;
  puestos_con_pauta: number;
}

interface InstalacionSinPauta {
  id: string;
  nombre: string;
  direccion: string;
  cliente_nombre?: string;
  roles: RolServicio[];
  cantidad_guardias: number;
  cantidad_ppcs: number;
  puestos_sin_asignar: number;
  total_puestos: number;
}

interface InstalacionCardProps {
  instalacion: InstalacionConPauta | InstalacionSinPauta;
  tipo: 'con_pauta' | 'sin_pauta';
  onAction: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  loading?: boolean;
  mes: number;
  anio: number;
  hideDireccion?: boolean;
}

export default function InstalacionCard({ 
  instalacion, 
  tipo, 
  onAction,
  onDelete,
  onEdit,
  loading = false,
  mes,
  anio,
  hideDireccion = false
}: InstalacionCardProps) {
  const isConPauta = tipo === 'con_pauta';
  const instalacionConPauta = instalacion as InstalacionConPauta;
  const instalacionSinPauta = instalacion as InstalacionSinPauta;
  const router = useRouter();

  const irAInstalacion = () => {
    router.push(`/instalaciones/${instalacion.id}`);
  };
  const tieneRoles = !isConPauta && (instalacionSinPauta.roles?.length || 0) > 0;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <button
              onClick={irAInstalacion}
              className="font-semibold text-sm truncate hover:underline text-blue-600 dark:text-blue-400 transition-colors min-w-0"
            >
              <span className="truncate block">{instalacion.nombre}</span>
            </button>
          </div>
          <Badge 
            variant={isConPauta ? "default" : "secondary"} 
            className={`text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0 ${
              isConPauta 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {isConPauta ? "✅ Con pauta" : "❌ Sin pauta"}
          </Badge>
        </div>
        {/* Dirección solo si hideDireccion es false */}
        {!hideDireccion && (
          <p className="mt-2 text-xs text-muted-foreground truncate">
            {instalacion.direccion}
          </p>
        )}
        {/* Información del cliente */}
        {instalacion.cliente_nombre && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            Cliente: {instalacion.cliente_nombre}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 flex flex-col justify-between flex-1">
        <div className="flex-1 space-y-2">
          {isConPauta ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{instalacionConPauta.puestos_con_pauta} puestos con pauta</span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Roles de servicio */}
              {instalacionSinPauta.roles.length > 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Roles: {instalacionSinPauta.roles.map((r: RolServicio) => r.nombre).join(', ')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Sin roles de servicio</span>
                </div>
              )}

              {/* Guardias asignados */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserCheck className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{instalacionSinPauta.cantidad_guardias} guardias asignados</span>
              </div>

              {/* PPCs activos */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{instalacionSinPauta.cantidad_ppcs} PPCs activos</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4 flex-shrink-0 flex-wrap">
          {/* Botón principal - Crear pauta para instalaciones sin pauta */}
          {!isConPauta && (
            <Button
              onClick={onAction}
              disabled={loading}
              size="sm"
              className={`flex-1 ${tieneRoles ? "bg-red-600 hover:bg-red-700 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-black"}`}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              <span className="ml-1 text-xs">{tieneRoles ? "Generar pauta" : "Asignar rol"}</span>
            </Button>
          )}

          {/* Botón editar para instalaciones con pauta */}
          {isConPauta && onEdit && (
            <Button
              onClick={onEdit}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Edit className="h-3 w-3" />
              <span className="ml-1 text-xs">Ver pauta</span>
            </Button>
          )}

          {/* Botón eliminar para instalaciones con pauta */}
          {isConPauta && onDelete && (
            <Button
              onClick={onDelete}
              size="sm"
              variant="destructive"
              className="text-xs"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 