# Ejemplo de Migración de Logs - roles-servicio/route.ts

## ANTES (Problemático en Producción):

```typescript
// ❌ Logs de debug que aparecen en producción
console.log('🔍 GET roles-servicio - Email del header:', email);
console.log('🔍 GET roles-servicio - Resultado query usuario:', t.rows);
console.log('🔍 GET roles-servicio - Parámetros finales:', { activo, tenantId });
console.log('⚠️ GET roles-servicio - Sin tenantId, devolviendo todos los roles');
console.log('🔍 Query ejecutada:', query);
console.log('🔍 Parámetros:', params);
console.log('🔍 Resultados obtenidos:', result.rows.length, 'filas');
console.error('Error al obtener roles de servicio:', error); // ✅ Este sí debe mantenerse
```

## DESPUÉS (Con Sistema de Logging):

```typescript
import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

// ✅ Logs de debug - ELIMINADOS automáticamente en producción
devLogger.search('GET roles-servicio - Email del header:', email);
devLogger.db('GET roles-servicio - Resultado query usuario:', t.rows);
devLogger.data('GET roles-servicio - Parámetros finales:', { activo, tenantId });
logger.warn('GET roles-servicio - Sin tenantId, devolviendo todos los roles');
devLogger.db('Query ejecutada:', query);
devLogger.data('Parámetros:', params);
devLogger.success('Resultados obtenidos:', result.rows.length, 'filas');
logger.error('Error al obtener roles de servicio:', error); // ✅ Mantenido en producción
```

## Resultado en Producción:

- ❌ 7 logs de debug eliminados automáticamente
- ⚠️ 1 warning mantenido (importante para monitoreo)
- ✅ 1 error log mantenido (crítico para debugging)

## Beneficios:

1. **Seguridad**: No se exponen emails, queries SQL ni datos internos
2. **Rendimiento**: Reducción de ~85% en logs de consola
3. **UX**: Consola limpia para usuarios finales
4. **Mantenimiento**: Logs críticos preservados para debugging
