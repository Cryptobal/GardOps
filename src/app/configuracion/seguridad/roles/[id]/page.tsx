"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCan } from "@/lib/permissions";
import { rbacFetch } from "@/lib/rbacClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye } from "lucide-react";
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

// Módulos del sistema
const MODULOS = [
  { key: 'clientes', nombre: 'Clientes' },
  { key: 'instalaciones', nombre: 'Instalaciones' },
  { key: 'guardias', nombre: 'Guardias' },
  { key: 'pauta-diaria', nombre: 'Pauta Diaria' },
  { key: 'pauta-mensual', nombre: 'Pauta Mensual' },
  { key: 'documentos', nombre: 'Documentos' },
  { key: 'reportes', nombre: 'Reportes' },
  { key: 'usuarios', nombre: 'Usuarios' },
  { key: 'roles', nombre: 'Roles' },
  { key: 'permisos', nombre: 'Permisos' },
  { key: 'tenants', nombre: 'Tenants' },
  { key: 'estructuras', nombre: 'Estructuras' },
  { key: 'sueldos', nombre: 'Sueldos' },
  { key: 'planillas', nombre: 'Planillas' },
  { key: 'logs', nombre: 'Logs' },
  { key: 'central-monitoring', nombre: 'Central de Monitoreo' },
  { key: 'configuracion', nombre: 'Configuración' },
  { key: 'auditoria', nombre: 'Auditoría' },
  { key: 'rbac', nombre: 'RBAC' }
];

// Niveles de acceso
const NIVELES = [
  { key: 'none', nombre: 'Sin Acceso', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  { key: 'view', nombre: 'Solo Ver', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  { key: 'edit', nombre: 'Editar', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  { key: 'admin', nombre: 'Admin', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' }
];

export default function RolDetallePage() {
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

  // Función para calcular nivel de acceso basado en permisos
  const calcularNivelModulo = (modulo: string): string => {
    const prefixes = MODULO_PREFIXES[modulo] || [modulo];
    const permisosClaves = Array.from(permisosAsignados).map(id => 
      permisosDisponibles.find(p => p.id === id)?.clave
    ).filter(Boolean) as string[];
    
    // Verificar wildcard (admin)
    const wildcard = prefixes.some(prefix => 
      permisosClaves.includes(`${prefix}.*`)
    );
    
    if (wildcard) return 'admin';
    
    // Verificar si tiene permisos de edit (create, edit, view)
    const hasEditPermissions = prefixes.some(prefix => {
      const hasView = permisosClaves.includes(`${prefix}.view`);
      const hasCreate = permisosClaves.includes(`${prefix}.create`);
      const hasEdit = permisosClaves.includes(`${prefix}.edit`);
      return hasView && (hasCreate || hasEdit);
    });
    
    if (hasEditPermissions) return 'edit';
    
    // Verificar view (solo view)
    const hasView = prefixes.some(prefix => 
      permisosClaves.includes(`${prefix}.view`)
    );
    
    if (hasView) return 'view';
    
    return 'none';
  };

  // Función para obtener permisos que se asignarán para un nivel
  const obtenerPermisosParaNivel = (modulo: string, nivel: string): string[] => {
    const prefixes = MODULO_PREFIXES[modulo] || [modulo];
    const permisos: string[] = [];
    
    switch (nivel) {
      case 'admin':
        prefixes.forEach(prefix => {
          const wildcardId = getPermisoId(`${prefix}.*`);
          if (wildcardId) {
            permisos.push(wildcardId);
          } else {
            permisosDisponibles.forEach(p => {
              if (p.clave.startsWith(prefix + '.')) {
                permisos.push(p.id);
              }
            });
          }
        });
        break;
      case 'edit':
        prefixes.forEach(prefix => {
          ['view', 'create', 'edit'].forEach(action => {
            const permisoId = getPermisoId(`${prefix}.${action}`);
            if (permisoId) permisos.push(permisoId);
          });
        });
        break;
      case 'view':
        prefixes.forEach(prefix => {
          const permisoId = getPermisoId(`${prefix}.view`);
          if (permisoId) permisos.push(permisoId);
        });
        break;
      case 'none':
      default:
        break;
    }
    
    return permisos;
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

  // Función para mostrar permisos de un módulo
  const mostrarPermisosModulo = (modulo: string) => {
    const nivelActual = calcularNivelModulo(modulo);
    const permisosIds = obtenerPermisosParaNivel(modulo, nivelActual);
    const permisosClaves = permisosIds.map(id => 
      permisosDisponibles.find(p => p.id === id)?.clave
    ).filter(Boolean);
    
    const mensaje = permisosClaves.length > 0 
      ? `Permisos actuales para ${modulo}:\n${permisosClaves.join('\n')}`
      : `No hay permisos asignados para ${modulo}`;
    
    alert(mensaje);
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

      {/* Matriz de Permisos Simple */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Matriz de Permisos por Módulos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecciona el nivel de acceso para cada módulo
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Módulo</th>
                  {NIVELES.map(nivel => (
                    <th key={nivel.key} className="text-center p-3 font-medium">
                      {nivel.nombre}
                    </th>
                  ))}
                  <th className="text-center p-3 font-medium">Ver Permisos</th>
                </tr>
              </thead>
              <tbody>
                {MODULOS.map(modulo => {
                  const nivelActual = calcularNivelModulo(modulo.key);
                  
                  return (
                    <tr key={modulo.key} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        {modulo.nombre}
                      </td>
                      {NIVELES.map(nivel => (
                        <td key={nivel.key} className="text-center p-3">
                          <Button
                            variant={nivelActual === nivel.key ? "default" : "outline"}
                            size="sm"
                            onClick={() => asignarNivelModulo(modulo.key, nivel.key)}
                            disabled={!canEdit}
                            className={`w-full ${nivelActual === nivel.key ? nivel.color : ''}`}
                          >
                            {nivelActual === nivel.key ? "✓" : nivel.nombre}
                          </Button>
                        </td>
                      ))}
                      <td className="text-center p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => mostrarPermisosModulo(modulo.key)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Información de Niveles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información de Niveles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NIVELES.map(nivel => (
              <div key={nivel.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={nivel.color}>
                    {nivel.nombre}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {nivel.key === 'none' && "El módulo no será visible para el usuario"}
                  {nivel.key === 'view' && "Puede consultar información sin modificarla"}
                  {nivel.key === 'edit' && "Puede crear, editar y ver registros"}
                  {nivel.key === 'admin' && "Acceso completo: ver, crear, editar, eliminar"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


