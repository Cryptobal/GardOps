import { useState, useEffect } from 'react';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  tenant_id: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Verificar si estamos en el navegador
        if (typeof document === 'undefined') {
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        logger.debug('🔍 Verificando autenticación...');
        
        // Intentar obtener desde cookies
        const tenantCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('tenant='))
          ?.split('=')[1];

        if (tenantCookie) {
          try {
            const tenantInfo = JSON.parse(decodeURIComponent(tenantCookie));
            logger.debug('🍪 Cookie tenant encontrada:', tenantInfo);
            
            if (tenantInfo.email) {
              setAuthState({
                user: tenantInfo,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              devLogger.success(' Usuario autenticado desde cookie:', tenantInfo.email);
              return;
            }
          } catch (parseError) {
            logger.warn('⚠️ Error parseando cookie tenant:', parseError);
          }
        }

        // Intentar obtener desde localStorage
        const currentUser = localStorage.getItem('current_user');
        if (currentUser) {
          try {
            const userInfo = JSON.parse(currentUser);
            logger.debug('💾 localStorage current_user encontrado:', userInfo);
            
            if (userInfo.email) {
              setAuthState({
                user: userInfo,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              devLogger.success(' Usuario autenticado desde localStorage:', userInfo.email);
              return;
            }
          } catch (parseError) {
            logger.warn('⚠️ Error parseando localStorage current_user:', parseError);
          }
        }

        // Verificar si hay auth_token
        const authToken = document.cookie
          .split('; ')
          .find((row) => row.startsWith('auth_token='))
          ?.split('=')[1];

        if (authToken) {
          logger.debug('🔑 Cookie auth_token encontrada, pero no hay información del usuario');
        }

        logger.debug('❌ No se encontró usuario autenticado');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Usuario no autenticado',
        });

      } catch (error) {
        console.error('❌ Error verificando autenticación:', error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Error verificando autenticación',
        });
      }
    };

    checkAuth();

    // Solo verificar una vez al montar el componente
    // Removemos el interval que causaba re-renders infinitos
  }, []);

  const logout = () => {
    try {
      // Limpiar cookies
      document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Limpiar localStorage
      localStorage.removeItem('current_user');
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      logger.debug('✅ Usuario deslogueado');
    } catch (error) {
      console.error('❌ Error en logout:', error);
    }
  };

  return {
    ...authState,
    logout,
  };
}
