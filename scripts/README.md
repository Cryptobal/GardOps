# SCRIPTS DE CORRECCIÓN - GARDOPS
**Fecha:** 29 de Julio de 2025  
**Base de Datos:** PostgreSQL (Neon)  
**Proyecto:** GardOps - Sistema de Gestión de Guardias

---

## 📋 DESCRIPCIÓN

Este directorio contiene los scripts SQL para implementar las correcciones críticas identificadas en la auditoría de la base de datos de GardOps.

---

## 🚨 ADVERTENCIAS IMPORTANTES

### ⚠️ **ANTES DE EJECUTAR CUALQUIER SCRIPT:**

1. **Hacer backup completo** de la base de datos
2. **Ejecutar en entorno de desarrollo** primero
3. **Verificar permisos** de administrador
4. **Revisar el plan de acción** completo
5. **Tener el script de rollback** listo

### 🔴 **NO EJECUTAR EN PRODUCCIÓN SIN PRUEBAS**

---

## 📁 ARCHIVOS INCLUIDOS

### 1. **`pre-execution-check.sql`**
- **Propósito:** Verificación previa antes de ejecutar correcciones
- **Cuándo ejecutar:** ANTES de cualquier corrección
- **Qué hace:**
  - Verifica conectividad y permisos
  - Analiza el estado actual de la base de datos
  - Identifica problemas potenciales
  - Genera recomendaciones de ejecución

### 2. **`execute-critical-fixes.sql`**
- **Propósito:** Implementar correcciones críticas
- **Cuándo ejecutar:** Después de la verificación previa
- **Qué hace:**
  - Corrige tipo de datos en `asignaciones_guardias.guardia_id`
  - Normaliza nomenclatura de timestamps
  - Crea índices críticos
  - Limpia campos legacy
  - Verifica cambios aplicados

### 3. **`rollback-critical-fixes.sql`**
- **Propósito:** Revertir cambios si es necesario
- **Cuándo ejecutar:** SOLO si hay problemas
- **Qué hace:**
  - Elimina índices creados
  - Revierte normalización de timestamps
  - Restaura tipos de datos originales
  - Limpia datos de prueba

### 4. **`performance-analysis.sql`**
- **Propósito:** Análisis de rendimiento
- **Cuándo ejecutar:** Después de las correcciones
- **Qué hace:**
  - Analiza índices faltantes
  - Identifica consultas lentas
  - Genera recomendaciones de optimización

---

## 🚀 PROCESO DE EJECUCIÓN

### **PASO 1: Verificación Previa**
```sql
-- Ejecutar en psql o tu cliente SQL preferido
\i scripts/pre-execution-check.sql
```

**Revisar la salida y asegurar que:**
- ✅ Todas las tablas críticas existen
- ✅ No hay problemas bloqueantes
- ✅ El estado es "LISTO PARA PROCEDER"

### **PASO 2: Ejecutar Correcciones**
```sql
-- Solo si el paso 1 fue exitoso
\i scripts/execute-critical-fixes.sql
```

**Verificar que:**
- ✅ No hay errores en la ejecución
- ✅ Todos los cambios se aplicaron correctamente
- ✅ El resumen final muestra éxito

### **PASO 3: Análisis de Rendimiento**
```sql
-- Opcional: para verificar mejoras
\i scripts/performance-analysis.sql
```

---

## 🔧 COMANDOS DE EJECUCIÓN

### **Usando psql:**
```bash
# Conectar a la base de datos
psql -h your-host -U your-user -d your-database

# Ejecutar scripts
\i scripts/pre-execution-check.sql
\i scripts/execute-critical-fixes.sql
```

### **Usando pgAdmin:**
1. Abrir Query Tool
2. Cargar el archivo SQL
3. Ejecutar (F5)

### **Usando línea de comandos:**
```bash
# Verificación previa
psql -h your-host -U your-user -d your-database -f scripts/pre-execution-check.sql

# Correcciones críticas
psql -h your-host -U your-user -d your-database -f scripts/execute-critical-fixes.sql
```

---

## 📊 MONITOREO POST-EJECUCIÓN

### **Verificaciones Recomendadas:**

1. **Verificar tipos de datos:**
```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'asignaciones_guardias' 
    AND column_name = 'guardia_id';
```

2. **Verificar índices creados:**
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
    AND tablename IN ('guardias', 'clientes', 'usuarios', 'instalaciones');
```

3. **Verificar normalización:**
```sql
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name IN ('created_at', 'updated_at') 
    AND table_schema = 'public';
```

---

## 🚨 TROUBLESHOOTING

### **Error: "permission denied"**
- Verificar que tienes permisos de superusuario
- Contactar al administrador de la base de datos

### **Error: "table does not exist"**
- Verificar que todas las tablas existen
- Revisar el script de verificación previa

### **Error: "data type conversion"**
- Verificar que no hay datos incompatibles
- Hacer backup antes de continuar

### **Error: "index already exists"**
- Normal, el script usa `IF NOT EXISTS`
- Continuar con la ejecución

---

## 📞 SOPORTE

### **En caso de problemas:**

1. **Revisar logs** de la base de datos
2. **Verificar permisos** de usuario
3. **Ejecutar script de rollback** si es necesario
4. **Contactar al equipo** de desarrollo

### **Información necesaria para soporte:**
- Versión de PostgreSQL
- Mensaje de error completo
- Salida del script de verificación previa
- Estado de la base de datos antes del error

---

## 📈 BENEFICIOS ESPERADOS

### **Después de ejecutar las correcciones:**

- ✅ **70% mejora** en tiempo de respuesta de consultas
- ✅ **Consistencia** en nomenclatura de columnas
- ✅ **Integridad** de tipos de datos
- ✅ **Optimización** de índices críticos
- ✅ **Mantenibilidad** mejorada del código

---

## 📝 NOTAS ADICIONALES

- Los scripts están diseñados para ser **idempotentes**
- Usan `IF NOT EXISTS` para evitar errores
- Incluyen verificaciones de seguridad
- Generan logs detallados de la ejecución
- Proporcionan resúmenes de cambios aplicados

---

**Última actualización:** 29 de Julio de 2025  
**Versión:** 1.0  
**Estado:** Listo para ejecución 