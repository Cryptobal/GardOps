# 🧠 Sistema Centralizado de Logs - GardOps

## 📋 Resumen

Se ha implementado un sistema centralizado de logs para GardOps con 7 tablas estandarizadas y una función centralizada de logging en TypeScript.

## 🗄️ Tablas Creadas

### 1. `logs_guardias`
- Registra todas las operaciones CRUD en el módulo de guardias
- Campos: `guardia_id`, `accion`, `usuario`, `tipo`, `contexto`, `datos_anteriores`, `datos_nuevos`, `fecha`, `tenant_id`

### 2. `logs_pauta_mensual`
- Registra operaciones en pautas mensuales
- Campos: `pauta_mensual_id`, `accion`, `usuario`, `tipo`, `contexto`, `datos_anteriores`, `datos_nuevos`, `fecha`, `tenant_id`

### 3. `logs_pauta_diaria`
- Registra operaciones en pautas diarias
- Campos: `pauta_diaria_id`, `accion`, `usuario`, `tipo`, `contexto`, `datos_anteriores`, `datos_nuevos`, `fecha`, `tenant_id`

### 4. `logs_turnos_extras`
- Registra operaciones en turnos extras
- Campos: `turno_extra_id`, `accion`, `usuario`, `tipo`, `contexto`, `datos_anteriores`, `datos_nuevos`, `fecha`, `tenant_id`

### 5. `logs_puestos_operativos`
- Registra operaciones en puestos operativos
- Campos: `puesto_operativo_id`, `accion`, `usuario`, `tipo`, `contexto`, `datos_anteriores`, `datos_nuevos`, `fecha`, `tenant_id`

### 6. `logs_documentos`
- Registra operaciones en documentos
- Campos: `documento_id`, `accion`, `usuario`, `tipo`, `contexto`, `datos_anteriores`, `datos_nuevos`, `fecha`, `tenant_id`

### 7. `logs_usuarios`
- Registra operaciones en usuarios
- Campos: `usuario_id`, `accion`, `usuario`, `tipo`, `contexto`, `datos_anteriores`, `datos_nuevos`, `fecha`, `tenant_id`

## 🚀 Funciones de Logging

### Función Principal: `logCRUD`

```typescript
import { logCRUD } from '@/lib/logging';

await logCRUD(
  'guardias',           // módulo
  'guardia_123',        // entidadId
  'CREATE',             // operación: CREATE, READ, UPDATE, DELETE
  'admin@test.com',     // usuario
  undefined,            // datosAnteriores (para UPDATE/DELETE)
  { nombre: 'Juan' },   // datosNuevos (para CREATE/UPDATE)
  'tenant_001',         // tenantId
  'api'                 // tipo: manual, api, sistema
);
```

### Funciones Específicas

#### Crear Log
```typescript
import { logCreate } from '@/lib/logging';

await logCreate(
  'guardias',
  'guardia_123',
  'admin@test.com',
  { nombre: 'Juan Pérez', email: 'juan@test.com' },
  'tenant_001'
);
```

#### Actualizar Log
```typescript
import { logUpdate } from '@/lib/logging';

await logUpdate(
  'guardias',
  'guardia_123',
  'admin@test.com',
  { nombre: 'Juan Pérez' },           // datos anteriores
  { nombre: 'Juan Carlos Pérez' },    // datos nuevos
  'tenant_001'
);
```

#### Eliminar Log
```typescript
import { logDelete } from '@/lib/logging';

await logDelete(
  'guardias',
  'guardia_123',
  'admin@test.com',
  { nombre: 'Juan Pérez', email: 'juan@test.com' }, // datos eliminados
  'tenant_001'
);
```

#### Log de Sistema
```typescript
import { logSistema } from '@/lib/logging';

await logSistema(
  'usuarios',
  'user_999',
  'BACKUP_AUTOMATICO',
  { archivo: 'backup_2024_01_15.sql', tamaño: '15MB' },
  'tenant_001'
);
```

#### Log de Error
```typescript
import { logError } from '@/lib/logging';

await logError(
  'guardias',
  'guardia_123',
  'admin@test.com',
  error,
  { endpoint: '/api/guardias', method: 'POST' },
  'tenant_001'
);
```

## 🔧 Integración en Endpoints

### Ejemplo en API de Guardias

```typescript
import { logCreate, logError } from '@/lib/logging';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    
    // Crear guardia
    const result = await query(`
      INSERT INTO guardias (...) VALUES (...)
      RETURNING *
    `, [/* params */]);

    const nuevoGuardia = result.rows[0];

    // Log de creación
    await logCreate(
      'guardias',
      nuevoGuardia.id,
      'admin@test.com',
      nuevoGuardia,
      tenantId
    );

    return NextResponse.json({ success: true, guardia: nuevoGuardia });
  } catch (error) {
    // Log del error
    await logError(
      'guardias',
      'NEW',
      'admin@test.com',
      error,
      { endpoint: '/api/guardias', method: 'POST' },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
```

## 📊 Consultas Útiles

### Ver logs de un módulo específico
```sql
SELECT * FROM logs_guardias 
WHERE fecha >= NOW() - INTERVAL '7 days' 
ORDER BY fecha DESC;
```

### Ver logs de un usuario específico
```sql
SELECT * FROM logs_guardias 
WHERE usuario = 'admin@test.com' 
ORDER BY fecha DESC;
```

### Ver logs de errores
```sql
SELECT * FROM logs_guardias 
WHERE accion = 'ERROR' 
ORDER BY fecha DESC;
```

### Estadísticas de actividad
```sql
SELECT 
  DATE(fecha) as dia,
  COUNT(*) as total_operaciones,
  COUNT(CASE WHEN accion LIKE 'CREATE%' THEN 1 END) as creaciones,
  COUNT(CASE WHEN accion LIKE 'UPDATE%' THEN 1 END) as actualizaciones,
  COUNT(CASE WHEN accion LIKE 'DELETE%' THEN 1 END) as eliminaciones
FROM logs_guardias 
WHERE fecha >= NOW() - INTERVAL '30 days'
GROUP BY DATE(fecha)
ORDER BY dia DESC;
```

## 🎯 Beneficios

1. **Auditoría Completa**: Registro de todas las operaciones CRUD
2. **Trazabilidad**: Seguimiento de cambios con datos anteriores y nuevos
3. **Seguridad**: Identificación de usuarios y acciones
4. **Debugging**: Logs de errores con contexto completo
5. **Análisis**: Estadísticas de uso y actividad
6. **Compliance**: Cumplimiento de regulaciones de auditoría

## 🔒 Consideraciones de Seguridad

- Los logs no interrumpen las operaciones principales
- Los errores de logging se manejan silenciosamente
- Los datos sensibles deben ser filtrados antes del logging
- Los logs se almacenan con tenant_id para multi-tenancy

## 📈 Próximos Pasos

1. Integrar logging en todos los endpoints existentes
2. Crear dashboard de auditoría
3. Implementar rotación automática de logs
4. Configurar alertas para operaciones críticas
5. Exportar logs para análisis externo

---

**✅ Sistema implementado exitosamente**
- 7 tablas de logs creadas en Neon
- Función centralizada de logging en TypeScript
- Documentación completa
- Ejemplos de integración 