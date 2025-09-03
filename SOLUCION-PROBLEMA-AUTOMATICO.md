# 🚨 SOLUCIÓN AL PROBLEMA DE MODIFICACIONES AUTOMÁTICAS

## PROBLEMA IDENTIFICADO

### Síntomas:
- Usuarios desaparecían automáticamente al hacer deploy
- Campo `rol` reaparecía constantemente  
- Usuarios @gardops.com se recreaban solos
- Errores "column rol does not exist"

### Causa Raíz:
1. **`runDatabaseMigrations()`** se ejecutaba automáticamente en cada deploy
2. **`createUsuariosTable()`** recreaba el campo `rol` legacy
3. **`fn_usuario_tiene_permiso`** usaba el campo `rol` que ya no existía

## SOLUCIÓN APLICADA

### 1. Migraciones Automáticas DESHABILITADAS
```typescript
// src/lib/database-migrations.ts
export async function runDatabaseMigrations(preserveData: boolean = false): Promise<MigrationResult> {
  // 🛡️ FUNCIÓN DESHABILITADA PARA PREVENIR MODIFICACIONES AUTOMÁTICAS
  console.log('🚫 runDatabaseMigrations DESHABILITADA');
  
  return {
    success: true,
    message: 'Migraciones deshabilitadas - BD preservada sin cambios',
    warnings: ['Función de migraciones deshabilitada por seguridad'],
    errors: []
  };
}
```

### 2. APIs Problemáticas DESHABILITADAS
- `/api/migrate-usuarios` → 410 Gone
- `/api/init-users` → 410 Gone
- `initializeDefaultUsers()` → No hace nada

### 3. Función de Permisos CORREGIDA
```sql
-- db/fix-fn-usuario-tiene-permiso.sql
CREATE OR REPLACE FUNCTION fn_usuario_tiene_permiso(
  p_usuario_email TEXT,
  p_permiso_clave TEXT
) RETURNS BOOLEAN AS $$
-- Usa RBAC completo, sin campo 'rol' legacy
$$;
```

### 4. Sistema Manual Creado
- `src/lib/manual-user-management.ts`
- Solo funciones explícitas, sin automatismos
- Gestión controlada de usuarios

## ESTADO FINAL

### Usuarios Estables:
- carlos.irigoyen@gard.cl → Tenant Admin
- central@gard.cl → Operador

### Protecciones Activas:
- Sin migraciones automáticas
- Sin recreación de usuarios
- Sin campo `rol` legacy
- Sistema RBAC puro

### Backup Creado:
- `BACKUP-USUARIOS-*.json` con estado actual

## VERIFICACIÓN

Para verificar que todo funciona:
1. Carlos puede acceder a clientes, configuración
2. Central puede acceder a clientes, NO a configuración
3. No aparecen usuarios @gardops.com
4. No hay errores de "column rol does not exist"

## COMANDOS DE EMERGENCIA

Si algo falla, restaurar desde backup:
```bash
# Ver backups disponibles
ls BACKUP-USUARIOS-*.json

# Restaurar manualmente desde backup si es necesario
node src/lib/manual-user-management.ts
```
