# 📊 AUDITORÍA COMPLETA DEL MÓDULO DE PAYROLL - GARDOPS

**Fecha de Auditoría:** Enero 2025  
**Sistema:** GardOps - Sistema de Gestión de Guardias de Seguridad  
**Módulo:** Payroll (Nómina y Sueldos)

---

## 📋 RESUMEN EJECUTIVO

El módulo de payroll de GardOps es un sistema integral de cálculo de sueldos que cumple con la normativa chilena vigente 2025. El sistema gestiona:

- **Cálculo de sueldos** según normativa chilena actualizada
- **Gestión de bonos** imponibles y no imponibles
- **Asignación de estructuras de servicio** a guardias
- **Integración con turnos extras** y planillas mensuales
- **Cálculo automático** de cotizaciones previsionales e impuestos

---

## 🗄️ 1. ESTRUCTURA DE BASES DE DATOS DEL MÓDULO DE SUELDOS

### 1.1 Tablas de Configuración Base

#### **sueldo_afp** - Administradoras de Fondos de Pensiones
```sql
- id: SERIAL PRIMARY KEY
- codigo: VARCHAR(50) UNIQUE (capital, cuprum, habitat, etc.)
- nombre: VARCHAR(100)
- tasa_cotizacion: DECIMAL(5,2) -- Incluye SIS
- comision: DECIMAL(5,2)
- sis: DECIMAL(5,2) DEFAULT 1.88
- activo: BOOLEAN
- fecha_vigencia: DATE
```
**Tasas 2025:** Capital 11.44%, Cuprum 11.44%, Habitat 11.27%, Modelo 10.77%

#### **sueldo_isapre** - Instituciones de Salud Previsional
```sql
- id: SERIAL PRIMARY KEY
- codigo: VARCHAR(50) UNIQUE
- nombre: VARCHAR(100)
- activo: BOOLEAN
```
Incluye: FONASA, Banmédica, Consalud, Colmena, Cruz Blanca, Nueva Masvida, Vida Tres

#### **sueldo_mutualidad** - Mutuales de Seguridad
```sql
- id: SERIAL PRIMARY KEY
- codigo: VARCHAR(50) UNIQUE
- nombre: VARCHAR(100)
- tasa_base: DECIMAL(5,2) DEFAULT 0.90
- tasa_adicional: DECIMAL(5,2) DEFAULT 0.00
```
Incluye: ACHS, Mutual de Seguridad, IST, ISL

#### **sueldo_parametros_generales** - Parámetros del Sistema
```sql
- parametro: VARCHAR(100) UNIQUE
- valor: DECIMAL(15,2)
- descripcion: TEXT
- fecha_vigencia: DATE
```
**Parámetros clave 2025:**
- UF_TOPE_IMPONIBLE: 87.80 UF
- INGRESO_MINIMO: $529,000
- TOPE_GRATIFICACION_MENSUAL: $209,396
- TASA_FONASA: 7%
- HORAS_SEMANALES_JORNADA: 44 (hasta 2026), 42 (hasta 2028), 40 (desde 2028)

#### **sueldo_tramos_impuesto** - Tramos de Impuesto Único
```sql
- tramo: INTEGER
- desde: DECIMAL(15,2)
- hasta: DECIMAL(15,2) -- NULL para último tramo
- factor: DECIMAL(5,4)
- rebaja: DECIMAL(15,2)
```
8 tramos desde exento hasta 40% para ingresos > $10,000,000

#### **sueldo_valor_uf** - Valores UF Mensuales
```sql
- fecha: DATE UNIQUE
- valor: DECIMAL(15,2)
```

### 1.2 Tablas de Estructuras de Servicio

#### **sueldo_estructuras_servicio** - Estructuras por Instalación y Rol
```sql
- id: UUID PRIMARY KEY
- instalacion_id: UUID REFERENCES instalaciones(id)
- rol_servicio_id: UUID REFERENCES as_turnos_roles_servicio(id)
- sueldo_base: INTEGER DEFAULT 0
- bono_id: UUID REFERENCES sueldo_bonos_globales(id)
- monto: INTEGER
- activo: BOOLEAN DEFAULT true
- fecha_inactivacion: TIMESTAMP NULL
```
**Constraint:** UNIQUE(instalacion_id, rol_servicio_id, bono_id)

