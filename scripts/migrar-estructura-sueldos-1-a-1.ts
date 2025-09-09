#!/usr/bin/env ts-node

import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function migrarEstructuraSueldos1a1() {
  console.log('🚀 INICIANDO MIGRACIÓN DE ESTRUCTURA DE SUELDOS (1:1 con Roles de Servicio)\n');

  try {
    // Iniciar transacción
    await query('BEGIN');
    
    // ===============================================
    // 1. ACTUALIZAR TABLA DE ROLES DE SERVICIO
    // ===============================================
    console.log('1️⃣ ACTUALIZANDO TABLA DE ROLES DE SERVICIO...');
    
    // Agregar columna fecha_inactivacion si no existe
    await query(`
      ALTER TABLE as_turnos_roles_servicio 
      ADD COLUMN IF NOT EXISTS fecha_inactivacion TIMESTAMP NULL
    `);
    console.log('✅ Columna fecha_inactivacion agregada a roles de servicio');

    // ===============================================
    // 2. CREAR NUEVA TABLA DE ESTRUCTURAS DE SUELDO (1:1)
    // ===============================================
    console.log('\n2️⃣ CREANDO NUEVA TABLA DE ESTRUCTURAS DE SUELDO...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS sueldo_estructuras_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rol_servicio_id UUID NOT NULL UNIQUE REFERENCES as_turnos_roles_servicio(id),
        sueldo_base INTEGER NOT NULL DEFAULT 0,
        bono_asistencia INTEGER NOT NULL DEFAULT 0,
        bono_responsabilidad INTEGER NOT NULL DEFAULT 0,
        bono_noche INTEGER NOT NULL DEFAULT 0,
        bono_feriado INTEGER NOT NULL DEFAULT 0,
        bono_riesgo INTEGER NOT NULL DEFAULT 0,
        otros_bonos JSONB DEFAULT '[]'::jsonb,
        activo BOOLEAN NOT NULL DEFAULT true,
        fecha_inactivacion TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- Constraint para asegurar relación 1:1
        CONSTRAINT unique_rol_estructura UNIQUE(rol_servicio_id)
      )
    `);
    console.log('✅ Tabla sueldo_estructuras_roles creada');

    // Crear índices
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_rol ON sueldo_estructuras_roles(rol_servicio_id);
      CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_activo ON sueldo_estructuras_roles(activo);
    `);
    console.log('✅ Índices creados');

    // ===============================================
    // 3. MIGRAR DATOS EXISTENTES
    // ===============================================
    console.log('\n3️⃣ MIGRANDO DATOS EXISTENTES...');
    
    // Primero, obtener todos los roles de servicio únicos
    const rolesExistentes = await query(`
      SELECT DISTINCT 
        rs.id as rol_id,
        rs.nombre as rol_nombre,
        rs.estado,
        COUNT(DISTINCT es.instalacion_id) as num_instalaciones
      FROM as_turnos_roles_servicio rs
      LEFT JOIN sueldo_estructuras_servicio es ON rs.id = es.rol_servicio_id
      GROUP BY rs.id, rs.nombre, rs.estado
      ORDER BY rs.nombre
    `);
    
    console.log(`📊 Encontrados ${rolesExistentes.rows.length} roles de servicio`);
    
    // Para cada rol, crear su estructura base
    for (const rol of rolesExistentes.rows) {
      console.log(`  - Procesando rol: ${rol.rol_nombre}`);
      
      // Verificar si ya tiene estructuras definidas
      const estructurasExistentes = await query(`
        SELECT 
          nombre_bono,
          AVG(monto) as monto_promedio,
          bool_and(imponible) as imponible
        FROM sueldo_estructuras_servicio
        WHERE rol_servicio_id = $1
        GROUP BY nombre_bono
      `, [rol.rol_id]);
      
      // Preparar los montos para la nueva estructura
      let sueldoBase = 0;
      let bonoAsistencia = 0;
      let bonoResponsabilidad = 0;
      let bonoNoche = 0;
      let bonoFeriado = 0;
      let bonoRiesgo = 0;
      const otrosBonos = [];
      
      // Mapear los bonos existentes a la nueva estructura
      for (const bono of estructurasExistentes.rows) {
        const monto = Math.round(bono.monto_promedio);
        
        switch(bono.nombre_bono.toLowerCase()) {
          case 'sueldo base':
            sueldoBase = monto;
            break;
          case 'bono asistencia':
          case 'asistencia':
            bonoAsistencia = monto;
            break;
          case 'bono responsabilidad':
          case 'responsabilidad':
            bonoResponsabilidad = monto;
            break;
          case 'bono noche':
          case 'noche':
          case 'nocturno':
            bonoNoche = monto;
            break;
          case 'bono feriado':
          case 'feriado':
            bonoFeriado = monto;
            break;
          case 'bono riesgo':
          case 'riesgo':
            bonoRiesgo = monto;
            break;
          default:
            // Otros bonos personalizados
            otrosBonos.push({
              nombre: bono.nombre_bono,
              monto: monto,
              imponible: bono.imponible
            });
        }
      }
      
      // Insertar en la nueva tabla
      await query(`
        INSERT INTO sueldo_estructuras_roles (
          rol_servicio_id,
          sueldo_base,
          bono_asistencia,
          bono_responsabilidad,
          bono_noche,
          bono_feriado,
          bono_riesgo,
          otros_bonos,
          activo,
          fecha_inactivacion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (rol_servicio_id) DO UPDATE
        SET 
          sueldo_base = EXCLUDED.sueldo_base,
          bono_asistencia = EXCLUDED.bono_asistencia,
          bono_responsabilidad = EXCLUDED.bono_responsabilidad,
          bono_noche = EXCLUDED.bono_noche,
          bono_feriado = EXCLUDED.bono_feriado,
          bono_riesgo = EXCLUDED.bono_riesgo,
          otros_bonos = EXCLUDED.otros_bonos,
          updated_at = NOW()
      `, [
        rol.rol_id,
        sueldoBase || 680000, // Valor por defecto si no hay sueldo base
        bonoAsistencia,
        bonoResponsabilidad,
        bonoNoche,
        bonoFeriado,
        bonoRiesgo,
        JSON.stringify(otrosBonos),
        rol.estado === 'Activo',
        rol.estado === 'Inactivo' ? new Date() : null
      ]);
      
      console.log(`    ✅ Estructura migrada para: ${rol.rol_nombre}`);
    }
    
    // ===============================================
    // 4. CREAR FUNCIÓN Y TRIGGER PARA CREAR ESTRUCTURA AUTOMÁTICAMENTE
    // ===============================================
    console.log('\n4️⃣ CREANDO FUNCIÓN Y TRIGGER PARA CREACIÓN AUTOMÁTICA...');
    
    // Crear función para crear estructura automáticamente
    await query(`
      CREATE OR REPLACE FUNCTION crear_estructura_sueldo_automatica()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Crear estructura base cuando se crea un nuevo rol
        INSERT INTO sueldo_estructuras_roles (
          rol_servicio_id,
          sueldo_base,
          bono_asistencia,
          bono_responsabilidad,
          bono_noche,
          bono_feriado,
          bono_riesgo,
          activo
        ) VALUES (
          NEW.id,
          680000, -- Sueldo base por defecto
          0,
          0,
          0,
          0,
          0,
          true
        );
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Crear trigger
    await query(`
      DROP TRIGGER IF EXISTS trigger_crear_estructura_sueldo ON as_turnos_roles_servicio;
      
      CREATE TRIGGER trigger_crear_estructura_sueldo
      AFTER INSERT ON as_turnos_roles_servicio
      FOR EACH ROW
      EXECUTE FUNCTION crear_estructura_sueldo_automatica();
    `);
    
    console.log('✅ Función y trigger de creación automática creados');
    
    // ===============================================
    // 5. CREAR FUNCIÓN Y TRIGGER PARA INACTIVACIÓN EN CASCADA
    // ===============================================
    console.log('\n5️⃣ CREANDO FUNCIÓN Y TRIGGER PARA INACTIVACIÓN EN CASCADA...');
    
    await query(`
      CREATE OR REPLACE FUNCTION inactivar_estructura_sueldo_cascada()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Si el rol se inactiva, también inactivar su estructura
        IF NEW.estado = 'Inactivo' AND (OLD.estado IS NULL OR OLD.estado != 'Inactivo') THEN
          -- Actualizar fecha de inactivación del rol
          NEW.fecha_inactivacion = NOW();
          
          -- Inactivar la estructura asociada
          UPDATE sueldo_estructuras_roles
          SET 
            activo = false,
            fecha_inactivacion = NOW(),
            updated_at = NOW()
          WHERE rol_servicio_id = NEW.id;
        END IF;
        
        -- Si el rol se reactiva, también reactivar su estructura
        IF NEW.estado = 'Activo' AND OLD.estado = 'Inactivo' THEN
          -- Limpiar fecha de inactivación del rol
          NEW.fecha_inactivacion = NULL;
          
          -- Reactivar la estructura asociada
          UPDATE sueldo_estructuras_roles
          SET 
            activo = true,
            fecha_inactivacion = NULL,
            updated_at = NOW()
          WHERE rol_servicio_id = NEW.id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Crear trigger
    await query(`
      DROP TRIGGER IF EXISTS trigger_inactivar_estructura_cascada ON as_turnos_roles_servicio;
      
      CREATE TRIGGER trigger_inactivar_estructura_cascada
      BEFORE UPDATE ON as_turnos_roles_servicio
      FOR EACH ROW
      WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
      EXECUTE FUNCTION inactivar_estructura_sueldo_cascada();
    `);
    
    console.log('✅ Función y trigger de inactivación en cascada creados');
    
    // ===============================================
    // 6. ACTUALIZAR TRIGGER DE updated_at
    // ===============================================
    console.log('\n6️⃣ ACTUALIZANDO TRIGGER DE updated_at...');
    
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await query(`
      DROP TRIGGER IF EXISTS update_sueldo_estructuras_roles_updated_at ON sueldo_estructuras_roles;
      
      CREATE TRIGGER update_sueldo_estructuras_roles_updated_at
      BEFORE UPDATE ON sueldo_estructuras_roles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Trigger de updated_at actualizado');
    
    // ===============================================
    // 7. VERIFICAR MIGRACIÓN
    // ===============================================
    console.log('\n7️⃣ VERIFICANDO MIGRACIÓN...');
    
    // Verificar estructura de la nueva tabla
    const estructura = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sueldo_estructuras_roles'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura de sueldo_estructuras_roles:');
    estructura.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Verificar datos migrados
    const datosMigrados = await query(`
      SELECT 
        rs.nombre as rol_nombre,
        se.sueldo_base,
        se.activo,
        se.fecha_inactivacion
      FROM sueldo_estructuras_roles se
      INNER JOIN as_turnos_roles_servicio rs ON se.rol_servicio_id = rs.id
      ORDER BY rs.nombre
    `);
    
    console.log(`\n📊 Total estructuras migradas: ${datosMigrados.rows.length}`);
    datosMigrados.rows.forEach((row: any) => {
      console.log(`  - ${row.rol_nombre}: $${row.sueldo_base.toLocaleString('es-CL')} (${row.activo ? 'Activo' : 'Inactivo'})`);
    });
    
    // Commit de la transacción
    await query('COMMIT');
    
    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('📝 Resumen:');
    console.log('  - Tabla de roles actualizada con fecha_inactivacion');
    console.log('  - Nueva tabla sueldo_estructuras_roles creada (relación 1:1)');
    console.log('  - Datos migrados desde estructura antigua');
    console.log('  - Triggers de creación automática implementados');
    console.log('  - Triggers de inactivación en cascada implementados');
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrarEstructuraSueldos1a1()
    .then(() => {
      console.log('\n✅ Script finalizado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error crítico:', error);
      process.exit(1);
    });
}

export { migrarEstructuraSueldos1a1 };
