# Normalización de Motivos PPC

## Cambios Realizados

### Valores Normalizados
- **falta_asignacion**: No hay guardia asignado al puesto
- **falta_con_aviso**: Guardia avisó que no puede asistir
- **ausencia_temporal**: Guardia temporalmente ausente (licencia, permiso, etc.)
- **renuncia**: Guardia renunció o fue desvinculado

### Mapeo de Valores Antiguos
- 'falta_aviso' → 'falta_con_aviso'
- 'licencia' → 'ausencia_temporal'
- 'permiso' → 'ausencia_temporal'
- 'inasistencia' → 'ausencia_temporal'
- 'desvinculacion' → 'renuncia'

### Archivos Modificados
- `src/lib/database-migrations.ts`: Constraint actualizada
- `scripts/normalizar-motivos-ppc.sql`: Script de migración creado

### Fecha de Cambio
2025-08-01T21:34:10.503Z

### Notas
- Se mantiene compatibilidad con datos existentes
- Se crearon backups automáticos
- Incluye instrucciones de rollback