#### **sueldo_bonos_globales** - Catálogo de Bonos
```sql
- id: UUID PRIMARY KEY
- nombre: VARCHAR(100) UNIQUE
- descripcion: TEXT
- imponible: BOOLEAN DEFAULT true
- activo: BOOLEAN DEFAULT true
```
**Bonos básicos:** Colación (no imponible), Movilización (no imponible), Responsabilidad (imponible)

#### **sueldo_historial_estructuras** - Historial de Cambios
```sql
- id: UUID PRIMARY KEY
- estructura_id: UUID
- accion: VARCHAR(50)
- fecha_accion: TIMESTAMP
- detalles: TEXT
- datos_anteriores: JSONB
- datos_nuevos: JSONB
```

### 1.3 Tablas de Historial de Cálculos

#### **sueldo_historial_calculos** - Registro de Cálculos Realizados
```sql
- id: SERIAL PRIMARY KEY
- guardia_id: INTEGER
- fecha_calculo: DATE
- mes_periodo: INTEGER
- anio_periodo: INTEGER
- sueldo_base: DECIMAL(15,2)
- total_imponible: DECIMAL(15,2)
- total_no_imponible: DECIMAL(15,2)
- sueldo_liquido: DECIMAL(15,2)
- empleador_total: DECIMAL(15,2)
```

---

## 🧮 2. LÓGICA DE CÁLCULO DE SUELDOS

### 2.1 Flujo Principal de Cálculo (`calcularSueldo()`)

```typescript
1. Validar entrada (SueldoInput)
2. Obtener parámetros desde BD (UF, AFP, tramos impuesto)
3. Calcular valores IMPONIBLES:
   - Sueldo base ajustado (descuentos por ausencias)
   - Horas extras (solo 50%, excluye 100%)
   - Comisiones
   - Bonos imponibles
   - Gratificación legal (25% del total imponible, tope $209,396)
   - Aplicar tope imponible (87.8 UF)

4. Calcular valores NO IMPONIBLES:
   - Colación
   - Movilización
   - Viático
   - Asignación familiar

5. Calcular COTIZACIONES:
   - AFP (según tabla, ej: Capital 11.44%)
   - Salud (FONASA 7% o ISAPRE plan UF)
   - AFC (0.6% trabajador indefinido)

6. Calcular IMPUESTO ÚNICO:
   - Base tributable = Imponible - Cotizaciones
   - Aplicar tabla de tramos

7. Calcular DESCUENTOS:
   - Anticipos
   - Descuentos judiciales
   - APV
   - Cuenta 2

8. Calcular SUELDO LÍQUIDO:
   Imponible + No Imponible - Cotizaciones - Impuesto - Descuentos

9. Calcular COSTOS EMPLEADOR:
   - SIS: 1.88%
   - AFC: 2.4% (indefinido) o 3% (plazo fijo)
   - Mutual: 0.90%
   - Reforma previsional: 1%

10. Redondear y retornar resultado
```

### 2.2 Cálculos Específicos

#### **Horas Extras**
```typescript
jornadaSemanal = 44 horas (2024-2026)
jornadaDiaria = jornadaSemanal / 5
valorHora = (sueldoBase / 30 / jornadaDiaria) × 1.5
horasExtras50 = horas × valorHora × 1.5
// Horas al 100% NO se incluyen en el cálculo
```

#### **Gratificación Legal**
```typescript
gratificacion = totalImponibleBruto × 0.25
// Tope mensual: $209,396
gratificacionFinal = Math.min(gratificacion, 209396)
```

#### **Tope Imponible**
```typescript
topeImponible = 87.8 × valorUF
totalImponible = Math.min(totalAntesTope, topeImponible)
```

---

## 💰 3. SISTEMA DE BONOS Y SU GENERACIÓN

### 3.1 Tipos de Bonos

#### **Bonos Imponibles** (afectan cotizaciones)
- Bono de Responsabilidad
- Bono de Nocturnidad
- Bono Festivo
- Bono de Peligrosidad
- Turnos Extras (calculados como bono)

