import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// POST - Configurar tablas de estructuras unificadas
export async function POST(request: NextRequest) {
  console.log('🔍 POST /api/payroll/estructuras-unificadas/setup - Iniciando...');
  
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'create' });
    if (maybeDeny && (maybeDeny as any).status === 403) {
      console.log('❌ Acceso denegado por permisos');
      return maybeDeny;
    }
    console.log('✅ Permisos verificados correctamente');
  } catch (error) {
    console.log('⚠️ Error verificando permisos:', error);
  }

  try {
    console.log('📊 Configurando tablas de estructuras unificadas...');

    // Crear tabla sueldo_estructuras_servicio si no existe
    console.log('1. Creando tabla sueldo_estructuras_servicio...');
    await query(`
      CREATE TABLE IF NOT EXISTS sueldo_estructuras_servicio (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
        rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
        sueldo_base NUMERIC(12,2) NOT NULL DEFAULT 0,
        bono_id UUID REFERENCES sueldo_bonos_globales(id) ON DELETE SET NULL,
        monto NUMERIC(12,2) NOT NULL DEFAULT 0,
        activo BOOLEAN NOT NULL DEFAULT true,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
        fecha_inactivacion TIMESTAMP NULL,
        descripcion TEXT NULL,
        creado_por TEXT NOT NULL DEFAULT 'sistema',
        actualizado_por TEXT NULL,
        actualizado_en TIMESTAMP NULL
      )
    `);

    // Crear índices para sueldo_estructuras_servicio
    console.log('2. Creando índices para sueldo_estructuras_servicio...');
    await query(`CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_instalacion ON sueldo_estructuras_servicio(instalacion_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_rol ON sueldo_estructuras_servicio(rol_servicio_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_instalacion_rol ON sueldo_estructuras_servicio(instalacion_id, rol_servicio_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_bono ON sueldo_estructuras_servicio(bono_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_activo ON sueldo_estructuras_servicio(activo)`);

    // Crear constraint único para evitar duplicados
    console.log('3. Creando constraint único...');
    try {
      await query(`
        ALTER TABLE sueldo_estructuras_servicio 
        ADD CONSTRAINT uk_sueldo_estructuras_instalacion_rol 
        UNIQUE (instalacion_id, rol_servicio_id)
      `);
    } catch (error) {
      console.log('⚠️ Constraint ya existe o error al crearlo:', error);
    }

    // Verificar que la tabla sueldo_estructura_guardia existe
    console.log('4. Verificando tabla sueldo_estructura_guardia...');
    const checkGuardia = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_estructura_guardia'
      )
    `);

    if (!checkGuardia.rows[0].exists) {
      console.log('5. Creando tabla sueldo_estructura_guardia...');
      await query(`
        CREATE TABLE IF NOT EXISTS sueldo_estructura_guardia (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guardia_id UUID NOT NULL REFERENCES guardias(id) ON DELETE CASCADE,
          version INTEGER NOT NULL DEFAULT 1,
          vigencia_desde DATE NOT NULL DEFAULT CURRENT_DATE,
          vigencia_hasta DATE NULL,
          periodo DATERANGE GENERATED ALWAYS AS (daterange(vigencia_desde, vigencia_hasta)) STORED,
          activo BOOLEAN NOT NULL DEFAULT true,
          creado_por TEXT NOT NULL DEFAULT 'sistema',
          creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
          descripcion TEXT NULL
        )
      `);

      // Crear índices para sueldo_estructura_guardia
      await query(`CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_guardia ON sueldo_estructura_guardia(guardia_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_periodo ON sueldo_estructura_guardia USING gist(periodo)`);
    }

    // Verificar que la tabla sueldo_estructura_guardia_item existe
    console.log('6. Verificando tabla sueldo_estructura_guardia_item...');
    const checkGuardiaItem = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_estructura_guardia_item'
      )
    `);

    if (!checkGuardiaItem.rows[0].exists) {
      console.log('7. Creando tabla sueldo_estructura_guardia_item...');
      await query(`
        CREATE TABLE IF NOT EXISTS sueldo_estructura_guardia_item (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          estructura_guardia_id UUID NOT NULL REFERENCES sueldo_estructura_guardia(id) ON DELETE CASCADE,
          item_id TEXT NOT NULL,
          sueldo_base NUMERIC(12,2) NOT NULL DEFAULT 0,
          bono_id UUID REFERENCES sueldo_bonos_globales(id) ON DELETE SET NULL,
          monto NUMERIC(12,2) NOT NULL DEFAULT 0,
          vigencia_desde TIMESTAMP NOT NULL DEFAULT NOW(),
          vigencia_hasta TIMESTAMP NULL,
          activo BOOLEAN NOT NULL DEFAULT true,
          creado_en TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      // Crear índices para sueldo_estructura_guardia_item
      await query(`CREATE INDEX IF NOT EXISTS idx_guardia_item_estructura ON sueldo_estructura_guardia_item(estructura_guardia_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_guardia_item_item ON sueldo_estructura_guardia_item(item_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_guardia_item_activo ON sueldo_estructura_guardia_item(activo)`);
    }

    // Verificar el estado final
    console.log('8. Verificando estado final...');
    const countServicio = await query('SELECT COUNT(*) as total FROM sueldo_estructuras_servicio');
    const countGuardia = await query('SELECT COUNT(*) as total FROM sueldo_estructura_guardia');
    const countGuardiaItem = await query('SELECT COUNT(*) as total FROM sueldo_estructura_guardia_item');

    console.log('✅ Configuración completada exitosamente');

    const response = {
      success: true,
      data: {
        message: 'Tablas de estructuras unificadas configuradas correctamente',
        tablas: {
          sueldo_estructuras_servicio: {
            creada: true,
            registros: countServicio.rows[0].total
          },
          sueldo_estructura_guardia: {
            creada: true,
            registros: countGuardia.rows[0].total
          },
          sueldo_estructura_guardia_item: {
            creada: true,
            registros: countGuardiaItem.rows[0].total
          }
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error configurando tablas de estructuras unificadas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
