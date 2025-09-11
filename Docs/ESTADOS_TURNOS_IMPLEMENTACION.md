# 🛠️ Guía de Implementación - Estados de Turnos

## 🎯 Objetivo

Esta guía proporciona los pasos específicos para implementar la nueva estructura de estados de turnos en el código de GardOps.

## 📁 Estructura de Archivos

```
src/
├── lib/
│   ├── estados-turnos.ts          # Nueva lógica de estados
│   ├── mapeo-estados.ts           # Funciones de mapeo
│   └── validacion-estados.ts      # Validaciones
├── app/
│   ├── api/
│   │   ├── pauta-mensual/
│   │   │   └── route.ts           # Actualizar lógica
│   │   ├── pauta-diaria/
│   │   │   └── route.ts           # Actualizar lógica
│   │   └── turnos/
│   │       ├── deshacer/
│   │       │   └── route.ts       # Actualizar función
│   │       └── extra/
│   │           └── route.ts       # Actualizar función
│   ├── pauta-mensual/
│   │   └── components/
│   │       └── PautaTable.tsx     # Actualizar renderizado
│   └── pauta-diaria-v2/
│       └── ClientTable.tsx        # Actualizar lógica
└── db/
    ├── migracion-estados.sql      # Scripts de migración
    └── vistas-actualizadas.sql    # Vistas actualizadas
```

## 🔧 Implementación por Componentes

### 1. **Nueva Lógica de Estados** (`src/lib/estados-turnos.ts`)

```typescript
export interface EstadoTurno {
  tipo_turno: 'planificado' | 'libre';
  estado_puesto: 'asignado' | 'ppc' | 'libre';
  estado_guardia: 'asistido' | 'falta' | 'permiso' | 'vacaciones' | 'licencia' | null;
  tipo_cobertura: 'sin_cobertura' | 'guardia_asignado' | 'turno_extra' | null;
  guardia_trabajo_id: string | null;
}

export interface EstadoUI {
  estado: 'planificado' | 'asistido' | 'turno_extra' | 'sin_cobertura' | 'libre';
  icono: string;
  color: string;
  descripcion: string;
}

export function mapearAEstadoUI(estado: EstadoTurno): EstadoUI {
  // Si es día libre
  if (estado.tipo_turno === 'libre') {
    return {
      estado: 'libre',
      icono: '○',
      color: 'text-gray-400',
      descripcion: 'Día libre'
    };
  }
  
  // Si no se ha ejecutado
  if (!estado.estado_puesto) {
    return {
      estado: 'planificado',
      icono: '●',
      color: 'text-blue-600',
      descripcion: 'Planificado'
    };
  }
  
  // Si el puesto es libre
  if (estado.estado_puesto === 'libre') {
    return {
      estado: 'libre',
      icono: '○',
      color: 'text-gray-400',
      descripcion: 'Día libre'
    };
  }
  
  // Si el puesto es PPC
  if (estado.estado_puesto === 'ppc') {
    if (estado.tipo_cobertura === 'turno_extra') {
      return {
        estado: 'turno_extra',
        icono: 'TE',
        color: 'text-fuchsia-600',
        descripcion: 'Turno Extra'
      };
    }
    return {
      estado: 'sin_cobertura',
      icono: '✗',
      color: 'text-red-600',
      descripcion: 'Sin Cobertura'
    };
  }
  
  // Si el puesto tiene guardia asignado
  if (estado.estado_puesto === 'asignado') {
    if (estado.tipo_cobertura === 'turno_extra') {
      return {
        estado: 'turno_extra',
        icono: 'TE',
        color: 'text-fuchsia-600',
        descripcion: 'Turno Extra'
      };
    }
    if (estado.tipo_cobertura === 'sin_cobertura') {
      return {
        estado: 'sin_cobertura',
        icono: '✗',
        color: 'text-red-600',
        descripcion: 'Sin Cobertura'
      };
    }
    if (estado.tipo_cobertura === 'guardia_asignado') {
      return {
        estado: 'asistido',
        icono: '✓',
        color: 'text-green-600',
        descripcion: 'Asistió'
      };
    }
  }
  
  return {
    estado: 'planificado',
    icono: '●',
    color: 'text-blue-600',
    descripcion: 'Planificado'
  };
}
```

### 2. **Validaciones** (`src/lib/validacion-estados.ts`)

