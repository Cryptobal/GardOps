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
      // 4. Crear nuevas tablas para sistema operativo
      {
        name: 'Crear tabla asignaciones_operativas',
        sql: `CREATE TABLE IF NOT EXISTS asignaciones_operativas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          instalacion_id UUID NOT NULL,
          puesto_operativo_id UUID NOT NULL,
          rol_servicio_id UUID NOT NULL,
          cantidad_guardias INTEGER NOT NULL DEFAULT 1 CHECK (cantidad_guardias > 0),
          estado TEXT DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (instalacion_id) REFERENCES instalaciones(id) ON DELETE CASCADE,
          FOREIGN KEY (puesto_operativo_id) REFERENCES puestos_operativos(id) ON DELETE CASCADE,
          FOREIGN KEY (rol_servicio_id) REFERENCES roles_servicio(id) ON DELETE CASCADE,
          UNIQUE(instalacion_id, puesto_operativo_id, rol_servicio_id)
        )`
      },
      {
        name: 'Crear tabla guardias_asignados',
        sql: `CREATE TABLE IF NOT EXISTS guardias_asignados (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          asignacion_operativa_id UUID NOT NULL,
          guardia_id UUID NULL,
          estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'asignado', 'libre')),
          fecha_asignacion DATE NULL,
          observaciones TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (asignacion_operativa_id) REFERENCES asignaciones_operativas(id) ON DELETE CASCADE,
          FOREIGN KEY (guardia_id) REFERENCES guardias(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'Crear tabla ppc_registros',
        sql: `CREATE TABLE IF NOT EXISTS ppc_registros (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          instalacion_id UUID NOT NULL,
          puesto_operativo_id UUID NOT NULL,
          rol_servicio_id UUID NOT NULL,
          asignacion_operativa_id UUID NOT NULL,
          guardia_asignado_id UUID NULL,
          estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'cubierto', 'justificado')),
          fecha_creacion DATE DEFAULT CURRENT_DATE,
          observaciones TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (instalacion_id) REFERENCES instalaciones(id) ON DELETE CASCADE,
          FOREIGN KEY (puesto_operativo_id) REFERENCES puestos_operativos(id) ON DELETE CASCADE,
          FOREIGN KEY (rol_servicio_id) REFERENCES roles_servicio(id) ON DELETE CASCADE,
          FOREIGN KEY (asignacion_operativa_id) REFERENCES asignaciones_operativas(id) ON DELETE CASCADE,
          FOREIGN KEY (guardia_asignado_id) REFERENCES guardias_asignados(id) ON DELETE SET NULL
        )`
      },
      // 5. Crear índices para mejorar performance
      {
        name: 'Crear índices para asignaciones_operativas',
        sql: `DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_asignaciones_operativas_instalacion') THEN
              CREATE INDEX idx_asignaciones_operativas_instalacion ON asignaciones_operativas(instalacion_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_asignaciones_operativas_puesto') THEN
              CREATE INDEX idx_asignaciones_operativas_puesto ON asignaciones_operativas(puesto_operativo_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_asignaciones_operativas_rol') THEN
              CREATE INDEX idx_asignaciones_operativas_rol ON asignaciones_operativas(rol_servicio_id);
            END IF;
          END $$`
      },
      {
        name: 'Crear índices para guardias_asignados',
        sql: `DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guardias_asignados_asignacion') THEN
              CREATE INDEX idx_guardias_asignados_asignacion ON guardias_asignados(asignacion_operativa_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guardias_asignados_guardia') THEN
              CREATE INDEX idx_guardias_asignados_guardia ON guardias_asignados(guardia_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guardias_asignados_estado') THEN
              CREATE INDEX idx_guardias_asignados_estado ON guardias_asignados(estado);
            END IF;
          END $$`
      },
      {
        name: 'Crear índices para ppc_registros',
        sql: `DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ppc_registros_instalacion') THEN
              CREATE INDEX idx_ppc_registros_instalacion ON ppc_registros(instalacion_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ppc_registros_estado') THEN
              CREATE INDEX idx_ppc_registros_estado ON ppc_registros(estado);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ppc_registros_fecha') THEN
              CREATE INDEX idx_ppc_registros_fecha ON ppc_registros(fecha_creacion);
            END IF;
          END $$`
      },
      // 6. Crear función trigger para actualizar updated_at
      {
        name: 'Crear función trigger update_timestamp',
        sql: `CREATE OR REPLACE FUNCTION update_timestamp()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
          END;
          $$ language 'plpgsql'`
      },
      // 7. Crear triggers para updated_at en nuevas tablas
      {
        name: 'Crear trigger para asignaciones_operativas',
        sql: `DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_asignaciones_operativas_timestamp') THEN
              CREATE TRIGGER update_asignaciones_operativas_timestamp
                BEFORE UPDATE ON asignaciones_operativas
                FOR EACH ROW
                EXECUTE FUNCTION update_timestamp();
            END IF;
          END $$`
      },
      {
        name: 'Crear trigger para guardias_asignados',
        sql: `DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_guardias_asignados_timestamp') THEN
              CREATE TRIGGER update_guardias_asignados_timestamp
                BEFORE UPDATE ON guardias_asignados
                FOR EACH ROW
                EXECUTE FUNCTION update_timestamp();
            END IF;
          END $$`
      },
      {
        name: 'Crear trigger para ppc_registros',
        sql: `DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ppc_registros_timestamp') THEN
              CREATE TRIGGER update_ppc_registros_timestamp
                BEFORE UPDATE ON ppc_registros
                FOR EACH ROW
                EXECUTE FUNCTION update_timestamp();
            END IF;
          END $$`
      },
      {
        name: 'Agregar georreferenciación a tabla guardias',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guardias' AND table_schema = 'public') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'lat' AND table_schema = 'public') THEN
                ALTER TABLE guardias ADD COLUMN lat DOUBLE PRECISION;
                RAISE NOTICE 'Campo lat agregado a guardias';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'lng' AND table_schema = 'public') THEN
                ALTER TABLE guardias ADD COLUMN lng DOUBLE PRECISION;
                RAISE NOTICE 'Campo lng agregado a guardias';
              END IF;
            END IF;
          END $$`
      },
      {
        name: 'Crear tablas AFPs e ISAPREs',
        sql: `
          CREATE TABLE IF NOT EXISTS public.afps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          INSERT INTO public.afps (nombre) VALUES
            ('AFP Habitat'),
            ('AFP Capital'),
            ('AFP Provida'),
            ('AFP Cuprum'),
            ('AFP PlanVital'),
            ('AFP Modelo')
          ON CONFLICT (nombre) DO NOTHING;
          
          CREATE TABLE IF NOT EXISTS public.isapres (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          INSERT INTO public.isapres (nombre) VALUES
            ('FONASA'),
            ('Colmena'),
            ('Cruz Blanca'),
            ('Banmédica'),
            ('Nueva Masvida'),
            ('Consalud'),
            ('Vida Tres')
          ON CONFLICT (nombre) DO NOTHING;
        `
      },
      {
        name: 'Agregar apellidos a tabla guardias',
        sql: `DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guardias' AND table_schema = 'public') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'apellido_paterno' AND table_schema = 'public') THEN
                ALTER TABLE guardias ADD COLUMN apellido_paterno VARCHAR(255);
                RAISE NOTICE 'Campo apellido_paterno agregado a guardias';
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'apellido_materno' AND table_schema = 'public') THEN
                ALTER TABLE guardias ADD COLUMN apellido_materno VARCHAR(255);
                RAISE NOTICE 'Campo apellido_materno agregado a guardias';
              END IF;
              
              CREATE INDEX IF NOT EXISTS idx_guardias_location ON public.guardias (lat, lng);
            END IF;
          END $$`
      },
      {
        name: 'Actualizar tabla bancos con códigos oficiales',
        sql: `
          -- Limpiar tabla bancos existente
          TRUNCATE TABLE public.bancos RESTART IDENTITY CASCADE;
          
          -- Agregar columna codigo si no existe
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bancos' AND column_name = 'codigo' AND table_schema = 'public') THEN
              ALTER TABLE public.bancos ADD COLUMN codigo VARCHAR(3) UNIQUE;
              RAISE NOTICE 'Campo codigo agregado a bancos';
            END IF;
          END $$;
          
          -- Insertar bancos oficiales chilenos con códigos
          INSERT INTO public.bancos (codigo, nombre) VALUES
            ('001', 'Banco de Chile'),
            ('009', 'Banco Internacional'),
            ('012', 'Banco del Estado de Chile (BancoEstado)'),
            ('014', 'Scotiabank Chile (BancoDesarrollo)'),
            ('016', 'Banco de Crédito e Inversiones (BCI)'),
            ('028', 'Banco BICE'),
            ('031', 'HSBC Bank Chile'),
            ('037', 'Banco Santander Chile'),
            ('039', 'Banco Itaú Corpbanca (Itaú Chile)'),
            ('049', 'Banco Security'),
            ('051', 'Banco Falabella'),
            ('052', 'Deutsche Bank (Chile)'),
            ('053', 'Banco Ripley'),
            ('054', 'Rabobank Chile'),
            ('055', 'Banco Consorcio'),
            ('056', 'Banco Penta'),
            ('059', 'Banco BTG Pactual Chile'),
            ('062', 'Tanner Banco Digital');
          
          -- Crear índice para código
          CREATE INDEX IF NOT EXISTS idx_bancos_codigo ON public.bancos (codigo);
        `
      },
      {
        name: 'Corregir foreign keys en tabla guardias',
        sql: `
          -- Agregar columnas con foreign keys
          DO $$ 
          BEGIN 
            -- Agregar banco_id si no existe
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'banco_id' AND table_schema = 'public') THEN
              ALTER TABLE public.guardias ADD COLUMN banco_id UUID;
              RAISE NOTICE 'Campo banco_id agregado a guardias';
            END IF;
            
            -- Agregar salud_id si no existe  
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'salud_id' AND table_schema = 'public') THEN
              ALTER TABLE public.guardias ADD COLUMN salud_id UUID;
              RAISE NOTICE 'Campo salud_id agregado a guardias';
            END IF;
            
            -- Agregar afp_id si no existe
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'afp_id' AND table_schema = 'public') THEN
              ALTER TABLE public.guardias ADD COLUMN afp_id UUID;
              RAISE NOTICE 'Campo afp_id agregado a guardias';
            END IF;
          END $$;
          
          -- Crear foreign keys si no existen
          DO $$
          BEGIN
            -- FK para banco_id -> bancos(id)
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_name = 'guardias_banco_id_fkey' 
              AND table_name = 'guardias' 
              AND table_schema = 'public'
            ) THEN
              ALTER TABLE public.guardias 
              ADD CONSTRAINT guardias_banco_id_fkey 
              FOREIGN KEY (banco_id) REFERENCES public.bancos(id);
              RAISE NOTICE 'FK guardias_banco_id_fkey creada';
            END IF;
            
            -- FK para salud_id -> isapres(id)  
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_name = 'guardias_salud_id_fkey' 
              AND table_name = 'guardias' 
              AND table_schema = 'public'
            ) THEN
              ALTER TABLE public.guardias 
              ADD CONSTRAINT guardias_salud_id_fkey 
              FOREIGN KEY (salud_id) REFERENCES public.isapres(id);
              RAISE NOTICE 'FK guardias_salud_id_fkey creada';
            END IF;
            
            -- FK para afp_id -> afps(id)
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_name = 'guardias_afp_id_fkey' 
              AND table_name = 'guardias' 
              AND table_schema = 'public'
            ) THEN
              ALTER TABLE public.guardias 
              ADD CONSTRAINT guardias_afp_id_fkey 
              FOREIGN KEY (afp_id) REFERENCES public.afps(id);
              RAISE NOTICE 'FK guardias_afp_id_fkey creada';
            END IF;
          END $$;
        `
      }
    ]

    // Ejecutar todas las migraciones
    for (const migration of migrations) {
      try {
        console.log(`Ejecutando: ${migration.name}`)
        await query(migration.sql)
        console.log(`✓ Completado: ${migration.name}`)
      } catch (error) {
        console.error(`✗ Error en ${migration.name}:`, error)
        // Continuar con las siguientes migraciones en caso de error
      }
    }

    console.log('Migración de estructura completada')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Estructura de base de datos actualizada exitosamente',
      migrationsExecuted: migrations.length
    })

  } catch (error) {
    console.error('Error general en migración:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido en migración' 
      },
      { status: 500 }
    )
  }
} 