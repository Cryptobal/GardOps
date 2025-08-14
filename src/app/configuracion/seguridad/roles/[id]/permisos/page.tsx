"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCan } from "@/lib/permissions";
import { rbacFetch } from "@/lib/rbacClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye, Edit, Settings, X, ChevronDown, ChevronRight, Users } from "lucide-react";
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

// Definición de módulos con sus permisos por nivel
const MODULOS_NIVELES = {
  "clientes": {
    icon: "🏢",
    nombre: "Clientes",
    permisos: {
      "none": [],
      "view": ["clientes.view"],
      "edit": ["clientes.view", "clientes.create", "clientes.edit"],
      "admin": ["clientes.*"]
    }
  },
  "instalaciones": {
    icon: "🏭",
    nombre: "Instalaciones",
    permisos: {
      "none": [],
      "view": ["instalaciones.view"],
      "edit": ["instalaciones.view", "instalaciones.create", "instalaciones.edit"],
      "admin": ["instalaciones.*"]
    }
  },
  "guardias": {
    icon: "👮",
    nombre: "Guardias",
    permisos: {
      "none": [],
      "view": ["guardias.view"],
      "edit": ["guardias.view", "guardias.create", "guardias.edit"],
      "admin": ["guardias.*"]
    }
  },
  "pauta-diaria": {
    icon: "📅",
    nombre: "Pauta Diaria",
    permisos: {
      "none": [],
      "view": ["pauta-diaria.view"],
      "edit": ["pauta-diaria.view", "pauta-diaria.edit"],
      "admin": ["pauta-diaria.*"]
    }
  },
  "pauta-mensual": {
    icon: "📊",
    nombre: "Pauta Mensual",
    permisos: {
      "none": [],
      "view": ["pauta-mensual.view"],
      "edit": ["pauta-mensual.view", "pauta-mensual.create", "pauta-mensual.edit"],
      "admin": ["pauta-mensual.*"]
    }
  },
  "documentos": {
    icon: "📄",
    nombre: "Documentos",
    permisos: {
      "none": [],
      "view": ["documentos.view"],
      "edit": ["documentos.view", "documentos.upload", "documentos.edit"],
      "admin": ["documentos.*"]
    }
  },
  "reportes": {
    icon: "📈",
    nombre: "Reportes",
    permisos: {
      "none": [],
      "view": ["reportes.asistencia", "reportes.turnos"],
      "edit": ["reportes.asistencia", "reportes.turnos", "reportes.payroll"],
      "admin": ["reportes.*"]
    }
  },
  "payroll": {
    icon: "💰",
    nombre: "Payroll",
    permisos: {
      "none": [],
      "view": ["payroll.view"],
      "edit": ["payroll.view", "payroll.edit"],
      "admin": ["payroll.*"]
    }
  },
  "configuracion": {
    icon: "⚙️",
    nombre: "Configuración",
    permisos: {
      "none": [],
      "view": ["config.manage"],
      "edit": ["config.manage"],
      "admin": ["config.manage", "rbac.permisos.read", "rbac.roles.read"]
    }
  }
};

