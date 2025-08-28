import { Authorize, GuardButton, can } from '@/lib/authz-ui'
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

// Mapa de prefijos canónicos en BD por módulo de UI
const MODULO_PREFIXES: Record<string, string[]> = {
  "inicio": ["home"],
  "clientes": ["clientes"],
  "instalaciones": ["instalaciones"],
  "guardias": ["guardias"],
  "pauta-diaria": ["pauta_diaria", "pauta-diaria"],
  "pauta-mensual": ["pauta_mensual", "pauta-mensual"],
  "turnos-extras": ["turnos_extras", "turnos-extras"],
  "payroll": ["payroll"],
  "ppc": ["ppc"],
  "documentos": ["documentos"],
  "alertas-kpi": ["alertas", "kpi"],
  "asignaciones": ["asignaciones"],
  "configuracion": ["config", "configuracion"],
  "usuarios": ["usuarios"],
  "roles": ["roles", "rbac.roles"],
  "permisos": ["permisos", "rbac.permisos"],
  "tenants": ["tenants", "rbac.tenants"],
  "estructuras": ["estructuras"],
  "sueldos": ["sueldos"],
  "planillas": ["planillas"],
  "logs": ["logs"],
  "central-monitoring": ["central_monitoring", "central-monitoring"]
};

// Definición de módulos con sus permisos por nivel (usa prefijos canónicos)
const MODULOS_NIVELES = {
  "inicio": {
    icon: "🏠",
    nombre: "Inicio",
    permisos: {
      "none": [],
      "view": ["home.view"],
      "edit": ["home.view", "home.create", "home.edit", "home.delete"],
      "admin": ["home.*"]
    }
  },
  "clientes": {
    icon: "🏢",
    nombre: "Clientes",
    permisos: {
      "none": [],
      "view": ["clientes.view"],
      "edit": ["clientes.view", "clientes.create", "clientes.edit", "clientes.delete"],
      "admin": ["clientes.*"]
    }
  },
  "instalaciones": {
    icon: "🏭",
    nombre: "Instalaciones",
    permisos: {
      "none": [],
      "view": ["instalaciones.view"],
      "edit": ["instalaciones.view", "instalaciones.create", "instalaciones.edit", "instalaciones.delete"],
      "admin": ["instalaciones.*"]
    }
  },
  "guardias": {
    icon: "👮",
    nombre: "Guardias",
    permisos: {
      "none": [],
      "view": ["guardias.view"],
      "edit": ["guardias.view", "guardias.create", "guardias.edit", "guardias.delete"],
      "admin": ["guardias.*"]
    }
  },
  "pauta-diaria": {
    icon: "📅",
    nombre: "Pauta Diaria",
    permisos: {
      "none": [],
      "view": ["pauta_diaria.view"],
      "edit": ["pauta_diaria.view", "pauta_diaria.create", "pauta_diaria.edit", "pauta_diaria.delete"],
      "admin": ["pauta_diaria.*"]
    }
  },
  "pauta-mensual": {
    icon: "📊",
    nombre: "Pauta Mensual",
    permisos: {
      "none": [],
      "view": ["pauta_mensual.view"],
      "edit": ["pauta_mensual.view", "pauta_mensual.create", "pauta_mensual.edit", "pauta_mensual.delete"],
      "admin": ["pauta_mensual.*"]
    }
  },
  "turnos-extras": {
    icon: "⏰",
    nombre: "Turnos Extras",
    permisos: {
      "none": [],
      "view": ["turnos_extras.view"],
      "edit": ["turnos_extras.view", "turnos_extras.create", "turnos_extras.edit", "turnos_extras.delete"],
      "admin": ["turnos_extras.*"]
    }
  },
  "ppc": {
    icon: "📋",
    nombre: "PPC",
    permisos: {
      "none": [],
      "view": ["ppc.view"],
      "edit": ["ppc.view", "ppc.create", "ppc.edit", "ppc.delete"],
      "admin": ["ppc.*"]
    }
  },
  "documentos": {
    icon: "📄",
    nombre: "Documentos",
    permisos: {
      "none": [],
      "view": ["documentos.view"],
      "edit": ["documentos.view", "documentos.upload", "documentos.edit", "documentos.delete"],
      "admin": ["documentos.*"]
    }
  },
  "alertas-kpi": {
    icon: "🚨",
    nombre: "Alertas y KPI",
    permisos: {
      "none": [],
      "view": ["alertas.view"],
      "edit": ["alertas.view", "alertas.create", "alertas.edit", "alertas.delete"],
      "admin": ["alertas.*"]
    }
  },
  "asignaciones": {
    icon: "👥",
    nombre: "Asignaciones",
    permisos: {
      "none": [],
      "view": ["asignaciones.view"],
      "edit": ["asignaciones.view", "asignaciones.create", "asignaciones.edit", "asignaciones.delete"],
      "admin": ["asignaciones.*"]
    }
  },
  "payroll": {
    icon: "💰",
    nombre: "Payroll",
    permisos: {
      "none": [],
      "view": ["payroll.view"],
      "edit": ["payroll.view", "payroll.create", "payroll.edit", "payroll.delete"],
      "admin": ["payroll.*"]
    }
  },
  "configuracion": {
    icon: "⚙️",
    nombre: "Configuración",
    permisos: {
      "none": [],
      "view": ["config.view"],
      "edit": ["config.view", "config.manage"],
      "admin": ["config.*", "rbac.permisos.read", "rbac.roles.read"]
    }
  },
  // Extras visibles en UI para cobertura total
  "usuarios": { icon: "👤", nombre: "Usuarios", permisos: { "none": [], "view": ["usuarios.view"], "edit": ["usuarios.view", "usuarios.create", "usuarios.edit", "usuarios.delete"], "admin": ["usuarios.*"] } },
  "roles": { icon: "🛡️", nombre: "Roles", permisos: { "none": [], "view": ["roles.view"], "edit": ["roles.view", "roles.create", "roles.edit", "roles.delete"], "admin": ["roles.*"] } },
  "permisos": { icon: "🔑", nombre: "Permisos", permisos: { "none": [], "view": ["permisos.view", "rbac.permisos.read"], "edit": ["permisos.view", "permisos.create", "permisos.edit", "permisos.delete"], "admin": ["permisos.*", "rbac.permisos.read"] } },
  "tenants": { icon: "🏢", nombre: "Tenants", permisos: { "none": [], "view": ["tenants.view"], "edit": ["tenants.view", "tenants.create", "tenants.edit", "tenants.delete"], "admin": ["tenants.*"] } },
  "estructuras": { icon: "📐", nombre: "Estructuras", permisos: { "none": [], "view": ["estructuras.view"], "edit": ["estructuras.view", "estructuras.create", "estructuras.edit", "estructuras.delete"], "admin": ["estructuras.*"] } },
  "sueldos": { icon: "💵", nombre: "Sueldos", permisos: { "none": [], "view": ["sueldos.view"], "edit": ["sueldos.view", "sueldos.create", "sueldos.edit", "sueldos.delete"], "admin": ["sueldos.*"] } },
  "planillas": { icon: "🧾", nombre: "Planillas", permisos: { "none": [], "view": ["planillas.view"], "edit": ["planillas.view", "planillas.create", "planillas.edit", "planillas.delete"], "admin": ["planillas.*"] } },
  "logs": { icon: "📜", nombre: "Logs", permisos: { "none": [], "view": ["logs.view"], "edit": ["logs.view", "logs.create", "logs.edit", "logs.delete"], "admin": ["logs.*"] } },
  "central-monitoring": { icon: "📞", nombre: "Central de Monitoreo", permisos: { "none": [], "view": ["central_monitoring.view"], "edit": ["central_monitoring.view", "central_monitoring.record", "central_monitoring.export"], "admin": ["central_monitoring.*"] } }
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
  const [detallesVisibles, setDetallesVisibles] = useState<Set<string>>(new Set());
  const [previewVisibles, setPreviewVisibles] = useState<Set<string>>(new Set());
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
        console.log('🔍 Rol cargado:', rolData);
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
      const prefixes = MODULO_PREFIXES[modulo] || [modulo];
      // Obtener todos los permisos del módulo que tiene asignados
      const permisosModulo = Array.from(permisosSet).filter(id => {
        const permiso = permisosDisponibles.find(p => p.id === id);
        return (
          !!permiso && prefixes.some(px => permiso.clave.startsWith(px + '.'))
        );
      });
      

      
      // Verificar si tiene el permiso wildcard (admin)
      const wildcard = permisosDisponibles.find(p =>
        prefixes.some(px => p.clave === `${px}.*`)
      );
      if (wildcard && permisosSet.has(wildcard.id)) {
        niveles[modulo] = "admin";

        return;
      }
      
      // Evaluación por presencia de acciones
      const viewIds = config.permisos.view.map(getPermisoId).filter((id): id is string => Boolean(id));
      const createIds = prefixes.flatMap(px => permisosDisponibles.filter(p => p.clave === `${px}.create`).map(p => p.id));
      const editIds = prefixes.flatMap(px => permisosDisponibles.filter(p => p.clave === `${px}.edit`).map(p => p.id));
      const deleteIds = prefixes.flatMap(px => permisosDisponibles.filter(p => p.clave === `${px}.delete`).map(p => p.id));

      const hasCreate = createIds.some(id => permisosSet.has(id));
      const hasEdit = editIds.some(id => permisosSet.has(id));
      const hasDelete = deleteIds.some(id => permisosSet.has(id));
      const hasView = viewIds.some(id => permisosSet.has(id));



      // Lógica mejorada: si tiene todos los permisos del módulo, es admin
      const todosPermisosModulo = permisosDisponibles.filter(p => 
        prefixes.some(px => p.clave.startsWith(px + '.'))
      );
      const tieneTodosPermisos = todosPermisosModulo.length > 0 && 
        todosPermisosModulo.every(p => permisosSet.has(p.id));

      if (tieneTodosPermisos) {
        niveles[modulo] = "admin";

        return;
      }

      if (hasDelete || (hasCreate && hasEdit)) {
        niveles[modulo] = "admin";

        return;
      }
      if (hasCreate || hasEdit) {
        niveles[modulo] = "edit";

        return;
      }
      if (hasView) {
        niveles[modulo] = "view";

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

  // Función para asignar todos los módulos a un nivel específico
  const asignarTodosNivel = (nivel: NivelAcceso) => {
    if (!canEdit) return;
    
    const nuevosNiveles: Record<string, NivelAcceso> = {};
    Object.keys(MODULOS_NIVELES).forEach(modulo => {
      nuevosNiveles[modulo] = nivel;
    });
    
    setNivelesModulos(nuevosNiveles);
    setHasChanges(true);
    
    // Mostrar toast de confirmación
    const nivelNombres = {
      "none": "Sin Acceso",
      "view": "Solo Ver", 
      "edit": "Editar",
      "admin": "Administrar"
    };
    
    addToast({
      title: "✅ Niveles actualizados",
      description: `Todos los módulos han sido asignados a "${nivelNombres[nivel]}"`,
      type: "success"
    });
  };

  // Mostrar/ocultar detalle de permisos crudos por módulo
  const toggleDetalle = (modulo: string) => {
    setDetallesVisibles(prev => {
      const ns = new Set<string>(prev);
      if (ns.has(modulo)) ns.delete(modulo); else ns.add(modulo);
      return ns;
    });
  };

  // Mostrar/ocultar preview de permisos que se asignarán
  const togglePreview = (modulo: string) => {
    setPreviewVisibles(prev => {
      const ns = new Set<string>(prev);
      if (ns.has(modulo)) ns.delete(modulo); else ns.add(modulo);
      return ns;
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

  // Función para calcular permisos que se asignarán para un nivel específico
  const calcularPermisosParaNivel = (modulo: string, nivel: NivelAcceso): string[] => {
    const permisosIds: string[] = [];
    const config = MODULOS_NIVELES[modulo as keyof typeof MODULOS_NIVELES];
    if (!config || nivel === "none") return permisosIds;
    
    const prefixes = MODULO_PREFIXES[modulo] || [modulo];

    

    if (nivel === 'admin') {
      // Si hay wildcard, úsalo. Si no, incluir TODOS los permisos del módulo disponibles en BD
      let pushedWildcard = false;
      for (const px of prefixes) {
        const wildcardId = getPermisoId(`${px}.*`);
        if (wildcardId) {
          permisosIds.push(wildcardId);
          pushedWildcard = true;

        }
      }
      if (!pushedWildcard) {
        const permisosModulo = permisosDisponibles
          .filter(p => prefixes.some(px => p.clave.startsWith(px + '.')));
        
        permisosModulo.forEach(p => permisosIds.push(p.id));
        

      }
      return permisosIds;
    }

    // Para view/edit usar la lista declarada en config, pero resolver a IDs
    const permisosNivel = config.permisos[nivel];
    permisosNivel.forEach(clave => {
      const permisoId = getPermisoId(clave);
      if (permisoId) permisosIds.push(permisoId);
    });
    

    
    return permisosIds;
  };

  // Función para calcular permisos totales basados en niveles
  const calcularPermisosDesdeNiveles = (niveles: Record<string, NivelAcceso>): string[] => {
    const permisosTotales: string[] = [];
    Object.entries(niveles).forEach(([modulo, nivel]) => {
      const permisosModulo = calcularPermisosParaNivel(modulo, nivel);
      permisosTotales.push(...permisosModulo);
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
      {/* Header simple */}
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
        </div>

        <div className="flex items-center gap-2">
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

      {/* Botones de acción rápida */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">⚡ Acciones Rápidas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Asigna todos los módulos a un nivel específico de una vez
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => asignarTodosNivel("none")}
                disabled={busy}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4 text-destructive" />
                Todo Sin Acceso
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => asignarTodosNivel("view")}
                disabled={busy}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4 text-blue-500" />
                Todo Solo Ver
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => asignarTodosNivel("edit")}
                disabled={busy}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4 text-green-500" />
                Todo Editar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => asignarTodosNivel("admin")}
                disabled={busy}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4 text-purple-500" />
                Todo Administrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="mt-2">
                <p className="text-xl font-bold text-blue-600">
                  {rol?.nombre}
                </p>
                {rol?.descripcion && (
                  <p className="text-sm text-muted-foreground mt-1">{rol.descripcion}</p>
                )}
              </div>
          <p className="text-sm text-muted-foreground mt-3">
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
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-card">
                          <RadioGroupItem value="none" id={`${modulo}-none`} />
                          <label htmlFor={`${modulo}-none`} className="flex items-center gap-2 cursor-pointer">
                            <X className="h-4 w-4 text-destructive" />
                            <div>
                              <div className="font-medium text-foreground">Sin acceso</div>
                              <div className="text-xs text-muted-foreground">No puede ver ni hacer nada</div>
                            </div>
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-card">
                          <RadioGroupItem value="view" id={`${modulo}-view`} />
                          <label htmlFor={`${modulo}-view`} className="flex items-center gap-2 cursor-pointer">
                            <Eye className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="font-medium text-foreground">Solo ver</div>
                              <div className="text-xs text-muted-foreground">Consultar información</div>
                            </div>
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-card">
                          <RadioGroupItem value="edit" id={`${modulo}-edit`} />
                          <label htmlFor={`${modulo}-edit`} className="flex items-center gap-2 cursor-pointer">
                            <Edit className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="font-medium text-foreground">Editar</div>
                              <div className="text-xs text-muted-foreground">Ver + Crear + Editar</div>
                            </div>
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-card">
                          <RadioGroupItem value="admin" id={`${modulo}-admin`} />
                          <label htmlFor={`${modulo}-admin`} className="flex items-center gap-2 cursor-pointer">
                            <Settings className="h-4 w-4 text-purple-500" />
                            <div>
                              <div className="font-medium text-foreground">Administrar</div>
                              <div className="text-xs text-muted-foreground">Acceso completo</div>
                            </div>
                          </label>
                        </div>
                      </RadioGroup>

                      {/* Preview de permisos que se asignarán */}
                      <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => togglePreview(modulo)}>
                          {previewVisibles.has(modulo) ? 'Ocultar preview' : 'Ver permisos que se asignarán'}
                        </Button>
                        {previewVisibles.has(modulo) && (
                          <div className="mt-2 p-4 bg-card border rounded-lg shadow-sm">
                            <div className="text-sm font-semibold mb-3 text-foreground">Permisos que se asignarán por nivel:</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(["none", "view", "edit", "admin"] as NivelAcceso[]).map(nivel => {
                                const permisosIds = calcularPermisosParaNivel(modulo, nivel);
                                const permisosClaves = permisosIds
                                  .map(id => permisosDisponibles.find(p => p.id === id)?.clave)
                                  .filter((c): c is string => !!c)
                                  .sort();
                                
                                const isCurrentLevel = nivelActual === nivel;
                                
                                return (
                                  <div key={nivel} className={`p-3 rounded-lg border-2 transition-colors ${
                                    isCurrentLevel 
                                      ? 'border-primary bg-primary/5 shadow-sm' 
                                      : 'border-border bg-muted/30'
                                  }`}>
                                    <div className={`font-medium text-sm mb-2 ${
                                      isCurrentLevel ? 'text-primary' : 'text-foreground'
                                    }`}>
                                      {nivel === 'none' && '❌ Sin acceso'}
                                      {nivel === 'view' && '👁️ Solo ver'}
                                      {nivel === 'edit' && '✏️ Editar'}
                                      {nivel === 'admin' && '⚙️ Administrar'}
                                      {isCurrentLevel && ' (actual)'}
                                    </div>
                                    <div className="text-xs">
                                      {permisosClaves.length === 0 ? (
                                        <span className="text-muted-foreground italic">— Sin permisos —</span>
                                      ) : (
                                        <ul className="space-y-1">
                                          {permisosClaves.map(clave => (
                                            <li key={clave} className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded text-xs">
                                              {clave}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Detalle de permisos asignados para auditoría visual */}
                      <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => toggleDetalle(modulo)}>
                          {detallesVisibles.has(modulo) ? 'Ocultar permisos' : 'Ver permisos del módulo'}
                        </Button>
                        {detallesVisibles.has(modulo) && (
                          <div className="mt-2 p-3 bg-muted/20 border rounded-lg">
                            {(() => {
                              const prefixes = MODULO_PREFIXES[modulo] || [modulo];
                              const claves = Array.from(permisosAsignados)
                                .map(id => permisosDisponibles.find(p => p.id === id)?.clave)
                                .filter((c): c is string => !!c && prefixes.some(px => c.startsWith(px + '.')))
                                .sort();
                              return (
                                <>
                                  <div className="text-sm font-medium mb-2 text-foreground">
                                    Permisos asignados ({claves.length}):
                                  </div>
                                  {claves.length === 0 ? (
                                    <div className="text-muted-foreground italic">— Sin permisos de este módulo —</div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {claves.map(c => (
                                        <div key={c} className="font-mono text-primary bg-primary/10 px-2 py-1 rounded text-xs">
                                          {c}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
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
