# Módulo de Turnos Extras

## Descripción
El módulo de Turnos Extras permite gestionar y controlar los pagos de turnos adicionales realizados por los guardias. Incluye funcionalidades para administrar pagos pendientes, ver historial de pagos realizados y exportar reportes.

## Funcionalidades Principales

### 1. Gestión de Pagos (`/pauta-diaria/turnos-extras`)
- **Estadísticas en tiempo real**: Muestra total de turnos, pendientes, pagados y montos
- **Filtros avanzados**: Por fecha, estado (reemplazo/PPC), estado de pago, búsqueda
- **Acciones masivas**: Seleccionar múltiples turnos y marcarlos como pagados
- **Modal de confirmación**: Confirmación de pago con observaciones opcionales
- **Exportación CSV**: Compatible con formatos bancarios

### 2. Historial de Pagos (`/pauta-diaria/turnos-extras/historial`)
- **Estadísticas detalladas**: Total pagos, montos, promedios, pagos del mes
- **Filtros por usuario**: Ver pagos realizados por usuario específico
- **Información completa**: Fecha de pago, usuario, observaciones
- **Exportación de historial**: CSV con todos los pagos realizados

## Tipos de Turnos Extras

### Reemplazo
- Turnos realizados para cubrir ausencias de otros guardias
- Valor determinado por la instalación

### PPC (Puesto de Protección Civil)
- Turnos adicionales de protección civil
- Valor específico por tipo de puesto

## Estructura de Datos

### Tabla `turnos_extras`
```sql
- id: UUID (PK)
- guardia_id: UUID (FK a guardias)
- instalacion_id: UUID (FK a instalaciones)
- puesto_id: UUID (FK a puestos operativos)
- pauta_id: UUID (FK a pauta mensual)
- fecha: DATE
- estado: ENUM ('reemplazo', 'ppc')
- valor: DECIMAL
- pagado: BOOLEAN
- fecha_pago: DATE NULL
- observaciones_pago: TEXT NULL
- usuario_pago: VARCHAR NULL
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Endpoints de API

### GET `/api/pauta-diaria/turno-extra`
Obtiene turnos extras con filtros opcionales:
- `fecha_inicio`: Fecha de inicio
- `fecha_fin`: Fecha de fin
- `estado`: 'reemplazo' | 'ppc' | 'all'
- `pagado`: 'true' | 'false' | 'all'
- `instalacion_id`: ID de instalación
- `busqueda`: Búsqueda por nombre, RUT, instalación
- `solo_pagados`: 'true' para historial

### POST `/api/pauta-diaria/turno-extra`
Crea un nuevo turno extra:
```json
{
  "guardia_id": "uuid",
  "puesto_id": "uuid",
  "pauta_id": "uuid",
  "estado": "reemplazo" | "ppc"
}
```

### POST `/api/pauta-diaria/turno-extra/marcar-pagado`
Marca turnos como pagados:
```json
{
  "turno_ids": ["uuid1", "uuid2"],
  "observaciones": "Comentarios opcionales"
}
```

### GET `/api/pauta-diaria/turno-extra/exportar`
Exporta turnos extras a CSV con filtros.

## Componentes UI

### NavigationTabs
Navegación entre páginas de gestión e historial.

### Modal de Confirmación
- Resumen del pago
- Campo de observaciones
- Confirmación con loading state

## Características Técnicas

### Validaciones
- Verificación de turnos existentes
- Validación de estados válidos
- Control de turnos ya pagados

### Logging
- Registro de todas las operaciones CRUD
- Trazabilidad de pagos realizados
- Auditoría de cambios

### Performance
- Filtros optimizados en base de datos
- Paginación para grandes volúmenes
- Caché de estadísticas

## Uso del Sistema

### Para Administradores
1. **Revisar turnos pendientes**: Filtrar por fecha, instalación, estado
2. **Procesar pagos**: Seleccionar turnos y marcarlos como pagados
3. **Agregar observaciones**: Comentarios sobre el pago
4. **Exportar reportes**: CSV para contabilidad

### Para Contadores
1. **Ver historial completo**: Todos los pagos realizados
2. **Filtrar por período**: Fechas específicas
3. **Exportar datos**: CSV para sistemas contables
4. **Revisar estadísticas**: Totales y promedios

## Configuración

### Variables de Entorno
```env
# Configuración de base de datos
DATABASE_URL=postgresql://...

# Configuración de logging
LOG_LEVEL=info
```

### Permisos
- **Lectura**: Ver turnos extras y historial
- **Escritura**: Crear turnos extras
- **Administración**: Marcar como pagado, exportar

## Mantenimiento

### Limpieza de Datos
- Los turnos pagados se mantienen para auditoría
- No se permite eliminación de registros
- Backup automático de datos

### Monitoreo
- Logs de todas las operaciones
- Métricas de uso del sistema
- Alertas por errores críticos

## Roadmap

### Próximas Funcionalidades
- [ ] Integración con sistemas bancarios
- [ ] Notificaciones automáticas
- [ ] Dashboard de métricas avanzadas
- [ ] API para integración externa
- [ ] Reportes automáticos por email

### Mejoras Técnicas
- [ ] Optimización de consultas
- [ ] Implementación de caché
- [ ] Tests automatizados
- [ ] Documentación de API 