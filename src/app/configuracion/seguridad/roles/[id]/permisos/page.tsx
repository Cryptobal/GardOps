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

// Mapeo de módulos UI a prefijos de permisos en BD
const MODULO_PREFIXES: Record<string, string[]> = {
  'clientes': ['clientes'],
  'instalaciones': ['instalaciones'],
  'guardias': ['guardias'],
  'pauta-diaria': ['pauta_diaria', 'pauta-diaria'],
  'pauta-mensual': ['pauta_mensual', 'pauta-mensual'],
  'documentos': ['documentos'],
  'reportes': ['reportes'],
  'usuarios': ['usuarios'],
  'roles': ['roles'],
  'permisos': ['permisos'],
  'tenants': ['tenants'],
  'estructuras': ['estructuras'],
  'sueldos': ['sueldos'],
  'planillas': ['planillas'],
  'logs': ['logs'],
  'central-monitoring': ['central_monitoring', 'central-monitoring'],
  'configuracion': ['configuracion'],
  'auditoria': ['auditoria'],
  'rbac': ['rbac']
};

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
      { clave: "documentos.view", nombre: "Ver", descripcion: "Consultar documentos y KPIs" },
      { clave: "documentos.upload", nombre: "Subir", descripcion: "Subir documentos" },
      { clave: "documentos.edit", nombre: "Editar", descripcion: "Modificar documentos" },
      { clave: "documentos.delete", nombre: "Eliminar", descripcion: "Eliminar documentos" },
      { clave: "documentos.*", nombre: "Todo", descripcion: "Acceso completo a documentos" }
    ]
  },
  "Reportes": {
    icon: "📈",
    permisos: [
      { clave: "reportes.view", nombre: "Ver", descripcion: "Ver reportes y alertas" },
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

  // Debug: Log del estado de permisos
  useEffect(() => {
    console.log('🔍 Estado actual de permisos asignados:', {
      count: permisosAsignados.size,
      ids: Array.from(permisosAsignados),
      hasChanges
    });
  }, [permisosAsignados, hasChanges]);

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
          const fuente = Array.isArray(asignadosData.items) ? asignadosData.items : asignadosData.permisos || [];
          const asignadosSet = new Set(
            fuente.map((p: any) => p.permiso_id || p.id).filter(Boolean)
          );
          setPermisosAsignados(asignadosSet as Set<string>);
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

  // Función para calcular nivel de acceso basado en permisos
  const calcularNivelesDesdePermisos = (modulo: string): string => {
    const prefixes = MODULO_PREFIXES[modulo] || [modulo];

    const permisosClaves = Array.from(permisosAsignados).map(id => 
      permisosDisponibles.find(p => p.id === id)?.clave
    ).filter(Boolean) as string[];

    // Claves del módulo en catálogo
    const clavesModulo = permisosDisponibles
      .filter(p => prefixes.some(px => p.clave.startsWith(px + '.')))
      .map(p => p.clave)
      .filter(Boolean);

    // Wildcard -> admin
    const hasWildcard = prefixes.some(px => permisosClaves.includes(`${px}.*`));
    if (hasWildcard) return 'admin';

    // Si tiene todos los permisos del modulo asignados -> admin
    const setAsignados = new Set(
      permisosClaves.filter(c => prefixes.some(px => c.startsWith(px + '.')) && !c.endsWith('.*'))
    );
    const setModulo = new Set(
      clavesModulo.filter(c => !c.endsWith('.*'))
    );
    if (setModulo.size > 0 && setAsignados.size >= setModulo.size) {
      return 'admin';
    }

    // ¿Tiene permisos de edición/acción (no solo view/delete)?
    const hasEditLike = permisosClaves.some(c => {
      if (!prefixes.some(px => c.startsWith(px + '.'))) return false;
      const suffix = c.split('.').slice(1).join('.');
      return suffix && !suffix.endsWith('view') && !suffix.endsWith('delete') && !suffix.endsWith('.*');
    });
    if (hasEditLike) return 'edit';

    // ¿Tiene view?
    const hasView = permisosClaves.some(c => 
      prefixes.some(px => c === `${px}.view`)
    );
    if (hasView) return 'view';

    return 'none';
  };

  // Función para obtener permisos que se asignarán para un nivel
  const obtenerPermisosParaNivel = (modulo: string, nivel: string): string[] => {
    const prefixes = MODULO_PREFIXES[modulo] || [modulo];
    const result: string[] = [];

    // Utilidades
    const pushIf = (clave: string) => {
      const id = getPermisoId(clave);
      if (id) result.push(id);
    };

    const idsDeClavesModulo = (filtro?: (clave: string) => boolean) => {
      const ids: string[] = [];
      permisosDisponibles.forEach(p => {
        if (prefixes.some(px => p.clave.startsWith(px + '.'))) {
          if (!filtro || filtro(p.clave)) ids.push(p.id);
        }
      });
      return ids;
    };

    switch (nivel) {
      case 'admin': {
        // Preferir wildcard si existe, si no, todos los permisos del módulo
        prefixes.forEach(px => {
          const wildcard = getPermisoId(`${px}.*`);
          if (wildcard) {
            result.push(wildcard);
          }
        });
        if (result.length === 0) {
          idsDeClavesModulo().forEach(id => result.push(id));
        }
        break;
      }
      case 'edit': {
        // Intentar view/create/edit
        prefixes.forEach(px => {
          ['view', 'create', 'edit'].forEach(action => pushIf(`${px}.${action}`));
        });
        // Si no existen acciones estándar, tomar "todas menos delete y wildcard"
        if (result.length === 0) {
          idsDeClavesModulo((c) => !c.endsWith('delete') && !c.endsWith('.*')).forEach(id => result.push(id));
        }
        break;
      }
      case 'view': {
        prefixes.forEach(px => pushIf(`${px}.view`));
        break;
      }
      case 'none':
      default:
        // no agregar permisos
        break;
    }

    return result;
  };

  // Función para asignar nivel a un módulo
  const asignarNivelModulo = (modulo: string, nivel: string) => {
    if (!canEdit) return;
    
    const permisosIds = obtenerPermisosParaNivel(modulo, nivel);
    const newAsignados = new Set(permisosAsignados);
    
    // Remover permisos existentes del módulo
    const prefixes = MODULO_PREFIXES[modulo] || [modulo];
    prefixes.forEach(prefix => {
      permisosDisponibles.forEach(p => {
        if (p.clave.startsWith(prefix + '.')) {
          newAsignados.delete(p.id);
        }
      });
    });
    
    // Agregar nuevos permisos
    permisosIds.forEach(id => newAsignados.add(id));
    
    setPermisosAsignados(newAsignados);
    setHasChanges(true);
  };

  // Función para asignar todo a un nivel
  const asignarTodoNivel = (nivel: string) => {
    if (!canEdit) return;
    
    const newAsignados = new Set<string>();
    
    Object.keys(MODULO_PREFIXES).forEach(modulo => {
      const permisosIds = obtenerPermisosParaNivel(modulo, nivel);
      permisosIds.forEach(id => newAsignados.add(id));
    });
    
    setPermisosAsignados(newAsignados);
    setHasChanges(true);
  };

  // Estado para el modal de preview
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<{
    modulo: string;
    nivel: string;
    permisos: string[];
  } | null>(null);

  // Función para mostrar preview de permisos
  const mostrarPreviewNivel = (modulo: string, nivel: string) => {
    const permisosIds = obtenerPermisosParaNivel(modulo, nivel);
    const permisosClaves = permisosIds.map(id => 
      permisosDisponibles.find(p => p.id === id)?.clave
    ).filter(Boolean);
    
    setPreviewData({
      modulo,
      nivel,
      permisos: permisosClaves
    });
    setShowPreviewModal(true);
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

      // 🔄 RECARGAR PERMISOS DESPUÉS DE GUARDAR
      try {
        console.log('🔄 Recargando permisos desde el servidor...');
        const asignadosRes = await rbacFetch(`/api/admin/rbac/roles/${rolId}/permisos`);
        const asignadosData = await asignadosRes.json();
        
        if (asignadosRes.ok) {
          const fuente = Array.isArray(asignadosData.items) ? asignadosData.items : asignadosData.permisos || [];
          const asignadosSet = new Set(
            fuente.map((p: any) => p.permiso_id || p.id).filter(Boolean)
          );
          
          console.log('📊 Permisos recibidos del servidor:', fuente.length);
          console.log('🔑 IDs de permisos:', Array.from(asignadosSet));
          
          // Forzar actualización del estado
          setPermisosAsignados(new Set(asignadosSet));
          
          // Verificar que se actualizó correctamente
          setTimeout(() => {
            console.log('✅ Estado actualizado. Permisos asignados:', asignadosSet.size, 'permisos');
          }, 100);
        } else {
          console.error('❌ Error al recargar permisos:', asignadosData);
        }
      } catch (reloadError) {
        console.error('❌ Error al recargar permisos:', reloadError);
      }

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

      {/* Botones de Acción Rápida */}
      {canEdit && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              ⚡ Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => asignarTodoNivel('none')}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30"
              >
                🚫 Todo Sin Acceso
              </Button>
              <Button
                variant="outline"
                onClick={() => asignarTodoNivel('view')}
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
              >
                👁️ Todo Solo Ver
              </Button>
              <Button
                variant="outline"
                onClick={() => asignarTodoNivel('edit')}
                className="flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30"
              >
                ✏️ Todo Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => asignarTodoNivel('admin')}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/30"
              >
                ⚙️ Todo Administrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matriz de Permisos - Nueva Interfaz UX/UI */}
      <div className="space-y-8">
        {/* Header de la matriz */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">🎯 Matriz de Permisos por Módulos</h2>
            <p className="text-sm text-muted-foreground">
              Asigna niveles de acceso para cada módulo del sistema
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => mostrarPreviewNivel('todos', 'admin')}
                className="flex items-center gap-1"
              >
                🔍 Ver Todos los Permisos
              </Button>
            </div>
          )}
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(MODULOS_PERMISOS).map(([modulo, config]) => {
            const nivelActual = calcularNivelesDesdePermisos(modulo);
            
            return (
              <Card key={modulo} className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/30">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{config.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{modulo}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {config.permisos.length} permisos disponibles
                        </p>
                      </div>
                    </div>
                    
                    {/* Badge de nivel actual */}
                    <Badge 
                      variant={nivelActual === 'admin' ? 'default' : 
                              nivelActual === 'edit' ? 'secondary' : 
                              nivelActual === 'view' ? 'outline' : 'destructive'}
                      className="text-xs"
                    >
                      {nivelActual === 'admin' ? '⚙️ Admin' : 
                       nivelActual === 'edit' ? '✏️ Editar' : 
                       nivelActual === 'view' ? '👁️ Ver' : '🚫 Sin Acceso'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {canEdit ? (
                    <div className="space-y-4">
                      {/* Controles de nivel */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { nivel: 'none', icon: '🚫', label: 'Sin Acceso', color: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30' },
                          { nivel: 'view', icon: '👁️', label: 'Solo Ver', color: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/30' },
                          { nivel: 'edit', icon: '✏️', label: 'Editar', color: 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30' },
                          { nivel: 'admin', icon: '⚙️', label: 'Admin', color: 'bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/30' }
                        ].map(({ nivel, icon, label, color }) => (
                          <Button
                            key={nivel}
                            variant={nivelActual === nivel ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => asignarNivelModulo(modulo, nivel)}
                            className={`h-12 flex flex-col items-center justify-center gap-1 text-xs ${nivelActual === nivel ? '' : color}`}
                          >
                            <span className="text-lg">{icon}</span>
                            <span className="text-xs">{label}</span>
                          </Button>
                        ))}
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => mostrarPreviewNivel(modulo, nivelActual)}
                          className="flex items-center gap-1 text-xs"
                        >
                          🔍 Ver Permisos
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectAllModulo(modulo)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <CheckSquare className="h-3 w-3" />
                          Todo
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearAllModulo(modulo)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Square className="h-3 w-3" />
                          Limpiar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        No tienes permisos para editar este rol
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Información de Niveles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚫</span>
                <span className="font-medium">Sin Acceso</span>
              </div>
              <p className="text-sm text-muted-foreground">El módulo no será visible para el usuario</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">👁️</span>
                <span className="font-medium">Solo Ver</span>
              </div>
              <p className="text-sm text-muted-foreground">Puede consultar información sin modificarla</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">✏️</span>
                <span className="font-medium">Editar</span>
              </div>
              <p className="text-sm text-muted-foreground">Puede crear, editar y ver registros</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                <span className="font-medium">Administrar</span>
              </div>
              <p className="text-sm text-muted-foreground">Acceso completo: ver, crear, editar, eliminar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Preview */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                🔍 Permisos para {previewData.modulo} - {previewData.nivel}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreviewModal(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Los siguientes permisos se asignarán al rol:
              </p>
              
              {previewData.permisos.length > 0 ? (
                <div className="space-y-2">
                  {previewData.permisos.map((permiso, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <span className="text-green-500">✓</span>
                      <code className="text-sm font-mono">{permiso}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No se asignarán permisos para este nivel
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  if (previewData.modulo !== 'todos') {
                    asignarNivelModulo(previewData.modulo, previewData.nivel);
                  }
                  setShowPreviewModal(false);
                }}
              >
                Aplicar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
