# Migración de IDs Numéricos a UUIDs

## Problema
Algunas instalaciones en la base de datos tienen IDs numéricos (ej: "1", "2", "3") en lugar de UUIDs válidos. Esto causa errores cuando se intenta editar o ver detalles de estas instalaciones, ya que el sistema espera UUIDs.

## Solución
Este script migra automáticamente todos los IDs numéricos a UUIDs válidos, manteniendo la integridad referencial en todas las tablas relacionadas.

## Pasos para la Migración

### 1. Verificar el Estado Actual
Antes de migrar, verifica qué instalaciones tienen IDs numéricos:

```bash
npm run verify:ids
```

Este comando te mostrará:
- Total de instalaciones
- Cuántas tienen IDs numéricos
- Cuántas tienen UUIDs válidos
- Ejemplos de cada tipo
- Verificación de integridad referencial

### 2. Ejecutar la Migración
Si se encontraron instalaciones con IDs numéricos, ejecuta la migración:

```bash
npm run migrate:ids-numericos
```

### 3. Verificar el Resultado
Después de la migración, verifica que todo esté correcto:

```bash
npm run verify:ids
```

## ¿Qué Hace el Script de Migración?

### 1. Encuentra Instalaciones con IDs Numéricos
Busca todas las instalaciones cuyo ID sea solo números (ej: "1", "2", "123").

### 2. Crea Nuevos UUIDs
Genera un UUID único para cada instalación encontrada.

### 3. Actualiza Todas las Tablas Relacionadas
En una transacción segura, actualiza:
- `instalaciones` (tabla principal)
- `as_turnos_configuracion`
- `as_turnos_requisitos`
- `as_turnos_asignaciones`
- `as_turnos_ppc`
- `logs_instalaciones`
- `documentos_instalaciones`
- `pautas_mensuales`

### 4. Genera Reporte
Crea un archivo `mapeo-ids-migracion.json` con el mapeo de IDs viejos a nuevos.

## Seguridad

### Transacción
La migración se ejecuta en una transacción de base de datos. Si algo falla, todos los cambios se revierten automáticamente.

### Backup
Se recomienda hacer un backup de la base de datos antes de ejecutar la migración:

```sql
-- Ejemplo de backup (ajusta según tu configuración)
pg_dump -h tu-host -U tu-usuario -d tu-database > backup_antes_migracion.sql
```

### Mapeo
El script guarda un mapeo completo de IDs viejos a nuevos en `scripts/mapeo-ids-migracion.json` para referencia futura.

## Ejemplo de Salida

```
🚀 Iniciando migración de IDs numéricos a UUIDs...
📋 Buscando instalaciones con IDs numéricos...
📊 Encontradas 3 instalaciones con IDs numéricos:
   - ID: 1 | Nombre: Instalación A
   - ID: 2 | Nombre: Instalación B
   - ID: 3 | Nombre: Instalación C

🔄 Mapeo de IDs:
   1 → 7e05a55d-8db6-4c20-b51c-509f09d69f74 (Instalación A)
   2 → a0a9772e-9d9a-4c51-93c7-13c868bcb010 (Instalación B)
   3 → fe9d6aea-80b8-4978-bf4a-16183154bf98 (Instalación C)

💾 Iniciando transacción de migración...
📝 Actualizando tabla instalaciones...
   ✅ Instalación "Instalación A" migrada: 1 → 7e05a55d-8db6-4c20-b51c-509f09d69f74
   ✅ Instalación "Instalación B" migrada: 2 → a0a9772e-9d9a-4c51-93c7-13c868bcb010
   ✅ Instalación "Instalación C" migrada: 3 → fe9d6aea-80b8-4978-bf4a-16183154bf98

🔗 Actualizando tablas relacionadas...
   📋 Actualizando as_turnos_configuracion...
     ✅ 2 turnos actualizados para "Instalación A"
     ✅ 1 turno actualizado para "Instalación B"
   📋 Actualizando as_turnos_requisitos...
     ✅ 5 requisitos actualizados para "Instalación A"
     ✅ 3 requisitos actualizados para "Instalación B"
   ...

✅ Migración completada exitosamente!

📊 REPORTE FINAL DE MIGRACIÓN:
   • Instalaciones migradas: 3
   • Tablas actualizadas:
     - instalaciones
     - as_turnos_configuracion
     - as_turnos_requisitos
     - as_turnos_asignaciones
     - as_turnos_ppc
     - logs_instalaciones
     - documentos_instalaciones
     - pautas_mensuales

✅ VERIFICACIÓN EXITOSA: No quedan instalaciones con IDs numéricos.

💾 Mapeo guardado en: scripts/mapeo-ids-migracion.json

🎉 Migración completada. El sistema ahora debería funcionar correctamente.
```

## Después de la Migración

1. **Reinicia el servidor de desarrollo** para asegurar que los cambios se reflejen:
   ```bash
   npm run dev
   ```

2. **Prueba la funcionalidad**:
   - Ve a la lista de instalaciones
   - Haz clic en una instalación que antes tenía ID numérico
   - Edita la instalación y guarda los cambios
   - Verifica que los cambios persistan al salir y volver a entrar

3. **Verifica que no haya errores** en la consola del navegador o en los logs del servidor.

## Troubleshooting

### Si la migración falla:
1. Revisa los logs de error
2. Verifica la conexión a la base de datos
3. Asegúrate de tener permisos de escritura en la base de datos
4. Si es necesario, restaura desde el backup y contacta soporte

### Si hay registros huérfanos después de la migración:
1. Ejecuta `npm run verify:ids` para ver cuáles son
2. Considera limpiar manualmente estos registros si no son necesarios
3. O contacta soporte para asistencia

## Notas Importantes

- **No ejecutes la migración múltiples veces** en la misma base de datos
- **Haz backup antes de migrar** en producción
- **Prueba en desarrollo** antes de migrar en producción
- **El mapeo de IDs se guarda** para referencia futura

## Contacto

Si tienes problemas con la migración, contacta al equipo de desarrollo con:
- El archivo `mapeo-ids-migracion.json` (si se generó)
- Los logs de error completos
- El resultado de `npm run verify:ids` 