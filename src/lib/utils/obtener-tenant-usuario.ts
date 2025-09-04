/**
 * Utilidad para obtener el tenant_id del usuario autenticado
 */

/**
 * Obtiene el tenant_id del usuario autenticado desde el contexto de la sesión
 * @returns Promise con el tenant_id o '1' por defecto
 */
export async function obtenerTenantIdUsuario(): Promise<string> {
  try {
    // En el frontend, podemos obtener el tenant_id desde la API de usuario actual
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const userData = await response.json();
      return userData.user?.tenant_id || '1';
    }
  } catch (error) {
    console.error('Error obteniendo tenant_id del usuario:', error);
  }
  
  // Fallback
  return '1';
}

/**
 * Hook para obtener tenant_id en componentes React
 */
export function useTenantId() {
  const [tenantId, setTenantId] = React.useState<string>('1');
  
  React.useEffect(() => {
    obtenerTenantIdUsuario().then(setTenantId);
  }, []);
  
  return tenantId;
}