#### **Bonos No Imponibles** (no afectan cotizaciones)
- Colación
- Movilización
- Viático
- Desgaste de herramientas
- Asignación Familiar

### 3.2 Asignación de Bonos

Los bonos se asignan a nivel de **estructura de servicio** (combinación instalación + rol):

```sql
-- Un guardia recibe bonos según su rol en la instalación
sueldo_estructuras_servicio:
  - instalacion_id: "Mall Parque Arauco"
  - rol_servicio_id: "Turno 4x4x12 Nocturno"
  - bono_id: "Bono Nocturnidad"
  - monto: 50000
```

### 3.3 Integración con Planillas

```typescript
// En calcularSueldoGuardiaPlanilla()
bonos = {
  nocturnidad: obtenerDesdeEstructura(),
  responsabilidad: obtenerDesdeEstructura(),
  otros: turnosExtras.valorTotal // Turnos extras como bono
}
```

---

## 👥 4. LÓGICA DE ASIGNACIÓN DE ESTRUCTURAS DE SERVICIO

### 4.1 Modelo de Asignación

```
INSTALACIÓN → ROLES DE SERVICIO → PUESTOS OPERATIVOS → GUARDIAS
     ↓                ↓                    ↓                ↓
"Mall Arauco" → "4x4x12 Diurno" → "Puesto 1-4" → "Juan Pérez"
                      ↓
            ESTRUCTURA DE SUELDO
            (Sueldo base + Bonos)
```

### 4.2 Tabla Central: `as_turnos_puestos_operativos`

```sql
- id: UUID PRIMARY KEY
- instalacion_id: UUID -- Instalación asignada
- rol_id: UUID -- Rol de servicio (turno)
- guardia_id: UUID -- Guardia asignado (NULL = PPC)
- nombre_puesto: VARCHAR(255)
- es_ppc: BOOLEAN -- true = Puesto Por Cubrir
- activo: BOOLEAN
```

### 4.3 Flujo de Asignación

1. **Crear Rol de Servicio** en instalación (ej: "4x4x12 con 4 puestos")
2. **Generar Puestos Operativos** automáticamente (4 registros)
3. **Asignar Guardias** a puestos:
   - Si `guardia_id != NULL` → Puesto cubierto
   - Si `guardia_id = NULL` → PPC (Puesto Por Cubrir)
4. **Estructura de Sueldo** se aplica según rol_servicio_id

### 4.4 Consulta de Asignación Actual

```sql
SELECT 
  po.guardia_id,
  i.nombre as instalacion,
  rs.nombre as rol,
  es.sueldo_base,
  -- Bonos agregados
FROM as_turnos_puestos_operativos po
JOIN instalaciones i ON po.instalacion_id = i.id
JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
JOIN sueldo_estructuras_servicio es 
  ON es.instalacion_id = po.instalacion_id
  AND es.rol_servicio_id = po.rol_id
WHERE po.guardia_id IS NOT NULL
```

---

## 🔄 5. INTEGRACIÓN CON TURNOS EXTRAS Y PLANILLAS

### 5.1 Tabla de Turnos Extras

#### **turnos_extras** (TE_turnos_extras)
```sql
- id: UUID PRIMARY KEY
- guardia_id: UUID
- instalacion_id: UUID
- puesto_id: UUID
- fecha: DATE
- estado: VARCHAR(20) -- 'reemplazo' o 'ppc'
- valor: DECIMAL(10,2)
- pagado: BOOLEAN DEFAULT FALSE
- fecha_pago: DATE NULL
```

### 5.2 Cálculo de Turnos Extras en Planilla

```typescript
// calcularTurnosExtrasMes()
SELECT COUNT(*) as cantidad,
       SUM(valor) as valor_total
FROM TE_turnos_extras
WHERE guardia_id = ?
  AND EXTRACT(MONTH FROM fecha) = ?
  AND estado IN ('aprobado', 'pagado')

// Los turnos extras se suman como "bono otros"
sueldoInput.bonos.otros = turnosExtras.valorTotal
```

### 5.3 Flujo de Planilla Mensual

