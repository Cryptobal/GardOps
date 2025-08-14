import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'migrate_alertas_documentos', action: 'read:list' });
if (deny) return deny;

  try {
    console.log('🚀 Iniciando migración completa de sistema de vencimientos y alertas documentales...');

    // 1. Modificar tabla tipos_documentos
    console.log('📋 Agregando campos de vencimiento a tipos_documentos...');
    
    // Verificar si las columnas ya existen
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tipos_documentos' 
      AND column_name IN ('requiere_vencimiento', 'dias_antes_alarma');
    `);

    const existingColumns = columnCheck.rows.map((row: any) => row.column_name);

    if (!existingColumns.includes('requiere_vencimiento')) {
      await query(`
        ALTER TABLE tipos_documentos 
        ADD COLUMN requiere_vencimiento BOOLEAN DEFAULT false;
      `);
      console.log('✅ Columna requiere_vencimiento agregada');
    }

    if (!existingColumns.includes('dias_antes_alarma')) {
      await query(`
        ALTER TABLE tipos_documentos 
        ADD COLUMN dias_antes_alarma INT DEFAULT 30;
      `);
      console.log('✅ Columna dias_antes_alarma agregada');
    }

    // 2. Modificar tabla documentos
    console.log('📋 Agregando campo fecha_vencimiento a documentos...');
    
    const docColumnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documentos' 
      AND column_name = 'fecha_vencimiento';
    `);

    if (docColumnCheck.rows.length === 0) {
      await query(`
        ALTER TABLE documentos 
        ADD COLUMN fecha_vencimiento DATE;
      `);
      console.log('✅ Columna fecha_vencimiento agregada a documentos');
    }

    // 3. Crear tabla alertas_documentos
    console.log('📋 Creando tabla alertas_documentos...');
    await query(`
      CREATE TABLE IF NOT EXISTS alertas_documentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        documento_id UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
        dias_restantes INT NOT NULL,
        mensaje TEXT NOT NULL,
        creada_en TIMESTAMP DEFAULT now(),
        leida BOOLEAN DEFAULT false,
        tenant_id UUID NOT NULL
      );
    `);

    // Crear índices para rendimiento
    await query(`
      CREATE INDEX IF NOT EXISTS idx_alertas_documentos_documento_id 
      ON alertas_documentos(documento_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_alertas_documentos_tenant_leida 
      ON alertas_documentos(tenant_id, leida);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_alertas_documentos_dias_restantes 
      ON alertas_documentos(dias_restantes);
    `);

    console.log('✅ Tabla alertas_documentos creada con índices');

    // 4. Verificar estructura final
    console.log('📋 Verificando estructura de tipos_documentos:');
    const tiposStructure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tipos_documentos' 
      ORDER BY ordinal_position;
    `);

    tiposStructure.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });

    console.log('📋 Verificando estructura de documentos:');
    const docStructure = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'documentos' 
      ORDER BY ordinal_position;
    `);

    docStructure.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    console.log('📋 Verificando estructura de alertas_documentos:');
    const alertasStructure = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'alertas_documentos' 
      ORDER BY ordinal_position;
    `);

    alertasStructure.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    console.log('🎉 Migración completa del sistema de vencimientos y alertas documentales completada exitosamente!');

    return NextResponse.json({ 
      success: true, 
      message: "Sistema de vencimientos y alertas documentales migrado exitosamente",
      structures: {
        tipos_documentos: tiposStructure.rows,
        documentos: docStructure.rows,
        alertas_documentos: alertasStructure.rows
      }
    });

  } catch (error: any) {
    console.error('❌ Error en migración:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 