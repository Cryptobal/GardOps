# Migración de PPCs a Formato Individual

## Problema Identificado

Anteriormente, cuando se creaba un turno con múltiples guardias (ej: 3 guardias), se creaba **1 solo PPC** con `cantidad_faltante = 3`. Esto causaba problemas en la visualización porque:

- Solo se mostraba 1 PPC en la interfaz
- No se podía asignar guardias individualmente a cada puesto
- La gestión de puestos por cubrir no era granular

## Solución Implementada

### 1. Cambios en la Base de Datos

**Antes:**
```sql
-- 1 PPC con cantidad_faltante = 3
INSERT INTO puestos_por_cubrir (cantidad_faltante) VALUES (3);
```

**Después:**
```sql
-- 3 PPCs individuales con cantidad_faltante = 1 cada uno
INSERT INTO puestos_por_cubrir (cantidad_faltante) VALUES (1);
INSERT INTO puestos_por_cubrir (cantidad_faltante) VALUES (1);
INSERT INTO puestos_por_cubrir (cantidad_faltante) VALUES (1);
```

### 2. Cambios en la API

**Archivo:** `src/app/api/instalaciones/[id]/turnos/route.ts`

- **Líneas 204-210**: Modificado para crear múltiples PPCs individuales
- **Líneas 35-42**: Actualizada la consulta para contar PPCs individuales en lugar de sumar cantidad_faltante

### 3. Cambios en el Frontend

**Archivo:** `src/app/instalaciones/[id]/components/TurnosInstalacion.tsx`

- **Líneas 280-290**: Mejorada la grilla para mostrar hasta 4 PPCs por fila
- **Línea 285**: Cambiado el identificador de "PPC #ID" a "Puesto #Número"

## Beneficios

✅ **Mejor Visualización**: Ahora se muestran todos los puestos por cubrir individualmente

✅ **Asignación Granular**: Cada PPC puede ser asignado a un guardia específico

✅ **Control Preciso**: Mejor seguimiento de qué puestos están cubiertos

✅ **Escalabilidad**: La interfaz se adapta automáticamente a cualquier cantidad de puestos

## Migración de Datos Existentes

Se ejecutó el script `migrate-ppc-individual.ts` que:

1. Identificó PPCs con `cantidad_faltante > 1`
2. Creó múltiples PPCs individuales para cada uno
3. Eliminó los PPCs originales

**Resultado:**
- 2 PPCs migrados
- 4 PPCs individuales creados

## Comandos Disponibles

```bash
# Migrar PPCs existentes a formato individual
npm run migrate:ppc-individual

# Crear nuevos turnos (ahora con PPCs individuales automáticamente)
npm run create-ppc-turnos
```

## Estructura Final

Cada turno ahora genera:
- **1 requisito de puesto** por rol de servicio
- **N PPCs individuales** (donde N = cantidad de guardias requeridos)
- **Cada PPC** representa un puesto individual que necesita ser cubierto

Esto permite una gestión mucho más precisa y visual de los puestos por cubrir en cada instalación. 