```typescript
export function validarEstadoTurno(estado: EstadoTurno): string[] {
  const errores: string[] = [];
  
  // Regla 1: Día libre
  if (estado.tipo_turno === 'libre') {
    if (estado.estado_guardia !== null) {
      errores.push('Día libre no puede tener estado_guardia');
    }
    if (estado.tipo_cobertura !== null) {
      errores.push('Día libre no puede tener tipo_cobertura');
    }
  }
  
  // Regla 2: PPC
  if (estado.estado_puesto === 'ppc') {
    if (estado.estado_guardia !== null) {
      errores.push('PPC no puede tener estado_guardia');
    }
  }
  
  // Regla 3: Puesto asignado
  if (estado.estado_puesto === 'asignado') {
    if (estado.estado_guardia === null) {
      errores.push('Puesto asignado debe tener estado_guardia');
    }
    if (estado.tipo_cobertura === null) {
      errores.push('Puesto asignado debe tener tipo_cobertura');
    }
  }
  
  return errores;
}

export function esEstadoValido(estado: EstadoTurno): boolean {
  return validarEstadoTurno(estado).length === 0;
}
```

### 3. **Actualización de Pauta Mensual** (`src/app/api/pauta-mensual/route.ts`)

```typescript
// Actualizar la lógica de mapeo
function mapearEstadoOperacionALegacy(estado: EstadoTurno): string {
  const estadoUI = mapearAEstadoUI(estado);
  
  switch (estadoUI.estado) {
    case 'libre':
      return 'L';
    case 'asistido':
      return 'A';
    case 'turno_extra':
      return 'R'; // R para Turno Extra en pauta mensual
    case 'sin_cobertura':
      return 'S';
    case 'planificado':
      return 'planificado';
    default:
      return 'planificado';
  }
}

// Actualizar la consulta principal
const pautaResult = await query(`
  SELECT 
    pm.id,
    pm.puesto_id,
    pm.guardia_id,
    pm.dia,
    pm.tipo_turno,
    pm.estado_puesto,
    pm.estado_guardia,
    pm.tipo_cobertura,
    pm.guardia_trabajo_id,
    pm.meta,
    -- ... otros campos
  FROM as_turnos_pauta_mensual pm
  -- ... resto de la consulta
`);
```

### 4. **Actualización de Pauta Diaria** (`src/app/pauta-diaria-v2/ClientTable.tsx`)

```typescript
// Actualizar función renderEstado
const renderEstado = (row: PautaRow) => {
  const estado: EstadoTurno = {
    tipo_turno: row.tipo_turno || 'planificado',
    estado_puesto: row.estado_puesto || null,
    estado_guardia: row.estado_guardia || null,
    tipo_cobertura: row.tipo_cobertura || null,
    guardia_trabajo_id: row.guardia_trabajo_id
  };
  
  const estadoUI = mapearAEstadoUI(estado);
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ring-1 ${estadoUI.color}`}>
      {estadoUI.icono} {estadoUI.descripcion}
    </span>
  );
};

