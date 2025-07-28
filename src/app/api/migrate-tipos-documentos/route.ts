import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Iniciando migración de tipos de documentos...');

    // 1. Crear tabla tipos_documentos
    console.log('📋 Creando tabla tipos_documentos...');
    await query(`
      CREATE TABLE IF NOT EXISTS tipos_documentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        modulo TEXT NOT NULL,
        nombre TEXT NOT NULL,
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT now()
      );
    `);

    // 2. Agregar columna tipo_documento_id a la tabla documentos si no existe
    console.log('🔗 Verificando columna tipo_documento_id en documentos...');
    const columnExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' 
        AND column_name = 'tipo_documento_id'
      );
    `);

    if (!columnExists.rows[0].exists) {
      console.log('➕ Agregando columna tipo_documento_id a documentos...');
      await query(`
        ALTER TABLE documentos 
        ADD COLUMN tipo_documento_id UUID REFERENCES tipos_documentos(id);
      `);
    }

    // 3. Insertar tipos de documentos por defecto
    console.log('📝 Insertando tipos de documentos por defecto...');
    const tiposDefault = [
      { modulo: 'clientes', nombre: 'Contrato' },
      { modulo: 'clientes', nombre: 'Factura' },
      { modulo: 'clientes', nombre: 'Certificado' },
      { modulo: 'clientes', nombre: 'Identificación' },
      { modulo: 'guardias', nombre: 'Contrato Laboral' },
      { modulo: 'guardias', nombre: 'Certificado Médico' },
      { modulo: 'guardias', nombre: 'Antecedentes' },
      { modulo: 'guardias', nombre: 'Certificado de Capacitación' },
      { modulo: 'instalaciones', nombre: 'Plano' },
      { modulo: 'instalaciones', nombre: 'Certificado de Seguridad' },
      { modulo: 'instalaciones', nombre: 'Manual de Procedimientos' },
      { modulo: 'pautas', nombre: 'Pauta Mensual' },
      { modulo: 'pautas', nombre: 'Pauta Diaria' },
      { modulo: 'planillas', nombre: 'Planilla de Asistencia' },
      { modulo: 'planillas', nombre: 'Planilla de Horas Extras' },
    ];

    for (const tipo of tiposDefault) {
      // Verificar si ya existe
      const existe = await query(`
        SELECT id FROM tipos_documentos 
        WHERE modulo = $1 AND nombre = $2
      `, [tipo.modulo, tipo.nombre]);

      if (existe.rows.length === 0) {
        await query(`
          INSERT INTO tipos_documentos (modulo, nombre, activo, creado_en)
          VALUES ($1, $2, true, NOW())
        `, [tipo.modulo, tipo.nombre]);
        console.log(`✅ Creado tipo: ${tipo.modulo} - ${tipo.nombre}`);
      } else {
        console.log(`⏭️ Tipo ya existe: ${tipo.modulo} - ${tipo.nombre}`);
      }
    }

    // 4. Verificar que todo se creó correctamente
    const tiposCount = await query(`
      SELECT COUNT(*) as total FROM tipos_documentos WHERE activo = true
    `);

    console.log('✅ Migración completada exitosamente');
    console.log(`📊 Total de tipos de documentos: ${tiposCount.rows[0].total}`);

    return NextResponse.json({
      success: true,
      message: 'Migración de tipos de documentos completada',
      data: {
        tiposCount: tiposCount.rows[0].total,
        tiposDefault: tiposDefault.length
      }
    });

  } catch (error) {
    console.error('❌ Error en migración de tipos de documentos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error en migración de tipos de documentos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 