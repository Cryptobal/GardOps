// Script para probar permisos de payroll
console.log('=== Test de Permisos Payroll ===');

// Verificar si el contexto de permisos está disponible
try {
  // Simular la verificación de permisos
  const testPermission = async (perm) => {
    try {
      const response = await fetch(`/api/rbac/can?perm=${encodeURIComponent(perm)}`);
      const data = await response.json();
      console.log(`Permiso ${perm}:`, data);
      return data.allowed;
    } catch (error) {
      console.error(`Error verificando ${perm}:`, error);
      return false;
    }
  };

  // Probar permisos de payroll
  testPermission('payroll.view').then(allowed => {
    console.log('payroll.view permitido:', allowed);
  });

  testPermission('payroll.edit').then(allowed => {
    console.log('payroll.edit permitido:', allowed);
  });

  testPermission('payroll.create').then(allowed => {
    console.log('payroll.create permitido:', allowed);
  });

} catch (error) {
  console.error('Error en test de permisos:', error);
}

// Verificar el estado del contexto de permisos
console.log('Contexto de permisos disponible:', typeof window !== 'undefined' && window.__PERMISSIONS_CONTEXT__);

