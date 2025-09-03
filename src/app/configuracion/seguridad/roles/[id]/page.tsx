"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCan } from "@/lib/permissions";
import { rbacFetch } from "@/lib/rbacClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye, X } from "lucide-react";
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
  'configuracion': ['configuracion', 'config'],
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
  const [permisosOriginales, setPermisosOriginales] = useState<Set<string>>(new Set());
  const [permisosDisponibles, setPermisosDisponibles] = useState<Permiso[]>([]);
  const [cambiosPendientes, setCambiosPendientes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
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
        setLoadingData(true);
        setError(null);

        // Cargar rol
        const rolRes = await rbacFetch(`/api/admin/rbac/roles/${rolId}`, { cache: 'no-store' });
        const rolData = await rolRes.json();
        if (!rolRes.ok) throw new Error(rolData?.detail || rolData?.error || `HTTP ${rolRes.status}`);
        if (!done) setRol(rolData.item ?? rolData);

        // Cargar permisos disponibles
        const permisosRes = await rbacFetch("/api/admin/rbac/permisos", { cache: 'no-store' });
        const permisosData = await permisosRes.json();
        if (!permisosRes.ok) throw new Error(permisosData?.detail || permisosData?.error || `HTTP ${permisosRes.status}`);
        if (!done) setPermisosDisponibles(permisosData.items || []);

        // Cargar permisos asignados
        const asignadosRes = await rbacFetch(`/api/admin/rbac/roles/${rolId}/permisos`, { cache: 'no-store' });
        const asignadosData = await asignadosRes.json();
        if (!asignadosRes.ok) throw new Error(asignadosData?.detail || asignadosData?.error || `HTTP ${asignadosRes.status}`);
        if (!done) {
          const asignadosSet = new Set(asignadosData.items?.map((p: any) => p.id) || []);
          setPermisosAsignados(asignadosSet as Set<string>);
          setPermisosOriginales(asignadosSet as Set<string>);
        }

      } catch (e: any) {
        if (!done) setError(e?.message || "Error inesperado");
      } finally {
        if (!done) setLoadingData(false);
      }
    })();
    return () => { done = true; };
  }, [hasAccess, loading, rolId]);

  // Detectar cambios automáticamente
  useEffect(() => {
    const hayCambios = Object.keys(cambiosPendientes).length > 0;
    console.log('Cambios pendientes detectados:', cambiosPendientes, 'Hay cambios:', hayCambios);
    setHasChanges(hayCambios);
  }, [cambiosPendientes]);

  // Debug: Log del estado de permisos
  useEffect(() => {
    console.log('🔍 Estado actual de permisos:', {
      asignados: permisosAsignados.size,
      originales: permisosOriginales.size,
      ids: Array.from(permisosAsignados).slice(0, 5), // Primeros 5 para no saturar
      cambiosPendientes: Object.keys(cambiosPendientes).length,
      hasChanges
    });
  }, [permisosAsignados, permisosOriginales, cambiosPendientes, hasChanges]);

  // Función para obtener el ID de un permiso por clave
  const getPermisoId = (clave: string) => {
    return permisosDisponibles.find(p => p.clave === clave)?.id;
  };

  // Función para calcular nivel de acceso basado en permisos
  const calcularNivelModulo = (modulo: string): string => {
    // Si hay un cambio pendiente para este módulo, usar ese nivel
    if (cambiosPendientes[modulo]) {
      return cambiosPendientes[modulo];
    }
    const prefixes = MODULO_PREFIXES[modulo] || [modulo];
    const permisosClaves = Array.from(permisosAsignados).map(id => 
      permisosDisponibles.find(p => p.id === id)?.clave
    ).filter(Boolean) as string[];
    
    // Verificar wildcard (admin)
    const wildcard = prefixes.some(prefix => 
      permisosClaves.includes(`${prefix}.*`)
    );
    
    if (wildcard) return 'admin';
    
      // Verificar si tiene todos los permisos del módulo (admin)
  const todosLosPermisos = prefixes.some(prefix => {
    const permisosModulo = permisosDisponibles.filter(p => 
      p.clave.startsWith(prefix + '.') && !p.clave.endsWith('.*')
    );
    const permisosAsignadosModulo = permisosClaves.filter(c => 
      c.startsWith(prefix + '.') && !c.endsWith('.*')
    );
    return permisosModulo.length > 0 && permisosAsignadosModulo.length >= permisosModulo.length;
  });
    
    if (todosLosPermisos) return 'admin';
    
      // Verificar si tiene permisos de edición (más que solo view)
  const hasEditPermissions = prefixes.some(prefix => {
    const permisosAsignadosModulo = permisosClaves.filter(c => c.startsWith(prefix + '.'));
    const permisosModulo = permisosDisponibles.filter(p => 
      p.clave.startsWith(prefix + '.') && !p.clave.endsWith('.*')
    );
    
    // Si tiene más de la mitad de los permisos del módulo, es edit
    if (permisosModulo.length > 0 && permisosAsignadosModulo.length > permisosModulo.length / 2) {
      return true;
    }
    
    // O si tiene permisos estándar de edición
    const hasView = permisosClaves.includes(`${prefix}.view`);
    const hasCreate = permisosClaves.includes(`${prefix}.create`);
    const hasEdit = permisosClaves.includes(`${prefix}.edit`);
    if (hasView && (hasCreate || hasEdit)) {
      return true;
    }
    
    // O si tiene múltiples permisos (más de 1) del módulo, es edit
    if (permisosAsignadosModulo.length > 1) {
      return true;
    }
    
    // O si tiene múltiples permisos en total (incluyendo relacionados), es edit
    if (permisosClaves.length > 1) {
      return true;
    }
    
    return false;
  });
    
    if (hasEditPermissions) return 'edit';
    
      // Verificar view (solo view o pocos permisos)
  const hasView = prefixes.some(prefix => 
    permisosClaves.includes(`${prefix}.view`)
  );
  
  if (hasView) return 'view';
  
  // Si no tiene view específico pero tiene algún permiso del módulo, es view
  const hasAnyPermission = prefixes.some(prefix => {
    const permisosAsignadosModulo = permisosClaves.filter(c => c.startsWith(prefix + '.'));
    return permisosAsignadosModulo.length > 0;
  });
  
  if (hasAnyPermission) return 'view';
  
  return 'none';
  };

  // Función para obtener permisos que se asignarán para un nivel
  const obtenerPermisosParaNivel = (modulo: string, nivel: string): string[] => {
    const prefixes = MODULO_PREFIXES[modulo] || [modulo];
    const permisos: string[] = [];
    
    switch (nivel) {
      case 'admin':
        prefixes.forEach(prefix => {
          // Primero intentar wildcard
          const wildcardId = getPermisoId(`${prefix}.*`);
          if (wildcardId) {
            permisos.push(wildcardId);
          } else {
            // Si no hay wildcard, asignar todos los permisos del módulo
            permisosDisponibles.forEach(p => {
              if (p.clave.startsWith(prefix + '.') && !p.clave.endsWith('.*')) {
                permisos.push(p.id);
              }
            });
          }
        });
        break;
      case 'edit':
        prefixes.forEach(prefix => {
          // Intentar asignar permisos estándar si existen
          const permisosEstandar = ['view', 'create', 'edit'];
          const permisosEncontrados = permisosEstandar.map(action => getPermisoId(`${prefix}.${action}`)).filter((id): id is string => id !== undefined);
          
          if (permisosEncontrados.length > 0) {
            permisos.push(...permisosEncontrados);
          } else {
            // Si no existen permisos estándar, asignar solo algunos permisos (no todos)
            const permisosModulo = permisosDisponibles.filter(p => 
              p.clave.startsWith(prefix + '.') && 
              !p.clave.endsWith('delete') && 
              !p.clave.endsWith('.*')
            );
            
            if (permisosModulo.length > 0) {
              // Para evitar que se detecte como "admin", asignar solo algunos permisos
              // Tomar aproximadamente la mitad de los permisos disponibles
              const mitad = Math.ceil(permisosModulo.length / 2);
              const permisosSeleccionados = permisosModulo.slice(0, mitad);
              permisosSeleccionados.forEach(p => permisos.push(p.id));
            }
            
            // Si el módulo tiene pocos permisos, agregar permisos relacionados para que se detecte como "edit"
            if (permisosModulo.length <= 2) {
              // Para central-monitoring, agregar permisos de alertas
              if (prefix === 'central_monitoring' || prefix === 'central-monitoring') {
                const permisosAlertas = permisosDisponibles.filter(p => 
                  p.clave.startsWith('alertas.') && 
                  !p.clave.endsWith('delete') && 
                  !p.clave.endsWith('.*')
                );
                if (permisosAlertas.length > 0) {
                  const mitadAlertas = Math.ceil(permisosAlertas.length / 2);
                  const alertasSeleccionados = permisosAlertas.slice(0, mitadAlertas);
                  alertasSeleccionados.forEach(p => permisos.push(p.id));
                }
              }
              
              // Para auditoria, agregar permisos de logs
              if (prefix === 'auditoria') {
                const permisosLogs = permisosDisponibles.filter(p => 
                  p.clave.startsWith('logs.') && 
                  !p.clave.endsWith('delete') && 
                  !p.clave.endsWith('.*')
                );
                if (permisosLogs.length > 0) {
                  const mitadLogs = Math.ceil(permisosLogs.length / 2);
                  const logsSeleccionados = permisosLogs.slice(0, mitadLogs);
                  logsSeleccionados.forEach(p => permisos.push(p.id));
                }
              }
            }
          }
        });
        break;
      case 'view':
        prefixes.forEach(prefix => {
          // Intentar asignar view si existe
          const permisoView = getPermisoId(`${prefix}.view`);
          if (permisoView) {
            permisos.push(permisoView);
          } else {
            // Si no existe view, asignar el primer permiso disponible del módulo
            const primerPermiso = permisosDisponibles.find(p => 
              p.clave.startsWith(prefix + '.') && 
              !p.clave.endsWith('.*')
            );
            if (primerPermiso) {
              permisos.push(primerPermiso.id);
            }
          }
        });
        break;
      case 'none':
      default:
        break;
    }
    
    return permisos;
  };

  // Función para asignar nivel a un módulo (solo marca cambio pendiente)
  const asignarNivelModulo = (modulo: string, nivel: string) => {
    if (!canEdit || busy) return;
    
    // Solo marcar el cambio pendiente, no modificar permisos aún
    setCambiosPendientes(prev => ({
      ...prev,
      [modulo]: nivel
    }));
  };

  // Función para asignar todo a un nivel (todos los módulos) - solo marca cambios pendientes
  const asignarTodoNivel = (nivel: string) => {
    if (!canEdit || busy) return;

    // Marcar todos los módulos con el nivel seleccionado
    const nuevosCambios: Record<string, string> = {};
    MODULOS.forEach((modulo) => {
      nuevosCambios[modulo.key] = nivel;
    });

    setCambiosPendientes(nuevosCambios);
  };

  // Función para guardar cambios
  const guardarCambios = async () => {
    if (!canEdit || !rolId) return;

    try {
      setBusy(true);
      setError(null);

      // Aplicar todos los cambios pendientes a los permisos
      let nuevosPermisos = new Set(permisosAsignados);
      
      Object.entries(cambiosPendientes).forEach(([modulo, nivel]) => {
        // Remover permisos existentes del módulo
        const prefixes = MODULO_PREFIXES[modulo] || [modulo];
        prefixes.forEach(prefix => {
          permisosDisponibles.forEach(p => {
            if (p.clave.startsWith(prefix + '.')) {
              nuevosPermisos.delete(p.id);
            }
          });
        });

        // Agregar nuevos permisos para el nivel
        const permisosIds = obtenerPermisosParaNivel(modulo, nivel);
        permisosIds.forEach(id => nuevosPermisos.add(id));
      });

      const permisosArray = Array.from(nuevosPermisos);
      console.log('Enviando permisos al servidor:', permisosArray.length, 'permisos');
      console.log('Cambios pendientes aplicados:', cambiosPendientes);
      
      const res = await rbacFetch(`/api/admin/rbac/roles/${rolId}/permisos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permisos: permisosArray })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);

      // Actualizar el estado local con los nuevos permisos
      setPermisosAsignados(nuevosPermisos);
      setPermisosOriginales(nuevosPermisos);
      setCambiosPendientes({});
      setHasChanges(false);

      // 🔄 RECARGAR PERMISOS CORRECTAMENTE DESDE EL BACKEND
      console.log('🔄 Recargando permisos desde el servidor...');
      setTimeout(async () => {
        try {
          const asignadosRes = await rbacFetch(`/api/admin/rbac/roles/${rolId}/permisos`, { 
            cache: 'no-store',
            headers: { 
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          const asignadosData = await asignadosRes.json();
          
          if (asignadosRes.ok) {
            // Crear nuevo Set para forzar re-render
            const nuevosPermisos = new Set<string>();
            (asignadosData.items || []).forEach((p: any) => {
              if (p.id) nuevosPermisos.add(p.id);
            });
            
            console.log('📊 Permisos recibidos del servidor:', asignadosData.items?.length || 0);
            console.log('🔑 IDs de permisos:', Array.from(nuevosPermisos));
            
            // Forzar actualización completa del estado
            setPermisosAsignados(nuevosPermisos);
            setPermisosOriginales(nuevosPermisos);
            setCambiosPendientes({}); // Limpiar cambios pendientes
            
            console.log('✅ Estado actualizado. Permisos asignados:', nuevosPermisos.size, 'permisos');
          } else {
            console.error('❌ Error al recargar permisos:', asignadosData);
          }
        } catch (e) {
          console.error('❌ Error al recargar permisos:', e);
        }
      }, 500); // Pequeño delay para asegurar que el backend procesó los cambios

      addToast({
        title: "✅ Permisos actualizados",
        description: `Los permisos del rol "${rol?.nombre}" han sido actualizados exitosamente.`,
        type: "success"
      });

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

  if (loading || loadingData) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          Cargando datos del rol...
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
            <h1 className="text-2xl font-bold">
              Permisos del Rol: {rol?.nombre || 'Cargando...'}
            </h1>
            <p className="text-muted-foreground">
              {rol?.descripcion || 'Descripción del rol'}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                  ⚠️ Cambios pendientes
                </Badge>
              )}
              <Button
                onClick={guardarCambios}
                disabled={!hasChanges || busy}
                className={`flex items-center gap-2 ${hasChanges ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <Save className="h-4 w-4" />
                {busy ? "Guardando..." : "Guardar Cambios"}
              </Button>
              {hasChanges && !busy && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCambiosPendientes({});
                    setHasChanges(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              )}
            </div>
            {hasChanges && (
              <p className="text-sm text-muted-foreground">
                💡 Los cambios se guardarán solo cuando hagas clic en "Guardar Cambios"
              </p>
            )}
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
            {canEdit && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => asignarTodoNivel('none')}>🚫 Todo Sin Acceso</Button>
                <Button variant="outline" size="sm" onClick={() => asignarTodoNivel('view')}>👁️ Todo Ver</Button>
                <Button variant="outline" size="sm" onClick={() => asignarTodoNivel('edit')}>✏️ Todo Editar</Button>
                <Button variant="outline" size="sm" onClick={() => asignarTodoNivel('admin')}>⚙️ Todo Admin</Button>
              </div>
            )}
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


