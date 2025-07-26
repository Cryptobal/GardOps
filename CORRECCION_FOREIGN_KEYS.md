# Corrección Foreign Keys - Tabla Guardias ✅

## 🔍 **Problema Identificado**

La tabla `guardias` tenía campos de texto plano (`VARCHAR`) para referenciar bancos, AFPs e ISAPREs en lugar de claves foráneas (UUID), lo que impedía el funcionamiento correcto de los selects en el formulario.

### **Estructura Anterior (❌ Problemática)**:
```sql
banco VARCHAR(100)        -- Texto plano
salud VARCHAR(100)        -- Texto plano  
afp VARCHAR(100)          -- Texto plano
```

### **Estructura Corregida (✅ Con Foreign Keys)**:
```sql
banco_id UUID REFERENCES bancos(id)      -- FK a tabla bancos
salud_id UUID REFERENCES isapres(id)     -- FK a tabla isapres
afp_id UUID REFERENCES afps(id)          -- FK a tabla afps
```

## 🚀 **Solución Implementada**

### ✅ **1. Migración de Base de Datos**

#### **Archivo**: `db/migrations/20250726_fix_guardias_foreign_keys.sql`
- ✅ Agregó columnas `banco_id`, `salud_id`, `afp_id` (UUID)
- ✅ Creó foreign keys hacia tablas `bancos`, `isapres`, `afps`
- ✅ Mantuvo columnas VARCHAR anteriores para compatibilidad

#### **Integrada en**: `app/api/migrate-structure/route.ts`
- ✅ **Migración #24** ejecutada exitosamente
- ✅ **Foreign keys** creadas correctamente

### ✅ **2. Actualización del Formulario**

#### **Archivo**: `components/GuardiaForm.tsx`
- ✅ **Interface** actualizada: `banco` → `banco_id`, `salud` → `salud_id`, `afp` → `afp_id`
- ✅ **Campos del formulario** corregidos para usar nuevos nombres
- ✅ **Validaciones** actualizadas para campos con `_id`
- ✅ **Selects** funcionando correctamente con foreign keys

### ✅ **3. API Backend Actualizada**

#### **Archivo**: `app/api/guardias/route.ts`
- ✅ **GET**: JOINs con tablas relacionadas para mostrar nombres descriptivos
- ✅ **POST**: Maneja nuevos campos `banco_id`, `salud_id`, `afp_id`
- ✅ **Validación**: Campos obligatorios actualizados

**Query GET (con JOINs)**:
```sql
SELECT 
  g.*,
  i.nombre as instalacion_nombre,
  b.codigo as banco_codigo,
  b.nombre as banco_nombre,
  isp.nombre as salud_nombre,
  a.nombre as afp_nombre
FROM guardias g
LEFT JOIN instalaciones i ON g.instalacion_id = i.id
LEFT JOIN bancos b ON g.banco_id = b.id
LEFT JOIN isapres isp ON g.salud_id = isp.id
LEFT JOIN afps a ON g.afp_id = a.id
```

### ✅ **4. Verificación de APIs**

- ✅ **GET `/api/bancos`**: 18 bancos oficiales disponibles
- ✅ **GET `/api/afps`**: 6 AFPs disponibles  
- ✅ **GET `/api/isapres`**: 7 ISAPREs (incluye FONASA) disponibles
- ✅ **GET `/api/guardias`**: JOINs funcionando correctamente

## 📊 **Estructura Final de Tabla Guardias**

### **Columnas Foreign Keys (Nuevas)**:

| Columna | Tipo | FK a | Descripción |
|---------|------|------|-------------|
| `banco_id` | UUID | `bancos(id)` | Referencia al banco seleccionado |
| `salud_id` | UUID | `isapres(id)` | Referencia a ISAPRE/FONASA |
| `afp_id` | UUID | `afps(id)` | Referencia a AFP |

### **Foreign Keys Creadas**:
- `guardias_banco_id_fkey`: `banco_id` → `bancos(id)`
- `guardias_salud_id_fkey`: `salud_id` → `isapres(id)`  
- `guardias_afp_id_fkey`: `afp_id` → `afps(id)`

### **Índices**:
- Automáticos en las foreign keys para optimizar JOINs

## 🎯 **Resultados Obtenidos**

### ✅ **Formulario Funcionando**
- **Selects**: Se despliegan correctamente con datos de las APIs
- **Bancos**: Muestran "001 - Banco de Chile", etc.
- **AFPs**: Lista completa de 6 AFPs oficiales
- **ISAPREs**: FONASA aparece primero, luego 6 ISAPREs más

### ✅ **Base de Datos Normalizada**
- **Integridad referencial**: No se pueden crear guardias con IDs inválidos
- **JOINs eficientes**: Consultas optimizadas con foreign keys
- **Mantenimiento**: Cambios en bancos/AFPs/ISAPREs se reflejan automáticamente

### ✅ **APIs Optimizadas**
- **GET guardias**: Devuelve nombres descriptivos via JOINs
- **POST guardias**: Valida foreign keys automáticamente
- **Consistencia**: Todas las APIs siguen formato `{ success, data }`

## 🔧 **Funcionalidad Actual**

### **Crear Guardia**:
1. ✅ Usuario selecciona banco del dropdown (muestra código + nombre)
2. ✅ Usuario selecciona AFP del dropdown (6 opciones)
3. ✅ Usuario selecciona ISAPRE del dropdown (FONASA + 6 más)
4. ✅ Al guardar: se almacenan UUIDs en campos `*_id`
5. ✅ Al listar: se muestran nombres descriptivos via JOINs

### **Compatibilidad**:
- ✅ **Registros antiguos**: Mantienen datos en campos VARCHAR
- ✅ **Registros nuevos**: Usan foreign keys
- ✅ **Migración gradual**: Sin pérdida de datos

## 🎉 **Estado Final**

- ✅ **24 migraciones** ejecutadas exitosamente
- ✅ **Foreign keys** funcionando correctamente  
- ✅ **Formulario** con selects operativos
- ✅ **APIs** optimizadas con JOINs
- ✅ **Base de datos** normalizada y eficiente

¡El problema de los selects vacíos está completamente resuelto! 🎯 