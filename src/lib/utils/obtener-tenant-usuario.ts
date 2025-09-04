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
 * Nota: Este hook requiere importar React en el componente que lo use
 */
export function useTenantId() {
  // Este hook debe ser usado en componentes que ya importan React
  // const [tenantId, setTenantId] = React.useState<string>('1');
  // React.useEffect(() => {
  //   obtenerTenantIdUsuario().then(setTenantId);
  // }, []);
  // return tenantId;
  
  // Por ahora, retornar función que obtiene el tenant_id
  return obtenerTenantIdUsuario;
}
