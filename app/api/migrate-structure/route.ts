import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST() {
  try {
    console.log('Iniciando migración de estructura...')
    
    // 1. Renombrar tablas para consistencia visual
    const migrations = [
      // Verificar si las tablas existen antes de renombrar
      {
        name: 'Verificar tabla puestos',
        sql: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'puestos' AND table_schema = 'public'`
      },
      {
        name: 'Renombrar puestos a puestos_operativos',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'puestos' AND table_schema = 'public') THEN
              ALTER TABLE puestos RENAME TO puestos_operativos;
              RAISE NOTICE 'Tabla puestos renombrada a puestos_operativos';
            ELSE
              RAISE NOTICE 'Tabla puestos no existe, omitiendo renombrado';
            END IF;
          END $$`
      },
      {
        name: 'Verificar tabla pautas_instalacion',
        sql: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'pautas_instalacion' AND table_schema = 'public'`
      },
      {
        name: 'Renombrar pautas_instalacion a pautas_operativas',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pautas_instalacion' AND table_schema = 'public') THEN
              ALTER TABLE pautas_instalacion RENAME TO pautas_operativas;
              RAISE NOTICE 'Tabla pautas_instalacion renombrada a pautas_operativas';
            ELSE
              RAISE NOTICE 'Tabla pautas_instalacion no existe, omitiendo renombrado';
            END IF;
          END $$`
      },
      // 2. Asegurar campo estado en todas las tablas
      {
        name: 'Agregar campo estado a puestos_operativos',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'puestos_operativos' AND table_schema = 'public') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'puestos_operativos' AND column_name = 'estado' AND table_schema = 'public') THEN
                ALTER TABLE puestos_operativos ADD COLUMN estado TEXT DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo'));
                RAISE NOTICE 'Campo estado agregado a puestos_operativos';
              ELSE
                RAISE NOTICE 'Campo estado ya existe en puestos_operativos';
              END IF;
            END IF;
          END $$`
      },
      {
        name: 'Agregar campo estado a roles_servicio',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles_servicio' AND table_schema = 'public') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles_servicio' AND column_name = 'estado' AND table_schema = 'public') THEN
                ALTER TABLE roles_servicio ADD COLUMN estado TEXT DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo'));
                RAISE NOTICE 'Campo estado agregado a roles_servicio';
              ELSE
                RAISE NOTICE 'Campo estado ya existe en roles_servicio';
              END IF;
            END IF;
          END $$`
      },
      {
        name: 'Agregar campo estado a pautas_operativas',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pautas_operativas' AND table_schema = 'public') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pautas_operativas' AND column_name = 'estado' AND table_schema = 'public') THEN
                ALTER TABLE pautas_operativas ADD COLUMN estado TEXT DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo'));
                RAISE NOTICE 'Campo estado agregado a pautas_operativas';
              ELSE
                RAISE NOTICE 'Campo estado ya existe en pautas_operativas';
              END IF;
            END IF;
          END $$`
      },
      // 3. Agregar campos de auditoría si no existen
      {
        name: 'Agregar campos de auditoría a puestos_operativos',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'puestos_operativos' AND table_schema = 'public') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'puestos_operativos' AND column_name = 'created_at' AND table_schema = 'public') THEN
                ALTER TABLE puestos_operativos ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                RAISE NOTICE 'Campo created_at agregado a puestos_operativos';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'puestos_operativos' AND column_name = 'updated_at' AND table_schema = 'public') THEN
                ALTER TABLE puestos_operativos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                RAISE NOTICE 'Campo updated_at agregado a puestos_operativos';
              END IF;
            END IF;
          END $$`
      },
      // 4. Agregar campos faltantes a roles_servicio
      {
        name: 'Agregar campos hora_inicio y hora_termino a roles_servicio',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles_servicio' AND table_schema = 'public') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles_servicio' AND column_name = 'hora_inicio' AND table_schema = 'public') THEN
                ALTER TABLE roles_servicio ADD COLUMN hora_inicio TEXT NOT NULL DEFAULT '08:00';
                RAISE NOTICE 'Campo hora_inicio agregado a roles_servicio';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles_servicio' AND column_name = 'hora_termino' AND table_schema = 'public') THEN
                ALTER TABLE roles_servicio ADD COLUMN hora_termino TEXT NOT NULL DEFAULT '16:00';
                RAISE NOTICE 'Campo hora_termino agregado a roles_servicio';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles_servicio' AND column_name = 'nombre' AND table_schema = 'public') THEN
                ALTER TABLE roles_servicio ADD COLUMN nombre TEXT;
                RAISE NOTICE 'Campo nombre agregado a roles_servicio';
              END IF;
            END IF;
          END $$`
      },
      // 5. Agregar constraint único para evitar duplicados en roles_servicio
      {
        name: 'Agregar constraint único para roles_servicio activos',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles_servicio' AND table_schema = 'public') THEN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'roles_servicio' 
                  AND constraint_name = 'unique_active_role_servicio' 
                  AND table_schema = 'public'
              ) THEN
                -- Primero eliminar cualquier duplicado existente (mantener el más reciente)
                DELETE FROM roles_servicio 
                WHERE id NOT IN (
                  SELECT DISTINCT ON (dias_trabajo, dias_descanso, hora_inicio, hora_termino) id
                  FROM roles_servicio 
                  WHERE estado = 'Activo'
                  ORDER BY dias_trabajo, dias_descanso, hora_inicio, hora_termino, created_at DESC
                );
                
                -- Crear índice único parcial (solo para registros activos)
                CREATE UNIQUE INDEX unique_active_role_servicio 
                ON roles_servicio (dias_trabajo, dias_descanso, hora_inicio, hora_termino) 
                WHERE estado = 'Activo';
                
                RAISE NOTICE 'Constraint único agregado para roles_servicio activos';
              ELSE
                RAISE NOTICE 'Constraint único ya existe para roles_servicio';
              END IF;
            END IF;
          END $$`
      },
      {
        name: 'Agregar campos de auditoría a roles_servicio',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles_servicio' AND table_schema = 'public') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles_servicio' AND column_name = 'created_at' AND table_schema = 'public') THEN
                ALTER TABLE roles_servicio ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                RAISE NOTICE 'Campo created_at agregado a roles_servicio';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles_servicio' AND column_name = 'updated_at' AND table_schema = 'public') THEN
                ALTER TABLE roles_servicio ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                RAISE NOTICE 'Campo updated_at agregado a roles_servicio';
              END IF;
            END IF;
          END $$`
      },
      {
        name: 'Agregar campos de auditoría a pautas_operativas',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pautas_operativas' AND table_schema = 'public') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pautas_operativas' AND column_name = 'created_at' AND table_schema = 'public') THEN
                ALTER TABLE pautas_operativas ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                RAISE NOTICE 'Campo created_at agregado a pautas_operativas';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pautas_operativas' AND column_name = 'updated_at' AND table_schema = 'public') THEN
                ALTER TABLE pautas_operativas ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                RAISE NOTICE 'Campo updated_at agregado a pautas_operativas';
              END IF;
            END IF;
          END $$`
      }
    ]

    const results = []
    
    for (const migration of migrations) {
      try {
        console.log(`Ejecutando: ${migration.name}`)
        const result = await query(migration.sql)
        results.push({
          name: migration.name,
          success: true,
          result: result.rows || []
        })
        console.log(`✓ ${migration.name} - Completado`)
      } catch (error) {
        console.error(`✗ ${migration.name} - Error:`, error)
        results.push({
          name: migration.name,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    console.log('Migración completada')
    
    return NextResponse.json({
      success: true,
      message: 'Migración de estructura completada',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en migración:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al ejecutar migración',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 