// Actualizar función canUndo
const canUndo = (r: PautaRow) => {
  const estado: EstadoTurno = {
    tipo_turno: r.tipo_turno || 'planificado',
    estado_puesto: r.estado_puesto || null,
    estado_guardia: r.estado_guardia || null,
    tipo_cobertura: r.tipo_cobertura || null,
    guardia_trabajo_id: r.guardia_trabajo_id
  };
  
  const estadoUI = mapearAEstadoUI(estado);
  
  // Permitir deshacer para estados ejecutados
  return ['asistido', 'turno_extra', 'sin_cobertura'].includes(estadoUI.estado);
};
```

### 5. **Actualización de Función Deshacer** (`src/app/api/turnos/deshacer/route.ts`)

```typescript
export async function POST(req: Request) {
  try {
    const { pauta_id, actor_ref } = await req.json();
    
    // Obtener estado actual
    const { rows } = await query(`
      SELECT * FROM as_turnos_pauta_mensual WHERE id = $1
    `, [pauta_id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Pauta no encontrada' }, { status: 404 });
    }
    
    const pauta = rows[0];
    
    // Actualizar a estado planificado
    await query(`
      UPDATE as_turnos_pauta_mensual 
      SET 
        tipo_turno = 'planificado',
        estado_puesto = 'asignado',
        estado_guardia = NULL,
        tipo_cobertura = NULL,
        guardia_trabajo_id = guardia_id,
        meta = meta - 'cobertura_guardia_id' - 'tipo' - 'extra_uid',
        updated_at = NOW()
      WHERE id = $1
    `, [pauta_id]);
    
    // Eliminar turnos extras relacionados
    await query(`
      DELETE FROM TE_turnos_extras WHERE pauta_id = $1
    `, [pauta_id]);
    
    return NextResponse.json({ 
      ok: true, 
      pauta_id,
      estado: 'planificado'
    });
    
  } catch (error) {
    console.error('Error deshaciendo:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
```

### 6. **Actualización de Función Turno Extra** (`src/app/api/turnos/extra/route.ts`)

```typescript
export async function POST(req: Request) {
  try {
    const { pauta_id, guardia_id, tipo } = await req.json();
    
    // Obtener pauta actual
    const { rows } = await query(`
      SELECT * FROM as_turnos_pauta_mensual WHERE id = $1
    `, [pauta_id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Pauta no encontrada' }, { status: 404 });
    }
    
    const pauta = rows[0];
    
    // Determinar nuevo estado
    let nuevoEstado: EstadoTurno;
    
    if (pauta.estado_puesto === 'ppc') {
      // PPC cubierto
      nuevoEstado = {
        tipo_turno: 'planificado',
        estado_puesto: 'ppc',
        estado_guardia: null,
        tipo_cobertura: 'turno_extra',
        guardia_trabajo_id: guardia_id
      };
    } else {
      // Reemplazo
      nuevoEstado = {
        tipo_turno: 'planificado',
        estado_puesto: 'asignado',
        estado_guardia: 'falta',
        tipo_cobertura: 'turno_extra',
        guardia_trabajo_id: guardia_id
      };
    }
    
    // Validar estado
    if (!esEstadoValido(nuevoEstado)) {
      const errores = validarEstadoTurno(nuevoEstado);
      return NextResponse.json({ error: errores.join(', ') }, { status: 400 });
    }
    
    // Actualizar pauta
    await query(`
      UPDATE as_turnos_pauta_mensual 
      SET 
        tipo_turno = $2,
        estado_puesto = $3,
        estado_guardia = $4,
        tipo_cobertura = $5,
        guardia_trabajo_id = $6,
        meta = meta || jsonb_build_object(
          'cobertura_guardia_id', $6,
          'tipo', 'turno_extra',
          'extra_uid', gen_random_uuid()::text
        ),
        updated_at = NOW()
      WHERE id = $1
    `, [
      pauta_id,
      nuevoEstado.tipo_turno,
      nuevoEstado.estado_puesto,
      nuevoEstado.estado_guardia,
      nuevoEstado.tipo_cobertura,
      nuevoEstado.guardia_trabajo_id
    ]);
    
    // Crear registro en turnos extras
    await query(`
      INSERT INTO TE_turnos_extras (pauta_id, guardia_id, tipo, valor, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [pauta_id, guardia_id, tipo, 0]); // Valor se calcula después
    
    return NextResponse.json({ 
      ok: true, 
      pauta_id,
      estado: 'turno_extra'
    });
    
  } catch (error) {
    console.error('Error creando turno extra:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
```

## 🧪 Testing

### Tests Unitarios

```typescript
// tests/estados-turnos.test.ts
import { mapearAEstadoUI, validarEstadoTurno } from '../src/lib/estados-turnos';

describe('Estados de Turnos', () => {
  test('Día libre mapea correctamente', () => {
    const estado = {
      tipo_turno: 'libre',
      estado_puesto: 'libre',
      estado_guardia: null,
      tipo_cobertura: null,
      guardia_trabajo_id: null
    };
    
    const resultado = mapearAEstadoUI(estado);
    expect(resultado.estado).toBe('libre');
    expect(resultado.icono).toBe('○');
  });
  
  test('Turno extra mapea correctamente', () => {
    const estado = {
      tipo_turno: 'planificado',
      estado_puesto: 'asignado',
      estado_guardia: 'falta',
      tipo_cobertura: 'turno_extra',
      guardia_trabajo_id: 'guardia-123'
    };
    
    const resultado = mapearAEstadoUI(estado);
    expect(resultado.estado).toBe('turno_extra');
    expect(resultado.icono).toBe('TE');
  });
  
  test('Validación de día libre', () => {
    const estado = {
      tipo_turno: 'libre',
      estado_puesto: 'libre',
      estado_guardia: 'asistido', // Error: no debería tener estado_guardia
      tipo_cobertura: null,
      guardia_trabajo_id: null
    };
    
    const errores = validarEstadoTurno(estado);
    expect(errores).toContain('Día libre no puede tener estado_guardia');
  });
});
```

## 📊 Monitoreo

### Métricas a Monitorear

1. **Performance de consultas**
2. **Consistencia de datos**
3. **Errores de validación**
4. **Tiempo de respuesta de APIs**

### Logs Importantes

```typescript
// Agregar logs en funciones críticas
console.log('Estado mapeado:', {
  estado_original: estado,
  estado_ui: resultado,
  timestamp: new Date().toISOString()
});
```

## 🚀 Checklist de Implementación

- [ ] Crear archivos de lógica de estados
- [ ] Implementar validaciones
- [ ] Actualizar APIs de pauta mensual
- [ ] Actualizar APIs de pauta diaria
- [ ] Actualizar función deshacer
- [ ] Actualizar función turno extra
- [ ] Actualizar componentes de frontend
- [ ] Crear tests unitarios
- [ ] Ejecutar tests de integración
- [ ] Validar con datos reales
- [ ] Documentar cambios
- [ ] Preparar rollback plan

---

**Versión**: 1.0  
**Fecha**: 2025-01-11  
**Autor**: Sistema GardOps  
**Estado**: Guía de Implementación
