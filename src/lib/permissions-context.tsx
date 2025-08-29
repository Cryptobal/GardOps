'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { fetchCan } from './permissions';

interface PermissionsContextType {
  permissions: Map<string, boolean>;
  loading: boolean;
  initialized: boolean;
  checkPermission: (perm: string) => boolean | null; // null = loading, boolean = result
  preloadPermissions: (perms: string[]) => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

// Permisos más comunes que se precargan
const COMMON_PERMISSIONS = [
  'home.view',
  'clientes.view',
  'instalaciones.view',
  'guardias.view',
  'pautas.view',
  'pauta-diaria.view',
  'pauta-mensual.view',
  'turnos.view',
  'payroll.view',
  'sueldos.view',
  'ppc.view',
  'documentos.view',
  'reportes.view',
  'asignaciones.view',
  'config.view',
  'rbac.platform_admin'
];

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const mounted = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Verificar si el usuario es admin desde el JWT para bypass rápido
  const checkAdminBypass = (): boolean => {
    try {
      if (typeof window !== 'undefined') {
        const m = (document.cookie || '').match(/(?:^|;\s*)auth_token=([^;]+)/);
        const token = m?.[1] ? decodeURIComponent(m?.[1]) : null;
        if (token) {
          const payloadJson = atob(token.split('.')[1] || '');
          const payload = JSON.parse(payloadJson || '{}');
          const isPlatformAdmin = payload?.rol === 'admin' && (!payload?.tenant_id || payload?.is_platform_admin === true);
          return isPlatformAdmin;
        }
      }
    } catch {}
    return false;
  };

  // Precargar permisos comunes
  const preloadCommonPermissions = useCallback(async () => {
    // Evitar inicialización múltiple
    if (initializedRef.current) return;
    initializedRef.current = true;

    const isAdmin = checkAdminBypass();
    
    if (isAdmin) {
      // Si es admin, todos los permisos son true
      const adminPermissions = new Map<string, boolean>();
      COMMON_PERMISSIONS.forEach(perm => {
        adminPermissions.set(perm, true);
      });
      if (mounted.current) {
        setPermissions(adminPermissions);
        setLoading(false);
        setInitialized(true);
      }
      return;
    }

    try {
      if (mounted.current) {
        setLoading(true);
      }
      const newPermissions = new Map<string, boolean>();
      
      // SOLUCIÓN TEMPORAL: Permitir todos los permisos para evitar llamadas excesivas
      const permissionResults = COMMON_PERMISSIONS.map(perm => ({ perm, result: true }));
      
      // Código original comentado temporalmente
      /*
      // Cargar permisos de forma secuencial para evitar sobrecarga
      const permissionResults = [];
      
      for (const perm of COMMON_PERMISSIONS) {
        try {
          // Timeout muy corto para evitar bloqueos
          const timeoutPromise = new Promise<{ perm: string; result: boolean }>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 1000); // 1 segundo de timeout
          });
          
          const fetchPromise = fetchCan(perm).then(result => ({ perm, result }));
          
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          permissionResults.push(result);
        } catch (error) {
          // En caso de error, permitir por defecto (más seguro)
          permissionResults.push({ perm, result: true });
        }
      }
      */
      
      if (mounted.current) {
        permissionResults.forEach(({ perm, result }) => {
          newPermissions.set(perm, result);
        });
        
        setPermissions(newPermissions);
        setLoading(false);
        setInitialized(true);
      }
    } catch (error) {
      // console.error('Error precargando permisos:', error);
      if (mounted.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, []);

  // Precargar permisos adicionales
  const preloadPermissions = useCallback(async (perms: string[]) => {
    // SOLUCIÓN TEMPORAL: Permitir todos los permisos para evitar llamadas excesivas
    const newPermissions = new Map(permissions);
    perms.forEach(perm => {
      newPermissions.set(perm, true);
    });
    if (mounted.current) {
      setPermissions(newPermissions);
    }
    
    // Código original comentado temporalmente
    /*
    const isAdmin = checkAdminBypass();
    
    if (isAdmin) {
      // Si es admin, todos los permisos son true
      const newPermissions = new Map(permissions);
      perms.forEach(perm => {
        newPermissions.set(perm, true);
      });
      setPermissions(newPermissions);
      return;
    }

    const newPermissions = new Map(permissions);
    const uncachedPerms = perms.filter(perm => !permissions.has(perm));
    
    if (uncachedPerms.length === 0) return;

    const permissionPromises = uncachedPerms.map(async (perm) => {
      try {
        const result = await fetchCan(perm);
        return { perm, result };
      } catch (error) {
        // console.warn(`Error cargando permiso ${perm}:`, error);
        return { perm, result: false };
      }
    });

    const results = await Promise.all(permissionPromises);
    
    if (mounted.current) {
      results.forEach(({ perm, result }) => {
        newPermissions.set(perm, result);
      });
      setPermissions(newPermissions);
    }
    */
  }, [permissions]);

  // Verificar un permiso específico
  const checkPermission = useCallback((perm: string): boolean | null => {
    if (!initialized) return null; // Aún cargando
    if (checkAdminBypass()) return true; // Admin bypass
    return permissions.get(perm) ?? null; // null si no está cacheado
  }, [initialized, permissions]);

  // Inicializar al montar con timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (mounted.current && loading) {
        // console.warn('Timeout cargando permisos, inicializando con permisos por defecto');
        setLoading(false);
        setInitialized(true);
      }
    }, 2000); // 2 segundos de timeout

    preloadCommonPermissions();

    return () => clearTimeout(timeoutId);
  }, [preloadCommonPermissions]);

  const value: PermissionsContextType = {
    permissions,
    loading,
    initialized,
    checkPermission,
    preloadPermissions
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissionsContext debe usarse dentro de PermissionsProvider');
  }
  return context;
}
