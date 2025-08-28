# 📋 SISTEMA DE TURNOS - DOCUMENTACIÓN TÉCNICA

## 🎯 Resumen Ejecutivo

El sistema de turnos de GardOps está diseñado para gestionar la asignación de guardias a puestos operativos en instalaciones. El sistema utiliza un modelo centralizado basado en la tabla `as_turnos_puestos_operativos` que simplifica la lógica operativa y elimina redundancias.

---

## 🏗️ Arquitectura del Sistema

### **Tabla Central: `as_turnos_puestos_operativos`**

```sql
CREATE TABLE as_turnos_puestos_operativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
    rol_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id),
    guardia_id UUID REFERENCES guardias(id),
    nombre_puesto VARCHAR(255) NOT NULL,
    es_ppc BOOLEAN NOT NULL DEFAULT true,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW(),
    tipo_puesto_id UUID REFERENCES cat_tipos_puesto(id)
);
```

### **Conceptos Clave**

1. **Puesto Operativo**: Un lugar físico de trabajo (ej: "Puesto #1", "Puesto #2")
2. **Turno**: Conjunto de puestos que comparten el mismo rol de servicio
3. **PPC (Puesto Por Cubrir)**: Puesto sin guardia asignado
4. **Rol de Servicio**: Patrón de trabajo (ej: "4x4 Diurno", "6x2 Nocturno")

---

## 🔄 Flujo de Creación de Turnos

### **1. Crear Turno**
```typescript
POST /api/instalaciones/{id}/turnos
{
  "rol_servicio_id": "uuid",
  "cantidad_guardias": 2,
  "tipo_puesto_id": "uuid"
}
```

### **2. Proceso Automático**
1. Se crean `N` puestos operativos (donde N = cantidad_guardias)
2. Cada puesto se crea como PPC (`es_ppc = true`)
3. Los puestos se nombran automáticamente: "Puesto #1", "Puesto #2", etc.

### **3. Asignación de Guardias**
```typescript
POST /api/instalaciones/{id}/ppc
{
  "puesto_id": "uuid",
  "guardia_id": "uuid"
}
```

**Resultado**: 
- `guardia_id` se asigna al puesto
- `es_ppc` cambia a `false`

---

## 📊 Consultas Principales

### **Filtro Correcto para Puestos Activos**
```sql
-- ✅ FILTRO CORRECTO
WHERE (po.activo = true OR po.activo IS NULL)

-- ❌ FILTRO RESTRICTIVO (puede excluir puestos válidos)
WHERE po.activo = true
```

### **Obtener Turnos de una Instalación**
```sql
SELECT 
  rs.id as rol_id,
  rs.nombre as rol_nombre,
  COUNT(*) as total_puestos,
  COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as guardias_asignados,
  COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
FROM as_turnos_puestos_operativos po
INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
WHERE po.instalacion_id = $1 
  AND (po.activo = true OR po.activo IS NULL)
GROUP BY rs.id, rs.nombre
```

### **Obtener PPCs Pendientes**
```sql
SELECT 
  po.id,
  po.nombre_puesto,
  rs.nombre as rol_nombre
FROM as_turnos_puestos_operativos po
INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
WHERE po.instalacion_id = $1 
  AND po.es_ppc = true 
  AND po.guardia_id IS NULL
  AND (po.activo = true OR po.activo IS NULL)
```

---

## 🔧 Endpoints Principales

### **1. Datos Completos de Instalación**
```
GET /api/instalaciones/{id}/completa
```
**Devuelve**: Instalación + turnos + puestos + PPCs + guardias + roles

### **2. Turnos de Instalación**
```
GET /api/instalaciones/{id}/turnos
```
**Devuelve**: Lista de turnos con estadísticas

### **3. PPCs Activos**
```
GET /api/instalaciones/{id}/ppc-activos
```
**Devuelve**: Puestos por cubrir de la instalación

### **4. Crear Turno**
```
POST /api/instalaciones/{id}/turnos
```
**Crea**: N puestos operativos para el turno especificado

---

## ⚠️ Problemas Comunes y Soluciones

### **Problema 1: Endpoint devuelve arrays vacíos**
**Síntoma**: Los endpoints devuelven `turnos: []`, `puestos: []`, `ppcs: []`

**Causa**: Filtro SQL restrictivo `WHERE po.activo = true`

**Solución**: Usar filtro correcto `WHERE (po.activo = true OR po.activo IS NULL)`