```typescript
1. generarPlanillaSueldos(mes, año)
   ↓
2. Para cada guardia activo:
   - obtenerDatosGuardia()
   - calcularTurnosExtrasMes()
   - calcularHorasExtrasMes()
   - obtenerBonosGuardia()
   ↓
3. calcularSueldo(sueldoInput)
   ↓
4. guardarHistorialCalculo()
   ↓
5. marcarTurnosExtrasComoPagados()
```

### 5.4 Estados del Proceso

```
TURNO EXTRA → APROBADO → EN PLANILLA → PAGADO
     ↓           ↓            ↓           ↓
"Reemplazo" → "Validado" → "Calculado" → "Pagado"
```

---

## 📊 6. RESUMEN DE RELACIONES CLAVE

### 6.1 Guardia ↔ Estructura de Sueldo

```
GUARDIA → PUESTO OPERATIVO → ROL SERVICIO → ESTRUCTURA SUELDO
                ↓                  ↓              ↓
          instalacion_id    rol_servicio_id   sueldo_base
                                               + bonos
```

### 6.2 Cálculo Mensual

```
GUARDIA → DATOS BASE → TURNOS EXTRAS → BONOS → CÁLCULO → PLANILLA
           ↓              ↓              ↓        ↓          ↓
      sueldo_base    valor_total    estructura  líquido  historial
```

### 6.3 Jerarquía de Configuración

```
GLOBAL          →    INSTALACIÓN    →    ROL SERVICIO    →    GUARDIA
  ↓                      ↓                    ↓                  ↓
Parámetros         Valor turno         Estructura         Asignación
(UF, AFP)            extra              (base+bonos)        actual
```

---

## 🔍 7. PUNTOS CRÍTICOS Y OBSERVACIONES

### 7.1 Fortalezas del Sistema

✅ **Normativa actualizada:** Cumple con legislación chilena 2025  
✅ **Modular:** Separación clara entre configuración y cálculo  
✅ **Trazabilidad:** Historial completo de cálculos y cambios  
✅ **Flexible:** Bonos configurables por instalación/rol  
✅ **Integrado:** Conexión directa con turnos extras y planillas  

### 7.2 Áreas de Atención

⚠️ **Dependencias de datos:** Requiere configuración completa de estructuras  
⚠️ **Complejidad de bonos:** Múltiples fuentes (estructura, turnos extras, configuración)  
⚠️ **Sincronización:** Cambios en asignaciones deben reflejarse en planillas  

### 7.3 Recomendaciones

1. **Validación previa:** Verificar estructura completa antes de calcular
2. **Auditoría mensual:** Revisar turnos extras antes de generar planilla
3. **Respaldos:** Mantener historial de cálculos para auditorías
4. **Documentación:** Actualizar al cambiar normativa o parámetros

---

## 📈 8. MÉTRICAS Y MONITOREO

### Indicadores Clave

- **Guardias con estructura asignada:** % con sueldo base definido
- **Turnos extras pendientes:** Cantidad sin procesar por mes
- **Cálculos exitosos:** % de planillas sin errores
- **Tiempo promedio de cálculo:** Por guardia/planilla completa

### Queries de Verificación

```sql
-- Guardias sin estructura de sueldo
SELECT COUNT(*) FROM guardias g
WHERE NOT EXISTS (
  SELECT 1 FROM as_turnos_puestos_operativos po
  JOIN sueldo_estructuras_servicio es 
    ON es.rol_servicio_id = po.rol_id
  WHERE po.guardia_id = g.id
)

-- Turnos extras pendientes de pago
SELECT COUNT(*), SUM(valor) 
FROM TE_turnos_extras
WHERE pagado = false 
  AND estado = 'aprobado'
```

---

## 📝 CONCLUSIÓN

El módulo de payroll de GardOps es un sistema robusto y completo que integra:

1. **Cálculo normativo** según legislación chilena
2. **Gestión flexible** de bonos y estructuras
3. **Asignación dinámica** de guardias a roles
4. **Integración completa** con operaciones diarias

El sistema está preparado para manejar la complejidad del cálculo de sueldos en el sector de seguridad privada, con especial atención a turnos extras, bonos variables y cumplimiento normativo.

---

**Documento preparado por:** Sistema de Auditoría GardOps  
**Versión:** 1.0  
**Última actualización:** Enero 2025
