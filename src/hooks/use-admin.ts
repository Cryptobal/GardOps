import { useState, useEffect } from 'react';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = () => {
      try {
        if (typeof window !== 'undefined') {
          const m = (document.cookie || '').match(/(?:^|;\s*)auth_token=([^;]+)/);
          const token = m?.[1] ? decodeURIComponent(m?.[1]) : null;
          
          if (token) {
            const payloadJson = atob(token.split('.')[1] || '');
            const payload = JSON.parse(payloadJson || '{}');
            
            // Verificar si es administrador general (platform admin)
            const isPlatformAdmin = payload?.rol === 'admin' && 
              (!payload?.tenant_id || payload?.is_platform_admin === true);
            
            // Verificar específicamente si es Carlos Irigoyen
            const isCarlosIrigoyen = payload?.email === 'carlos.irigoyen@gardops.cl' || 
                                    payload?.email === 'carlos.irigoyen@gard.cl' ||
                                    payload?.nombre === 'Carlos' && payload?.apellido === 'Irigoyen';
            
            const finalAdminStatus = isPlatformAdmin || isCarlosIrigoyen;
            setIsAdmin(finalAdminStatus);
          } else {
            setIsAdmin(false);
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading };
}
