"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCan } from "@/lib/permissions";
import { rbacFetch } from "@/lib/rbacClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, CheckSquare, Square, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Permiso {
  id: string;
  clave: string;
  descripcion: string | null;
  categoria: string | null;
}

interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
}

interface PermisoAsignado {
  permiso_id: string;
  rol_id: string;
}

// Mapeo de módulos y sus permisos
const MODULOS_PERMISOS = {
  "Clientes": {
    icon: "🏢",
    permisos: [
      { clave: "clientes.view", nombre: "Ver", descripcion: "Consultar clientes" },
      { clave: "clientes.create", nombre: "Crear", descripcion: "Crear nuevos clientes" },
      { clave: "clientes.edit", nombre: "Editar", descripcion: "Modificar clientes" },
      { clave: "clientes.delete", nombre: "Eliminar", descripcion: "Eliminar clientes" },
      { clave: "clientes.*", nombre: "Todo", descripcion: "Acceso completo" }
    ]
  },
  "Instalaciones": {
    icon: "🏭",
    permisos: [
      { clave: "instalaciones.view", nombre: "Ver", descripcion: "Consultar instalaciones" },
      { clave: "instalaciones.create", nombre: "Crear", descripcion: "Crear instalaciones" },
      { clave: "instalaciones.edit", nombre: "Editar", descripcion: "Modificar instalaciones" },
      { clave: "instalaciones.delete", nombre: "Eliminar", descripcion: "Eliminar instalaciones" },
      { clave: "instalaciones.turnos", nombre: "Turnos", descripcion: "Gestionar turnos" },
      { clave: "instalaciones.ppcs", nombre: "PPCs", descripcion: "Gestionar PPCs" },
      { clave: "instalaciones.*", nombre: "Todo", descripcion: "Acceso completo" }
    ]
  },
  "Guardias": {
    icon: "👮",
    permisos: [
      { clave: "guardias.view", nombre: "Ver", descripcion: "Consultar guardias" },
      { clave: "guardias.create", nombre: "Crear", descripcion: "Crear guardias" },
      { clave: "guardias.edit", nombre: "Editar", descripcion: "Modificar guardias" },
      { clave: "guardias.delete", nombre: "Eliminar", descripcion: "Eliminar guardias" },
      { clave: "guardias.permisos", nombre: "Permisos", descripcion: "Gestionar permisos" },
      { clave: "guardias.finiquitos", nombre: "Finiquitos", descripcion: "Gestionar finiquitos" },
      { clave: "guardias.*", nombre: "Todo", descripcion: "Acceso completo" }
    ]
  },
  "Pauta Diaria": {
    icon: "📅",
    permisos: [
      { clave: "pauta-diaria.view", nombre: "Ver", descripcion: "Consultar pauta diaria" },
      { clave: "pauta-diaria.edit", nombre: "Editar", descripcion: "Modificar pauta diaria" },
      { clave: "pauta-diaria.reemplazos", nombre: "Reemplazos", descripcion: "Gestionar reemplazos" },
      { clave: "pauta-diaria.turnos-extras", nombre: "Turnos Extras", descripcion: "Gestionar turnos extras" },
      { clave: "pauta-diaria.*", nombre: "Todo", descripcion: "Acceso completo" }
    ]
  },
  "Pauta Mensual": {
    icon: "📊",
    permisos: [
      { clave: "pauta-mensual.view", nombre: "Ver", descripcion: "Consultar pauta mensual" },
      { clave: "pauta-mensual.create", nombre: "Crear", descripcion: "Crear pauta mensual" },
      { clave: "pauta-mensual.edit", nombre: "Editar", descripcion: "Modificar pauta mensual" },
      { clave: "pauta-mensual.delete", nombre: "Eliminar", descripcion: "Eliminar pauta mensual" },
      { clave: "pauta-mensual.*", nombre: "Todo", descripcion: "Acceso completo" }
    ]
  },
  "Documentos": {
    icon: "📄",
    permisos: [
      { clave: "documentos.view", nombre: "Ver", descripcion: "Consultar documentos" },
      { clave: "documentos.upload", nombre: "Subir", descripcion: "Subir documentos" },
      { clave: "documentos.edit", nombre: "Editar", descripcion: "Modificar documentos" },
      { clave: "documentos.delete", nombre: "Eliminar", descripcion: "Eliminar documentos" },
      { clave: "documentos.*", nombre: "Todo", descripcion: "Acceso completo" }
    ]
  },
  "Reportes": {
    icon: "📈",
    permisos: [
      { clave: "reportes.asistencia", nombre: "Asistencia", descripcion: "Reportes de asistencia" },
      { clave: "reportes.turnos", nombre: "Turnos", descripcion: "Reportes de turnos" },
      { clave: "reportes.payroll", nombre: "Payroll", descripcion: "Reportes de nómina" },
      { clave: "reportes.export", nombre: "Exportar", descripcion: "Exportar reportes" },
      { clave: "reportes.*", nombre: "Todo", descripcion: "Acceso completo" }
    ]
  }
};

