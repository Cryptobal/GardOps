# 📋 LÓGICA DE PERMISOS PARA CÁLCULO DE SUELDOS - GARDOPS

**Fecha de Actualización:** Enero 2025  
**Módulo:** Payroll - GardOps

---

## 🎯 **RESUMEN EJECUTIVO**

Se ha implementado la lógica correcta para el cálculo de sueldos según los diferentes tipos de permisos y ausencias del guardia. La lógica distingue claramente entre días que se pagan, días que no se pagan, y días que se descuentan.

---

## 📊 **TIPOS DE PERMISOS Y SU IMPACTO EN EL SUELDO**

### **✅ DÍAS PAGABLES (Se pagan aunque el trabajador no asista)**

| Tipo | Descripción | Impacto en Sueldo | Asistencia |
|------|-------------|-------------------|------------|
| **Trabajado** | Días confirmados como asistidos | ✅ Se pagan | ✅ Asiste |
| **Vacaciones** | Períodos de vacaciones anuales | ✅ Se pagan | ❌ No asiste |
| **Permiso con Goce** | Permisos que mantienen remuneración | ✅ Se pagan | ❌ No asiste |

### **❌ DÍAS NO PAGABLES (No se pagan)**

| Tipo | Descripción | Impacto en Sueldo | Asistencia |
|------|-------------|-------------------|------------|
| **Libre** | Días libres del turno | ❌ No se pagan | ❌ No asiste |
| **Licencia** | Licencias médicas o administrativas | ❌ No se pagan | ❌ No asiste |
| **Permiso sin Goce** | Permisos sin remuneración | ❌ No se pagan | ❌ No asiste |
| **Planificado** | Días asignados pero no confirmados | ❌ No se pagan | ⚠️ Pendiente |

### **💸 DÍAS DESCONTABLES (Se descuentan del sueldo)**

| Tipo | Descripción | Impacto en Sueldo | Asistencia |
|------|-------------|-------------------|------------|
| **Inasistencia** | Días no asistidos sin justificación | 💸 Se descuentan | ❌ No asiste |

---

## 🧮 **FÓRMULAS DE CÁLCULO**

### **Días Pagables:**
```typescript
diasPagables = diasTrabajados + diasVacaciones + diasPermisoConGoce
```

### **Días No Pagables:**
```typescript
diasNoPagables = diasLibre + diasLicencia + diasPermisoSinGoce + diasPlanificados
```

### **Días Descontables:**
```typescript
diasDescontables = diasInasistencia
```

### **Cálculo de Sueldo Base:**
```typescript
// Solo se descuentan las inasistencias
sueldoBaseAjustado = sueldoBase - (sueldoBase / 30 * diasDescontables)
```

---

## 🔄 **FLUJO DE PROCESAMIENTO**

### **1. Registro de Permisos (Ficha del Guardia)**
```
Usuario ingresa permiso → Se actualiza pauta mensual → Estado específico
```

### **2. Cálculo de Días (Payroll)**
```
Pauta mensual → Función obtenerResumenDiasGuardiaMes() → Categorización automática
```

### **3. Cálculo de Sueldo**
```
Días categorizados → Solo inasistencias se descuentan → Sueldo final
```

---

## 📋 **IMPLEMENTACIÓN TÉCNICA**

### **Función Principal:**
```typescript
export async function obtenerResumenDiasGuardiaMes(
  guardiaId: string | number,
  mes: number,
  anio: number
): Promise<{
  diasTrabajados: number;
  diasPlanificados: number;
  diasAusencia: number;
  diasLibre: number;
  diasPermiso: number;
  diasLicencia: number;
  diasVacaciones: number;
  totalDias: number;
  // Nuevos campos para cálculo de sueldo
  diasPagables: number;
  diasNoPagables: number;
  diasDescontables: number;
}>
```

### **Consulta SQL:**
```sql
SELECT 
  COUNT(CASE WHEN estado = 'trabajado' THEN 1 END) AS dias_trabajados,
  COUNT(CASE WHEN estado = 'vacaciones' THEN 1 END) AS dias_vacaciones,
  COUNT(CASE WHEN estado = 'permiso_con_goce' THEN 1 END) AS dias_permiso_con_goce,
  COUNT(CASE WHEN estado = 'licencia' THEN 1 END) AS dias_licencia,
  COUNT(CASE WHEN estado = 'permiso_sin_goce' THEN 1 END) AS dias_permiso_sin_goce,
  COUNT(CASE WHEN estado = 'inasistencia' THEN 1 END) AS dias_ausencia,
  -- ... otros estados
FROM as_turnos_pauta_mensual
WHERE guardia_id = $1 AND mes = $2 AND anio = $3
```

---

## 🎨 **INTERFAZ DE USUARIO**

### **Componente ResumenDiasGuardia:**

#### **Sección de Cálculo de Sueldo:**
- **Días Pagables** (verde): Trabajados + Vacaciones + Permisos con Goce
- **Días No Pagables** (amarillo): Libres + Licencias + Permisos sin Goce + Planificados
- **Días Descontables** (rojo): Inasistencias

#### **Métricas Mostradas:**
- Conteo por tipo de día
- Porcentajes calculados automáticamente
- Explicación clara del impacto en sueldo

---

## ⚠️ **CASOS ESPECIALES**

### **1. Días Planificados:**
- **Estado:** `'planificado'`
- **Impacto:** No se pagan hasta confirmar como `'trabajado'`
- **Acción:** Confirmar desde pauta diaria

### **2. Permisos Mixtos:**
- **Permiso con Goce:** Se pagan aunque no asista
- **Permiso sin Goce:** No se pagan y no asiste
- **Distinción:** Se maneja por estado específico

### **3. Vacaciones vs Licencias:**
- **Vacaciones:** Se pagan (derecho laboral)
- **Licencias:** No se pagan (situación médica/administrativa)

---

## 🔧 **VALIDACIONES Y CONTROLES**

### **Validaciones Implementadas:**
1. ✅ Estados válidos en base de datos
2. ✅ Cálculo correcto de días pagables
3. ✅ Distinción clara entre tipos de permisos
4. ✅ Solo inasistencias se descuentan del sueldo

### **Controles de Calidad:**
1. ✅ Script de corrección de estados
2. ✅ Validación de integridad de datos
3. ✅ Reportes de estadísticas
4. ✅ Interfaz de usuario clara

---

## 📈 **BENEFICIOS DE LA IMPLEMENTACIÓN**

### **Para el Usuario:**
- ✅ **Claridad total** en el impacto de cada tipo de permiso
- ✅ **Cálculo automático** de días pagables vs no pagables
- ✅ **Interfaz intuitiva** con colores y explicaciones
- ✅ **Transparencia** en el cálculo de sueldos

### **Para el Sistema:**
- ✅ **Lógica consistente** en todo el módulo payroll
- ✅ **Cálculos precisos** sin errores de interpretación
- ✅ **Base sólida** para futuras mejoras
- ✅ **Auditoría completa** de días trabajados

---

## 🎯 **CONCLUSIÓN**

La implementación de la lógica correcta de permisos asegura que:

1. **Solo las inasistencias** se descuenten del sueldo
2. **Las vacaciones y permisos con goce** se paguen correctamente
3. **Las licencias y permisos sin goce** no afecten el sueldo
4. **El usuario tenga visibilidad completa** del impacto de cada tipo de día

**El módulo Payroll ahora calcula correctamente los sueldos según la normativa laboral chilena.** 🎉
