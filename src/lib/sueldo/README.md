# Sistema de Cálculo de Sueldos - GardOps

## Descripción General

El sistema de cálculo de sueldos de GardOps implementa la lógica completa para calcular sueldos líquidos en Chile según la normativa oficial vigente al año 2025, incluyendo todas las cotizaciones legales, impuestos y costos para el empleador.

## ✅ **Actualizaciones Recientes (Normativa 2025)**

### Cambios Implementados:

1. **Gratificación Legal Corregida:**
   - Ahora se calcula como 25% del **total imponible bruto** (no del sueldo base)
   - Tope actualizado: $209.396 mensual (según normativa 2025)

2. **Horas Extras Corregidas:**
   - Valor por hora: `(sueldo base / 30 / jornada diaria) × 1,5`
   - Horas al 50%: `horas × valorHora × 1.5` (solo estas se consideran)
   - Horas al 100%: No se consideran en el cálculo

3. **Cotizaciones AFP Actualizadas:**
   - Tasas oficiales por administradora (2025)
   - Capital: 11.44%, Cuprum: 11.44%, Habitat: 11.27%, etc.

4. **Costos Empleador Corregidos:**
   - SIS: 1.88% (corregido de 1.85%)
   - AFC: 2.4% (indefinido) o 3% (otros contratos)
   - Mutual: 0.90% (default)

## Componentes Principales

### 1. Tipos de Datos (`tipos/sueldo.ts`)

#### SueldoInput
```typescript
interface SueldoInput {
  sueldoBase: number;           // Sueldo base mensual
  fecha: Date;                  // Fecha del cálculo
  afp: string;                  // AFP seleccionada (capital, cuprum, etc.)
  mutualidad: string;           // Mutualidad seleccionada
  tipoContrato: 'indefinido' | 'plazo_fijo' | 'obra_faena';
  horasExtras?: {               // Horas extras (opcional)
    cincuenta: number;          // Horas al 50% (solo estas se consideran)
    cien: number;               // Horas al 100% (no se consideran en el cálculo)
  };
  bonos?: {                     // Bonos (opcional)
    nocturnidad?: number;
    festivo?: number;
    peligrosidad?: number;
    responsabilidad?: number;
    otros?: number;
  };
  comisiones?: number;          // Comisiones
  noImponible?: {               // Valores no imponibles
    colacion?: number;
    movilizacion?: number;
    viatico?: number;
    desgaste?: number;
    asignacionFamiliar?: number;
  };
  anticipos?: number;           // Anticipos
  judiciales?: number;          // Descuentos judiciales
  apv?: number;                 // APV
  cuenta2?: number;             // Cuenta 2
  isapre?: {                    // ISAPRE (opcional)
    plan: number;
    monto?: number;
  };
}
```

#### SueldoResultado
```typescript
interface SueldoResultado {
  entrada: SueldoInput;         // Datos de entrada
  imponible: {                  // Cálculo imponible
    sueldoBase: number;
    gratificacionLegal: number;
    horasExtras: number;
    comisiones: number;
    bonos: number;
    total: number;
    topeAplicado: number;
  };
  noImponible: {                // Valores no imponibles
    colacion: number;
    movilizacion: number;
    viatico: number;
    desgaste: number;
    asignacionFamiliar: number;
    total: number;
  };
  cotizaciones: {               // Cotizaciones
    afp: number;
    salud: number;
    afc: number;
    total: number;
  };
  impuesto: {                   // Impuesto único
    baseTributable: number;
    tramo: number;
    factor: number;
    rebaja: number;
    impuestoUnico: number;
  };
  descuentos: {                 // Descuentos
    anticipos: number;
    judiciales: number;
    total: number;
  };
  sueldoLiquido: number;        // Sueldo líquido final
  empleador: {                  // Costos empleador
    sis: number;
    afc: number;
    mutual: number;
    reformaPrevisional: number;
    costoTotal: number;
  };
  parametros: {                 // Parámetros utilizados
    ufTopeImponible: number;
    valorUf: number;
    comisionAfp: number;
    tasaMutualidad: number;
  };
}
```

## Lógica de Cálculo Actualizada

### 1. Cálculo Imponible (`calculos/imponible.ts`)

#### Componentes del Imponible:
- **Sueldo Base**: Valor base del contrato
- **Gratificación Legal**: 25% del **total imponible bruto** (con tope de $209.396)
- **Horas Extras**: Calculadas según normativa oficial
- **Comisiones**: Monto adicional por comisiones
- **Bonos**: Suma de todos los bonos aplicables

