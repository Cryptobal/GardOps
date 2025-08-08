# 📊 RESUMEN EJECUTIVO - MÓDULO PAYROLL GARDOPS

## 🎯 Vista Rápida del Sistema

### ¿Qué hace el módulo?
El módulo de payroll de GardOps calcula automáticamente los sueldos de los guardias de seguridad cumpliendo con la normativa chilena 2025, incluyendo:
- Cotizaciones previsionales (AFP, Salud, AFC)
- Impuesto único
- Bonos y asignaciones
- Turnos extras
- Costos del empleador

---

## 🔑 Conceptos Clave

### 1. **Estructura de Sueldo**
Cada combinación **Instalación + Rol de Servicio** tiene una estructura que define:
- **Sueldo base:** Monto base mensual
- **Bonos:** Colación, movilización, responsabilidad, nocturnidad, etc.

### 2. **Asignación de Guardias**
```
Instalación "Mall Arauco" 
    → Rol "Turno 4x4x12 Diurno" 
        → 4 Puestos Operativos 
            → Guardia "Juan Pérez" en Puesto 1
```

### 3. **Flujo de Cálculo**
```
Sueldo Base → (+) Bonos → (+) Horas Extras → (+) Turnos Extras
    ↓
Imponible (con tope 87.8 UF)
    ↓
(-) AFP → (-) Salud → (-) AFC → (-) Impuesto
    ↓
SUELDO LÍQUIDO
```

---

## 💡 Cómo Funciona

### Paso 1: Configuración Inicial
1. Crear **estructura de sueldo** para cada instalación/rol
2. Definir **bonos** aplicables
3. Asignar **guardia a puesto operativo**

### Paso 2: Cálculo Mensual
1. Sistema obtiene:
   - Datos del guardia (AFP, ISAPRE, banco)
   - Estructura de sueldo según su rol
   - Turnos extras trabajados
   - Horas extras registradas

2. Calcula automáticamente:
   - Valores imponibles y no imponibles
   - Cotizaciones legales
   - Impuesto único
   - Descuentos
   - **Sueldo líquido final**

### Paso 3: Generación de Planilla
1. Procesa todos los guardias activos
2. Guarda historial de cálculos
3. Marca turnos extras como pagados

---

## 📋 Tablas Principales

| Tabla | Función |
|-------|---------|
| `sueldo_estructuras_servicio` | Define sueldo base y bonos por rol |
| `sueldo_bonos_globales` | Catálogo de tipos de bonos |
| `as_turnos_puestos_operativos` | Asignación guardia ↔ puesto |
| `turnos_extras` | Registro de turnos adicionales |
| `sueldo_historial_calculos` | Historial de sueldos calculados |

---

## 🔍 Ejemplo Práctico

**Guardia:** Juan Pérez  
**Instalación:** Mall Parque Arauco  
**Rol:** Turno 4x4x12 Nocturno  

### Estructura Asignada:
- Sueldo base: $650,000
- Bono nocturnidad: $50,000 (imponible)
- Colación: $80,000 (no imponible)
- Movilización: $60,000 (no imponible)

### Mes: Enero 2025
- Turnos extras: 3 ($45,000 c/u = $135,000)
- Horas extras 50%: 10 horas

### Cálculo:
```
Imponible:
  Sueldo base:        $650,000
  Bono nocturnidad:    $50,000
  Turnos extras:      $135,000
  Horas extras:        $37,879
  Gratificación:      $218,220 (limitada a $209,396)
  Total imponible:  $1,082,275

No Imponible:
  Colación:           $80,000
  Movilización:       $60,000
  Total:             $140,000

Descuentos:
  AFP Capital:       $123,812
  FONASA 7%:          $75,759
  AFC:                 $6,494
  Impuesto único:     $71,953

SUELDO LÍQUIDO:    $1,044,257
```

---

## ⚙️ Parámetros del Sistema 2025

| Parámetro | Valor |
|-----------|-------|
| Sueldo Mínimo | $529,000 |
| Tope Imponible | 87.8 UF |
| Tope Gratificación | $209,396/mes |
| Jornada Semanal | 44 horas |
| FONASA | 7% |
| SIS (empleador) | 1.88% |
| AFC Trabajador | 0.6% |
| AFC Empleador | 2.4% |

---

## 🚀 Ventajas del Sistema

✅ **Automatizado:** Cálculo sin intervención manual  
✅ **Preciso:** Cumple normativa chilena actualizada  
✅ **Flexible:** Bonos configurables por instalación/rol  
✅ **Trazable:** Historial completo de cálculos  
✅ **Integrado:** Conecta turnos, bonos y planillas  

---

## 📌 Puntos de Atención

⚠️ **Configuración previa:** Requiere estructura de sueldo definida  
⚠️ **Turnos extras:** Deben estar aprobados antes del cálculo  
⚠️ **Actualización normativa:** Revisar parámetros anualmente  

---

## 📞 Flujo de Trabajo Recomendado

1. **Inicio de mes:** Verificar estructuras de sueldo actualizadas
2. **Durante el mes:** Registrar turnos extras y horas extras
3. **Fin de mes:** 
   - Aprobar turnos extras pendientes
   - Generar planilla de sueldos
   - Revisar y aprobar cálculos
   - Procesar pagos
4. **Post-pago:** Marcar turnos como pagados

---

**Sistema diseñado para:** Empresas de seguridad privada en Chile  
**Capacidad:** Manejo de múltiples instalaciones y cientos de guardias  
**Actualizado:** Enero 2025 con normativa vigente