export default function PermisosRolPage() {
  const router = useRouter();
  const params = useParams();
  const rolId = params.id as string;

  const { allowed: canRead, loading } = useCan("rbac.roles.read");
  const { allowed: canWrite } = useCan("rbac.roles.write");
  const { allowed: isPlatformAdmin } = useCan("rbac.platform_admin");

  const [rol, setRol] = useState<Rol | null>(null);
  const [permisosAsignados, setPermisosAsignados] = useState<Set<string>>(new Set());
  const [permisosDisponibles, setPermisosDisponibles] = useState<Permiso[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { addToast } = useToast();

  const hasAccess = canRead || isPlatformAdmin;
  const canEdit = canWrite || isPlatformAdmin;

  // Cargar datos del rol y permisos
  useEffect(() => {
    if (!hasAccess || loading || !rolId) return;

    let done = false;
    (async () => {
      try {
        setBusy(true);
        setError(null);

        // Cargar rol
        const rolRes = await rbacFetch(`/api/admin/rbac/roles/${rolId}`);
        const rolData = await rolRes.json();
        if (!rolRes.ok) throw new Error(rolData?.detail || rolData?.error || `HTTP ${rolRes.status}`);
        if (!done) setRol(rolData);

        // Cargar permisos disponibles
        const permisosRes = await rbacFetch("/api/admin/rbac/permisos");
        const permisosData = await permisosRes.json();
        if (!permisosRes.ok) throw new Error(permisosData?.detail || permisosData?.error || `HTTP ${permisosRes.status}`);
        if (!done) setPermisosDisponibles(permisosData.items || []);

        // Cargar permisos asignados
        const asignadosRes = await rbacFetch(`/api/admin/rbac/roles/${rolId}/permisos`);
        const asignadosData = await asignadosRes.json();
        if (!asignadosRes.ok) throw new Error(asignadosData?.detail || asignadosData?.error || `HTTP ${asignadosRes.status}`);
        if (!done) {
          const asignadosSet = new Set(asignadosData.permisos?.map((p: any) => p.permiso_id) || []);
          setPermisosAsignados(asignadosSet);
        }

      } catch (e: any) {
        if (!done) setError(e?.message || "Error inesperado");
      } finally {
        if (!done) setBusy(false);
      }
    })();
    return () => { done = true; };
  }, [hasAccess, loading, rolId]);

  // Función para obtener el ID de un permiso por clave
  const getPermisoId = (clave: string) => {
    return permisosDisponibles.find(p => p.clave === clave)?.id;
  };

  // Función para verificar si un permiso está asignado
  const isPermisoAsignado = (clave: string) => {
    const permisoId = getPermisoId(clave);
    return permisoId ? permisosAsignados.has(permisoId) : false;
  };

  // Función para alternar un permiso
  const togglePermiso = (clave: string) => {
    if (!canEdit) return;
    
    const permisoId = getPermisoId(clave);
    if (!permisoId) return;

    const newAsignados = new Set(permisosAsignados);
    if (newAsignados.has(permisoId)) {
      newAsignados.delete(permisoId);
    } else {
      newAsignados.add(permisoId);
    }
    setPermisosAsignados(newAsignados);
    setHasChanges(true);
  };

  // Función para seleccionar todo un módulo
  const selectAllModulo = (modulo: string) => {
    if (!canEdit) return;
    
    const moduloPermisos = MODULOS_PERMISOS[modulo as keyof typeof MODULOS_PERMISOS];
    if (!moduloPermisos) return;

    const newAsignados = new Set(permisosAsignados);
    moduloPermisos.permisos.forEach(permiso => {
      const permisoId = getPermisoId(permiso.clave);
      if (permisoId) {
        newAsignados.add(permisoId);
      }
    });
    setPermisosAsignados(newAsignados);
    setHasChanges(true);
  };

  // Función para limpiar todo un módulo
  const clearAllModulo = (modulo: string) => {
    if (!canEdit) return;
    
    const moduloPermisos = MODULOS_PERMISOS[modulo as keyof typeof MODULOS_PERMISOS];
    if (!moduloPermisos) return;

    const newAsignados = new Set(permisosAsignados);
    moduloPermisos.permisos.forEach(permiso => {
      const permisoId = getPermisoId(permiso.clave);
      if (permisoId) {
        newAsignados.delete(permisoId);
      }
    });
    setPermisosAsignados(newAsignados);
    setHasChanges(true);
  };

  // Función para guardar cambios
  const guardarCambios = async () => {
    if (!canEdit || !rolId) return;

    try {
      setBusy(true);
      setError(null);

      const permisosArray = Array.from(permisosAsignados);
      
      const res = await rbacFetch(`/api/admin/rbac/roles/${rolId}/permisos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permisos: permisosArray })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);

      addToast({
        title: "✅ Permisos actualizados",
        description: `Los permisos del rol "${rol?.nombre}" han sido actualizados exitosamente.`,
        type: "success"
      });

      setHasChanges(false);

    } catch (e: any) {
      setError(e?.message || "Error al guardar");
      addToast({
        title: "❌ Error",
        description: e?.message || "Error al guardar los permisos",
        type: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          Verificando permisos...
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          No tienes permisos para ver esta página.
        </div>
      </div>
    );
  }

  if (busy && !rol) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          Cargando rol y permisos...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-red-600">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Permisos del Rol</h1>
            <p className="text-muted-foreground">
              {rol?.nombre} - {rol?.descripcion}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Cambios pendientes
              </Badge>
            )}
            <Button
              onClick={guardarCambios}
              disabled={!hasChanges || busy}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {busy ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        )}
      </div>

      {/* Matriz de Permisos */}
      <div className="space-y-6">
        {Object.entries(MODULOS_PERMISOS).map(([modulo, config]) => (
          <Card key={modulo}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">{config.icon}</span>
                  {modulo}
                </CardTitle>
                
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllModulo(modulo)}
                      className="flex items-center gap-1"
                    >
                      <CheckSquare className="h-3 w-3" />
                      Todo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearAllModulo(modulo)}
                      className="flex items-center gap-1"
                    >
                      <Square className="h-3 w-3" />
                      Limpiar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {config.permisos.map((permiso) => (
                  <div
                    key={permiso.clave}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={permiso.clave}
                      checked={isPermisoAsignado(permiso.clave)}
                      onCheckedChange={() => togglePermiso(permiso.clave)}
                      disabled={!canEdit}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={permiso.clave}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {permiso.nombre}
                      </label>
                      <p className="text-xs text-muted-foreground truncate">
                        {permiso.descripcion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Ver:</strong> Permite consultar información sin modificarla</p>
          <p>• <strong>Crear:</strong> Permite crear nuevos registros</p>
          <p>• <strong>Editar:</strong> Permite modificar registros existentes</p>
          <p>• <strong>Eliminar:</strong> Permite eliminar registros</p>
          <p>• <strong>Todo:</strong> Incluye todos los permisos del módulo</p>
          <p>• Los permisos se aplican de forma acumulativa</p>
        </CardContent>
      </Card>
    </div>
  );
}
