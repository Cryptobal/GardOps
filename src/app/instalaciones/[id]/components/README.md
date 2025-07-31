# Componente TurnosInstalacion

## 📋 Descripción

El componente `TurnosInstalacion` permite gestionar los turnos de una instalación específica, mostrando una tabla con los turnos configurados y un formulario para crear nuevos turnos.

## 🔗 Conexión a Base de Datos

### Tablas Utilizadas:
- `turnos_instalacion` - Tabla principal de turnos
- `roles_servicio` - Roles de servicio disponibles
- `asignaciones_guardias` - Guardias asignados a turnos
- `puestos_por_cubrir` - PPCs pendientes por turno

### JOINs Realizados:
```sql
-- Obtener turnos con detalles completos
SELECT 
  ti.*,
  rs.nombre as rol_nombre,
  rs.dias_trabajo,
  rs.dias_descanso,
  rs.horas_turno,
  rs.hora_inicio,
  rs.hora_termino,
  COALESCE(ag_count.count, 0) as guardias_asignados,
  COALESCE(ppc_count.count, 0) as ppc_pendientes
FROM turnos_instalacion ti
INNER JOIN roles_servicio rs ON ti.rol_servicio_id = rs.id
LEFT JOIN (
  SELECT requisito_puesto_id, COUNT(*) as count
  FROM asignaciones_guardias 
  WHERE estado = 'Activo'
  GROUP BY requisito_puesto_id
) ag_count ON ag_count.requisito_puesto_id = ti.id
LEFT JOIN (
  SELECT requisito_puesto_id, COUNT(*) as count
  FROM puestos_por_cubrir 
  WHERE estado = 'Pendiente'
  GROUP BY requisito_puesto_id
) ppc_count ON ppc_count.requisito_puesto_id = ti.id
WHERE ti.instalacion_id = $1
```

## 📊 Funcionalidades

### Tabla de Turnos
Muestra una tabla con las siguientes columnas:
- **Rol de Servicio**: Nombre y descripción del rol
- **Ciclo**: Formato `4x4` (días trabajo x días descanso)
- **Horario**: Formato `20:00 a 08:00`
- **Guardias Requeridos**: Cantidad configurada
- **Asignados**: Guardias actualmente asignados
- **PPC Pendientes**: Puestos por cubrir pendientes
- **Estado**: Visual con colores (✅ Completo, ⚠️ Parcial, ❌ Vacante)

### Formulario de Creación
- **Dropdown**: Selección de rol de servicio activo
- **Campo numérico**: Cantidad de guardias (1-20)
- **Botón**: Crear turno

### Lógica Automática
Al crear un turno:
1. Se inserta en `turnos_instalacion`
2. Si `cantidad_guardias > asignados` → genera automáticamente registros en `puestos_por_cubrir`

## 🎨 Diseño

- **Modo oscuro**: Compatible con el tema dark de GardOps
- **Tabla responsive**: Con scroll horizontal en móviles
- **Badges visuales**: Para estados y contadores
- **Formulario limpio**: Con validaciones en tiempo real

## 📱 Responsive

- **Desktop**: Layout horizontal tradicional
- **Móvil**: Tabla con scroll y formulario apilado

## 🔧 Uso

```tsx
import TurnosInstalacion from './components/TurnosInstalacion';

// En la página de instalación
<TurnosInstalacion instalacionId={instalacionId} />
```

## 📈 Estados Visuales

- **✅ Completo**: Verde - Todos los guardias asignados
- **⚠️ Parcial**: Amarillo - Algunos guardias asignados
- **❌ Vacante**: Rojo - Ningún guardia asignado

## 🚀 API Endpoints

- `GET /api/instalaciones/[id]/turnos` - Obtener turnos de instalación
- `POST /api/instalaciones/[id]/turnos` - Crear nuevo turno
- `GET /api/roles-servicio` - Obtener roles de servicio activos

## 📝 Logs

El componente muestra confirmación en consola:
```ts
console.log("🔁 Turnos de instalación cargados correctamente");
``` 