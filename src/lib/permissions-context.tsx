'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const preloadCommonPermissions = async () => {
    const isAdmin = checkAdminBypass();
    
    if (isAdmin) {
      // Si es admin, todos los permisos son true
      const adminPermissions = new Map<string, boolean>();
      COMMON_PERMISSIONS.forEach(perm => {
        adminPermissions.set(perm, true);
      });
      setPermissions(adminPermissions);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      setLoading(true);
      const newPermissions = new Map<string, boolean>();
      
      // Cargar permisos en paralelo
      const permissionPromises = COMMON_PERMISSIONS.map(async (perm) => {
        try {
          const result = await fetchCan(perm);
          return { perm, result };
        } catch (error) {
          console.warn(`Error cargando permiso ${perm}:`, error);
          return { perm, result: false };
        }
      });

      const results = await Promise.all(permissionPromises);
      
      if (mounted.current) {
        results.forEach(({ perm, result }) => {
          newPermissions.set(perm, result);
        });
        
        setPermissions(newPermissions);
        setLoading(false);
        setInitialized(true);
      }
    } catch (error) {
      console.error('Error precargando permisos:', error);
      if (mounted.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  };

  // Precargar permisos adicionales
  const preloadPermissions = async (perms: string[]) => {
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
        console.warn(`Error cargando permiso ${perm}:`, error);
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
  };

  // Verificar un permiso específico
  const checkPermission = (perm: string): boolean | null => {
    if (!initialized) return null; // Aún cargando
    if (checkAdminBypass()) return true; // Admin bypass
    return permissions.get(perm) ?? null; // null si no está cacheado
  };

  // Inicializar al montar
  useEffect(() => {
    preloadCommonPermissions();
  }, []);

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