type NivelAcceso = "none" | "view" | "edit" | "admin";

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
  const [nivelesModulos, setNivelesModulos] = useState<Record<string, NivelAcceso>>({});
  const [modulosExpandidos, setModulosExpandidos] = useState<Set<string>>(new Set());
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
          // La API retorna { items: [{ id, clave, descripcion }] }
          // Compatibilidad con formato antiguo { permisos: [{ permiso_id }] }
          const asignadosIds: string[] = Array.isArray(asignadosData.items)
            ? asignadosData.items
                .map((p: any) => p?.id)
                .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
            : Array.isArray(asignadosData.permisos)
            ? asignadosData.permisos
                .map((p: any) => p?.permiso_id)
                .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
            : [];

          const asignadosSet = new Set<string>(asignadosIds);
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

  // Calcular niveles cuando ambos arrays estén cargados
  useEffect(() => {
    if (permisosDisponibles.length > 0) {
      const niveles = calcularNivelesDesdePermisos(permisosAsignados);
      setNivelesModulos(niveles);
    }
  }, [permisosDisponibles, permisosAsignados]);

  // Función para obtener el ID de un permiso por clave
  const getPermisoId = (clave: string) => {
    return permisosDisponibles.find(p => p.clave === clave)?.id;
  };

  // Función para calcular niveles desde permisos asignados
  const calcularNivelesDesdePermisos = (permisosSet: Set<string>): Record<string, NivelAcceso> => {
    const niveles: Record<string, NivelAcceso> = {};
    
    Object.entries(MODULOS_NIVELES).forEach(([modulo, config]) => {
      // Obtener todos los permisos del módulo que tiene asignados
      const permisosModulo = Array.from(permisosSet).filter(id => {
        const permiso = permisosDisponibles.find(p => p.id === id);
        return permiso && permiso.clave.startsWith(modulo);
      });
      
      // Verificar si tiene el permiso wildcard (admin)
      const permisoWildcard = permisosDisponibles.find(p => p.clave === `${modulo}.*`);
      if (permisoWildcard && permisosSet.has(permisoWildcard.id)) {
        niveles[modulo] = "admin";
        return;
      }
      
      // Verificar si tiene permisos de admin específicos
      const permisosAdmin = config.permisos.admin.map(clave => getPermisoId(clave)).filter((id): id is string => Boolean(id));
      if (permisosAdmin.some(id => permisosSet.has(id))) {
        niveles[modulo] = "admin";
        return;
      }
      
      // Verificar si tiene permisos de edit (excluyendo los de view para no
      // clasificar como "edit" cuando solo tiene permisos de lectura)
      const viewIds = config.permisos.view
        .map(clave => getPermisoId(clave))
        .filter((id): id is string => Boolean(id));
      const editIds = config.permisos.edit
        .map(clave => getPermisoId(clave))
        .filter((id): id is string => Boolean(id));
      const editOnlyIds = editIds.filter(id => !viewIds.includes(id));
      if (editOnlyIds.some(id => permisosSet.has(id))) {
        niveles[modulo] = "edit";
        return;
      }
      
      // Verificar si tiene permisos de view
      if (viewIds.some(id => permisosSet.has(id))) {
        niveles[modulo] = "view";
        return;
      }
      
      // Si tiene algún permiso del módulo pero no coincide con los niveles definidos, asignar el más alto
      if (permisosModulo.length > 0) {
        // Determinar el nivel más alto basado en los permisos que tiene
        const tieneCreate = permisosModulo.some(id => {
          const permiso = permisosDisponibles.find(p => p.id === id);
          return permiso && permiso.clave.includes('.create');
        });
        const tieneEdit = permisosModulo.some(id => {
          const permiso = permisosDisponibles.find(p => p.id === id);
          return permiso && permiso.clave.includes('.edit');
        });
        const tieneDelete = permisosModulo.some(id => {
          const permiso = permisosDisponibles.find(p => p.id === id);
          return permiso && permiso.clave.includes('.delete');
        });
        
        if (tieneCreate || tieneEdit || tieneDelete) {
          niveles[modulo] = "admin";
        } else {
          niveles[modulo] = "view";
        }
        return;
      }
      
      // Por defecto, sin acceso
      niveles[modulo] = "none";
    });
    
    return niveles;
  };

  // Función para cambiar nivel de un módulo
  const cambiarNivelModulo = (modulo: string, nivel: NivelAcceso) => {
    if (!canEdit) return;
    
    setNivelesModulos(prev => ({
      ...prev,
      [modulo]: nivel
    }));
    setHasChanges(true);
  };

  // Función para expandir/contraer módulo
  const toggleModulo = (modulo: string) => {
    setModulosExpandidos(prev => {
      const newSet = new Set<string>(prev);
      if (newSet.has(modulo)) {
        newSet.delete(modulo);
      } else {
        newSet.add(modulo);
      }
      return newSet;
    });
  };

  // Función para expandir todos los módulos
  const expandirTodos = () => {
    setModulosExpandidos(new Set<string>(Object.keys(MODULOS_NIVELES)));
  };

  // Función para contraer todos los módulos
  const contraerTodos = () => {
    setModulosExpandidos(new Set<string>());
  };

  // Función para calcular permisos totales basados en niveles
  const calcularPermisosDesdeNiveles = (niveles: Record<string, NivelAcceso>): string[] => {
    const permisosTotales: string[] = [];
    Object.entries(niveles).forEach(([modulo, nivel]) => {
      const config = MODULOS_NIVELES[modulo as keyof typeof MODULOS_NIVELES];
      if (!config || nivel === "none") return;
      const permisosNivel = config.permisos[nivel];
      permisosNivel.forEach(clave => {
        const permisoId = getPermisoId(clave);
        if (permisoId) permisosTotales.push(permisoId);
      });
    });
    return permisosTotales;
  };

  // Conserva API actual para quienes ya la usan
  const calcularPermisosTotales = (): string[] => calcularPermisosDesdeNiveles(nivelesModulos);

  // Función para arreglar permisos del rol admin
  const fixAdminPermissions = async () => {
    try {
      setBusy(true);
      
      const response = await fetch('/api/admin/rbac/fix-admin-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.detail || 'Error al arreglar permisos');
      }

      console.log('🔧 PERMISOS ARREGLADOS:', data);
      
      addToast({
        title: "✅ Éxito",
        description: `Permisos arreglados: ${data.totalPermisos} permisos asignados`,
        type: "success"
      });

      // Refrescar la página después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error:', error);
      addToast({
        title: "❌ Error",
        description: error.message || "Error al arreglar permisos",
        type: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  // Función para asignar rol de admin
  const assignAdminRole = async () => {
    try {
      setBusy(true);
      
      const response = await fetch('/api/admin/rbac/assign-admin-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.detail || 'Error al asignar rol de admin');
      }

      console.log('👑 ROL ADMIN ASIGNADO:', data);
      
      addToast({
        title: "✅ Éxito",
        description: "Rol de admin asignado exitosamente. Refresca la página.",
        type: "success"
      });

      // Refrescar la página después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error:', error);
      addToast({
        title: "❌ Error",
        description: error.message || "Error al asignar rol de admin",
        type: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  // Hacer admin total este rol (asigna admin a todos los módulos y guarda)
  const hacerAdminTotal = async () => {
    if (!canEdit || !rolId) return;
    try {
      setBusy(true);
      const nivelesAdmin: Record<string, NivelAcceso> = {};
      Object.keys(MODULOS_NIVELES).forEach((m) => { nivelesAdmin[m] = "admin"; });
      const permisosArray = calcularPermisosDesdeNiveles(nivelesAdmin);

      const res = await rbacFetch(`/api/admin/rbac/roles/${rolId}/permisos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permisos: permisosArray })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);

      setNivelesModulos(nivelesAdmin);
      setHasChanges(false);
      addToast({ title: "✅ Rol actualizado", description: "Ahora este rol es administrador total en todos los módulos", type: "success" });
    } catch (e: any) {
      addToast({ title: "❌ Error", description: e?.message || "No se pudo convertir el rol en admin total", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  // Función para debuggear permisos (público)
  const debugPermissionsPublic = async () => {
    try {
      setBusy(true);
      
      const response = await fetch('/api/admin/rbac/debug-permissions-public');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.detail || 'Error al debuggear permisos');
      }

      console.log('🔍 DEBUG PÚBLICO:', data);
      
      // Mostrar en un alert para facilitar la visualización
      const debugInfo = `
🔍 DEBUG PÚBLICO

Roles Admin encontrados: ${data.rolesAdmin.length}
Total permisos en sistema: ${data.totalPermisos}

Permisos por módulo:
${Object.entries(data.permisosPorModulo).map(([modulo, permisos]: [string, any]) => 
  `${modulo}: ${permisos.length} permisos`
).join('\n')}

Roles con permisos:
${data.rolesAdmin.map((r: any) => 
  `${r.rol.nombre}: ${r.permisos.length} permisos`
).join('\n')}

Usuario actual:
${data.usuariosConRoles.map((u: any) => 
  `${u.email} - Rol: ${u.rol_nombre || 'Sin rol'} - Permisos: ${u.total_permisos}`
).join('\n')}
      `;
      
      alert(debugInfo);
      
    } catch (error: any) {
      console.error('Error:', error);
      addToast({
        title: "❌ Error",
        description: error.message || "Error al debuggear permisos",
        type: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  // Función para debuggear permisos
  const debugPermissions = async () => {
    try {
      setBusy(true);
      
      const response = await rbacFetch('/api/admin/rbac/debug-permissions');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.detail || 'Error al debuggear permisos');
      }

      console.log('🔍 DEBUG PERMISOS:', data);
      
      // Mostrar en un alert para facilitar la visualización
      const debugInfo = `
🔍 DEBUG PERMISOS

Roles Admin encontrados: ${data.rolesAdmin.length}
Total permisos en sistema: ${data.totalPermisos}

Permisos por módulo:
${Object.entries(data.permisosPorModulo).map(([modulo, permisos]: [string, any]) => 
  `${modulo}: ${permisos.length} permisos`
).join('\n')}

Roles con permisos:
${data.rolesAdmin.map((r: any) => 
  `${r.rol.nombre}: ${r.permisos.length} permisos`
).join('\n')}
      `;
      
      alert(debugInfo);
      
    } catch (error: any) {
      console.error('Error:', error);
      addToast({
        title: "❌ Error",
        description: error.message || "Error al debuggear permisos",
        type: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  // Función para guardar cambios
  const guardarCambios = async () => {
    if (!canEdit || !rolId) return;

    try {
      setBusy(true);
      setError(null);

      const permisosArray = calcularPermisosTotales();
      
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
            <div className="flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-semibold text-blue-600">
                {rol?.nombre}
              </p>
              {rol?.descripcion && (
                <span className="text-muted-foreground">- {rol.descripcion}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botones temporales removidos */}
        {canEdit && (
            <>
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
            </>
          )}
          </div>
      </div>

      {/* Controles de Expansión */}
      <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
            <CardTitle className="text-lg">🎯 Niveles de Acceso por Módulo</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                onClick={expandirTodos}
                      className="flex items-center gap-1"
                    >
                <ChevronDown className="h-3 w-3" />
                Expandir Todo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                onClick={contraerTodos}
                      className="flex items-center gap-1"
                    >
                <ChevronRight className="h-3 w-3" />
                Contraer Todo
                    </Button>
                  </div>
              </div>
          <p className="text-sm text-muted-foreground">
            Selecciona el nivel de acceso para cada módulo. Los cambios se aplicarán al guardar.
          </p>
            </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(MODULOS_NIVELES).map(([modulo, config]) => {
              const isExpanded = modulosExpandidos.has(modulo);
              const nivelActual = nivelesModulos[modulo] || "none";
              
              return (
                <div key={modulo} className="border rounded-lg overflow-hidden">
                  {/* Header del módulo */}
                  <div 
                    className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleModulo(modulo)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{config.icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg">{config.nombre}</h3>
                        <p className="text-sm text-muted-foreground">
                          Nivel actual: <span className="font-medium text-blue-600">{nivelActual}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  
                  {/* Contenido expandible */}
                  {isExpanded && (
                    <div className="p-4 border-t">
                                             <RadioGroup
                         value={nivelActual}
                         onValueChange={(value: string) => canEdit && cambiarNivelModulo(modulo, value as NivelAcceso)}
                         className="grid grid-cols-2 md:grid-cols-4 gap-3"
                       >
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="none" id={`${modulo}-none`} />
                          <label htmlFor={`${modulo}-none`} className="flex items-center gap-2 cursor-pointer">
                            <X className="h-4 w-4 text-red-500" />
                            <div>
                              <div className="font-medium">Sin acceso</div>
                              <div className="text-xs text-muted-foreground">No puede ver ni hacer nada</div>
                            </div>
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="view" id={`${modulo}-view`} />
                          <label htmlFor={`${modulo}-view`} className="flex items-center gap-2 cursor-pointer">
                            <Eye className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="font-medium">Solo ver</div>
                              <div className="text-xs text-muted-foreground">Consultar información</div>
                            </div>
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="edit" id={`${modulo}-edit`} />
                          <label htmlFor={`${modulo}-edit`} className="flex items-center gap-2 cursor-pointer">
                            <Edit className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="font-medium">Editar</div>
                              <div className="text-xs text-muted-foreground">Ver + Crear + Editar</div>
                            </div>
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="admin" id={`${modulo}-admin`} />
                          <label htmlFor={`${modulo}-admin`} className="flex items-center gap-2 cursor-pointer">
                            <Settings className="h-4 w-4 text-purple-500" />
                            <div>
                              <div className="font-medium">Administrar</div>
                              <div className="text-xs text-muted-foreground">Acceso completo</div>
                            </div>
                          </label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              );
            })}
              </div>
            </CardContent>
          </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ℹ️ Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Sin acceso:</strong> No puede ver ni hacer nada en el módulo</p>
          <p>• <strong>Solo ver:</strong> Puede consultar información sin modificarla</p>
          <p>• <strong>Editar:</strong> Puede ver, crear y modificar registros</p>
          <p>• <strong>Administrar:</strong> Acceso completo incluyendo eliminación</p>
          <p>• Los permisos se aplican de forma acumulativa</p>
        </CardContent>
      </Card>
    </div>
  );
}