### **Problema 2: Inconsistencia entre páginas**
**Síntoma**: Página principal muestra datos, página específica no

**Causa**: Diferentes endpoints usan diferentes filtros

**Solución**: Aplicar el mismo filtro en todos los endpoints

### **Problema 3: Puestos no aparecen en PPCs**
**Síntoma**: Puestos creados pero no aparecen en lista de PPCs

**Causa**: Filtro incorrecto o datos inconsistentes

**Solución**: Verificar que `es_ppc = true` y `guardia_id IS NULL`

---

## 🧪 Tests y Validaciones

### **Script de Consistencia**
```bash
npx ts-node scripts/test-consistencia-filtros.ts
```

**Verifica**:
- Filtros SQL funcionan correctamente
- Datos son consistentes entre endpoints
- No hay puestos excluidos incorrectamente

### **Auditoría Completa**
```bash
npx ts-node scripts/auditoria-completa-turnos.ts
```

**Verifica**:
- Estructura de base de datos
- Datos en todas las tablas
- Relaciones entre entidades

---

## 📈 Métricas y KPIs

### **Estadísticas de Instalación**
- **Puestos Creados**: Total de puestos operativos
- **Puestos Asignados**: Puestos con guardia asignado
- **PPCs Pendientes**: Puestos sin asignar
- **Turnos Activos**: Número de turnos con puestos

### **Fórmulas**
```sql
-- Puestos asignados
COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END)

-- PPCs pendientes  
COUNT(CASE WHEN es_ppc = true THEN 1 END)

-- Turnos activos
COUNT(DISTINCT rol_id)
```

---

## 🔄 Mantenimiento y Optimización

### **Índices Recomendados**
```sql
-- Índices para optimizar consultas
CREATE INDEX idx_puestos_operativos_instalacion ON as_turnos_puestos_operativos(instalacion_id);
CREATE INDEX idx_puestos_operativos_rol ON as_turnos_puestos_operativos(rol_id);
CREATE INDEX idx_puestos_operativos_activo ON as_turnos_puestos_operativos(activo);
CREATE INDEX idx_puestos_operativos_ppc ON as_turnos_puestos_operativos(es_ppc, guardia_id);
```

### **Limpieza de Datos**
```sql
-- Marcar puestos inactivos (eliminación lógica)
UPDATE as_turnos_puestos_operativos 
SET activo = false, eliminado_en = NOW() 
WHERE instalacion_id = $1 AND rol_id = $2;
```

---

## 🚀 Mejores Prácticas

### **1. Siempre usar el filtro correcto**
```sql
-- ✅ CORRECTO
WHERE (po.activo = true OR po.activo IS NULL)

-- ❌ INCORRECTO  
WHERE po.activo = true
```

### **2. Validar datos antes de procesar**
```typescript
// Verificar que la instalación existe
const instalacion = await getInstalacion(instalacionId);
if (!instalacion) {
  throw new Error('Instalación no encontrada');
}

// Verificar que el rol existe y está activo
const rol = await getRolServicio(rolId);
if (!rol || rol.estado !== 'Activo') {
  throw new Error('Rol de servicio no válido');
}
```

### **3. Usar transacciones para operaciones críticas**
```typescript
await query('BEGIN');
try {
  // Crear puestos
  await crearPuestos(instalacionId, rolId, cantidad);
  
  // Actualizar estadísticas
  await actualizarEstadisticas(instalacionId);
  
  await query('COMMIT');
} catch (error) {
  await query('ROLLBACK');
  throw error;
}
```

### **4. Logging detallado para debugging**
```typescript
console.log(`[TURNOS] Creando ${cantidad} puestos para instalación ${instalacionId}`);
console.log(`[TURNOS] Rol seleccionado: ${rolId}`);
console.log(`[TURNOS] Puestos creados exitosamente`);
```

---

## 📞 Soporte y Contacto

Para problemas técnicos o consultas sobre el sistema de turnos:

1. **Revisar logs**: Verificar console.log con prefijo `[TURNOS]`
2. **Ejecutar tests**: Usar scripts de auditoría y consistencia
3. **Verificar filtros**: Asegurar uso del filtro correcto en todos los endpoints
4. **Documentar cambios**: Actualizar esta documentación cuando se modifique el sistema

---

**Última actualización**: $(date)  
**Versión del sistema**: 2.0  
**Estado**: ✅ Estable y funcionando correctamente
