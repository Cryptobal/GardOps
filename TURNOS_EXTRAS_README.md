# Sistema de Turnos Extras - GardOps

## 📋 Descripción

Sistema completo para registrar y calcular el valor pagado por turnos extras (reemplazos y cobertura de PPC) en GardOps.

## 🏗️ Arquitectura

### Base de Datos
- **Tabla**: `turnos_extras`
- **Campos principales**:
  - `guardia_id`: Referencia al guardia
  - `instalacion_id`: Referencia a la instalación
  - `puesto_id`: Referencia al puesto operativo
  - `pauta_id`: Referencia a la pauta mensual
  - `fecha`: Fecha del turno extra
  - `estado`: 'reemplazo' o 'ppc'
  - `valor`: Valor calculado desde `valor_turno_extra` de la instalación

### Endpoints API

#### POST `/api/pauta-diaria/turno-extra`
Registra un nuevo turno extra.

**Parámetros**:
```json
{
  "guardia_id": "uuid",
  "puesto_id": "uuid", 
  "pauta_id": "integer",
  "estado": "reemplazo" | "ppc"
}
```

**Respuesta**:
```json
{
  "ok": true,
  "id": "uuid",
  "valor": 50000,
  "mensaje": "Turno extra registrado: $50000 pagado"
}
```

#### GET `/api/pauta-diaria/turno-extra`
Obtiene turnos extras con filtros opcionales.

**Query params**:
- `guardia_id`: Filtrar por guardia
- `instalacion_id`: Filtrar por instalación
- `fecha_inicio`: Fecha de inicio
- `fecha_fin`: Fecha de fin

#### GET `/api/pauta-diaria/turno-extra/exportar`
Exporta turnos extras en formato CSV para Banco Santander.

**Query params**:
- Mismos filtros que GET
- `formato`: 'csv' (por defecto)

## 🎯 Componentes Frontend

### TurnoExtraModal
Modal compacto para registrar turnos extras.

```tsx
<TurnoExtraModal
  isOpen={isOpen}
  onClose={onClose}
  guardia_id="uuid"
  guardia_nombre="Juan Pérez"
  puesto_id="uuid"
  puesto_nombre="Puesto 1"
  pauta_id={123}
  fecha="2024-01-15"
/>
```

### TurnoExtraButton
Botón compacto que abre el modal de registro.

```tsx
<TurnoExtraButton
  guardia_id="uuid"
  guardia_nombre="Juan Pérez"
  puesto_id="uuid"
  puesto_nombre="Puesto 1"
  pauta_id={123}
  fecha="2024-01-15"
  variant="outline"
  size="sm"
/>
```

### TurnosExtrasResumen
Componente para mostrar resumen y exportar datos.

```tsx
<TurnosExtrasResumen
  guardia_id="uuid"
  fecha_inicio="2024-01-01"
  fecha_fin="2024-01-31"
  showExportButton={true}
/>
```

## 🪝 Hook Personalizado

### useTurnosExtras
Hook para manejar operaciones de turnos extras.

```tsx
const { 
  registrarTurnoExtra, 
  obtenerTurnosExtras, 
  obtenerResumenTurnosExtras,
  isLoading, 
  error 
} = useTurnosExtras();

// Registrar turno extra
await registrarTurnoExtra({
  guardia_id: "uuid",
  puesto_id: "uuid",
  pauta_id: 123,
  estado: "reemplazo"
});

// Obtener resumen
const resumen = await obtenerResumenTurnosExtras(
  "uuid", // guardia_id
  "2024-01-01", // fecha_inicio
  "2024-01-31"  // fecha_fin
);
```

## 🔄 Flujo de Trabajo

1. **Registro**: Al registrar asistencia tipo reemplazo o PPC, se llama al endpoint
2. **Cálculo**: El sistema consulta `valor_turno_extra` desde la instalación
3. **Almacenamiento**: Se guarda en `turnos_extras` con el valor calculado
4. **Notificación**: Se muestra alerta compacta: `✅ Turno extra registrado: $50000 pagado`
5. **Exportación**: Los datos se pueden exportar para la planilla del Banco Santander

## 📊 Características

- ✅ **Cálculo automático** del valor desde la instalación
- ✅ **Validación** de duplicados
- ✅ **Alerta compacta** al registrar
- ✅ **Exportación CSV** para Banco Santander
- ✅ **Resumen estadístico** por guardia y período
- ✅ **Índices optimizados** para consultas rápidas
- ✅ **UI minimalista** y compacta

## 🚀 Uso Rápido

```tsx
// En cualquier componente de la aplicación
import { TurnoExtraButton } from '@/components/shared/TurnoExtraButton';

// Botón para registrar turno extra
<TurnoExtraButton
  guardia_id={guardia.id}
  guardia_nombre={guardia.nombre}
  puesto_id={puesto.id}
  puesto_nombre={puesto.nombre}
  pauta_id={pauta.id}
  fecha={fecha}
/>
```

## 📈 Resultado Visual

```
✅ Turno extra registrado: $50000 pagado
```

El sistema está listo para usar y se integra perfectamente con el flujo de trabajo existente de GardOps. 