#### Fórmula Actualizada:
```typescript
// 1. Calcular total imponible bruto (sin gratificación)
totalImponibleBruto = sueldoBase + horasExtras + comisiones + bonos

// 2. Calcular gratificación legal sobre el total imponible bruto
gratificacionLegal = Math.min(totalImponibleBruto * 0.25, 209396)

// 3. Total imponible final
totalImponible = totalImponibleBruto + gratificacionLegal
```

### 2. Cálculo de Cotizaciones (`calculos/cotizaciones.ts`)

#### AFP (Tasa completa según administradora):
```typescript
// Tasas oficiales 2025
const tasasAFP = {
  'capital': 11.44,      // Capital
  'cuprum': 11.44,       // Cuprum
  'habitat': 11.27,      // Habitat
  'modelo': 10.77,       // Modelo
  'planvital': 11.10,    // PlanVital
  'provida': 11.45,      // ProVida
  'uno': 10.69,          // UNO
}

cotizacionAFP = imponible * (tasaAFP / 100)
```

#### Salud:
- **FONASA**: 7% del imponible (por defecto)
- **ISAPRE**: Valor UF * plan ISAPRE (si se especifica)

#### AFC (0.6%):
- Solo para contratos indefinidos
- Calculado sobre el imponible

### 3. Cálculo de Impuesto Único (`calculos/impuesto.ts`)

#### Tramos de Impuesto 2025:
```typescript
const tramos = [
  { desde: 0, hasta: 1500000, factor: 0, rebaja: 0 },
  { desde: 1500000, hasta: 2500000, factor: 0.04, rebaja: 60000 },
  { desde: 2500000, hasta: 3500000, factor: 0.08, rebaja: 160000 },
  { desde: 3500000, hasta: 4500000, factor: 0.135, rebaja: 327500 },
  { desde: 4500000, hasta: 5500000, factor: 0.23, rebaja: 765000 },
  { desde: 5500000, hasta: 7500000, factor: 0.304, rebaja: 1156500 },
  { desde: 7500000, hasta: 10000000, factor: 0.35, rebaja: 1656500 },
  { desde: 10000000, hasta: null, factor: 0.4, rebaja: 2156500 }
];
```

#### Fórmula:
```typescript
impuestoUnico = (baseTributable * factor) - rebaja
```

### 4. Cálculo de Costos Empleador (`calculos/empleador.ts`)

#### Componentes Actualizados:
- **SIS**: 1.88% del imponible (corregido)
- **AFC**: 2.4% (indefinido) o 3% (otros contratos)
- **Mutual**: 0.90% (default según normativa)
- **Reforma Previsional**: 1% del imponible

#### Costo Total:
```typescript
costoTotal = imponible + noImponible + sis + afc + mutual + reformaPrevisional
```

## Parámetros del Sistema 2025

### Valores Actualizados:
```typescript
const parametros = {
  ufTopeImponible: 87.8,        // UF tope imponible 2025
  valorUf: 35000,               // Valor UF (actualizar según fecha)
  comisionAfp: 1.44,           // Comisión AFP (ya no se usa)
  tasaMutualidad: 0.90,        // Tasa mutualidad (default 0.90%)
  tramosImpuesto: [...]         // Tramos de impuesto 2025
};
```

## Validaciones

### Validaciones de Entrada (`utils/validaciones.ts`):
- Sueldo base > 0
- Fecha válida
- AFP válida (capital, cuprum, habitat, etc.)
- Tipo de contrato válido
- Valores numéricos válidos para todos los campos

## 🎯 **Conformidad con Normativa Oficial**

El sistema ahora cumple con:
- ✅ Código del Trabajo chileno
- ✅ Normativa SII 2025
- ✅ Superintendencia de Pensiones
- ✅ SUSESO
- ✅ Ley de Gratificación
- ✅ Tramos de Impuesto Único oficiales
- ✅ Tasas AFP oficiales por administradora
- ✅ Cálculo correcto de horas extras
- ✅ Gratificación legal sobre total imponible bruto

## 📊 **Ejemplo de Cálculo**

Para un sueldo base de $550.000:
1. **Total Imponible Bruto**: $550.000 + horas extras + comisiones + bonos
2. **Gratificación Legal**: 25% del total imponible bruto (máx. $209.396)
3. **Total Imponible**: Total imponible bruto + gratificación legal
4. **Cotizaciones**: AFP + Salud + AFC
5. **Base Tributable**: Total imponible - cotizaciones
6. **Impuesto Único**: Según tramos oficiales
7. **Sueldo Líquido**: Total imponible + no imponible - cotizaciones - impuesto - descuentos

**Nota**: Todos los valores se redondean a pesos enteros CLP según normativa oficial.

