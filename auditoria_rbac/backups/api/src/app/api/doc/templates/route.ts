import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { extractVars } from '@/lib/vars';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// GET /api/doc/templates - Obtener todas las plantillas
export async function GET() {
  try {
    // Verificar si la tabla existe, si no, crearla
    await ensureDocTemplatesTable();
    
    const result = await query(`
      SELECT id, name, content_html, variables, created_at, updated_at
      FROM doc_templates
      ORDER BY updated_at DESC
    `);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('❌ Error en GET /api/doc/templates:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener plantillas' },
      { status: 500 }
    );
  }
}

// POST /api/doc/templates - Crear nueva plantilla
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content_html } = body;
    
    // Validar datos requeridos
    if (!name || !content_html) {
      return NextResponse.json(
        { success: false, error: 'Nombre y contenido son requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar si la tabla existe, si no, crearla
    await ensureDocTemplatesTable();
    
    // Extraer variables del contenido HTML
    const variables = extractVars(content_html);
    
    // Insertar nueva plantilla
    const result = await query(`
      INSERT INTO doc_templates (name, content_html, variables)
      VALUES ($1, $2, $3)
      RETURNING id, name, content_html, variables, created_at, updated_at
    `, [name, content_html, variables]);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Plantilla creada correctamente'
    }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error en POST /api/doc/templates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear plantilla' },
      { status: 500 }
    );
  }
}

// Función para asegurar que existe la tabla doc_templates
async function ensureDocTemplatesTable() {
  try {
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'doc_templates'
      );
    `);

    if (!checkTable.rows[0].exists) {
      console.log('📊 Creando tabla doc_templates...');
      
      await query(`
        CREATE TABLE doc_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          content_html TEXT NOT NULL,
          variables TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Crear índices para mejorar rendimiento
      await query(`
        CREATE INDEX idx_doc_templates_name ON doc_templates(name);
        CREATE INDEX idx_doc_templates_updated_at ON doc_templates(updated_at);
      `);
      
      console.log('✅ Tabla doc_templates creada exitosamente');
    }
  } catch (error) {
    console.error('❌ Error creando tabla doc_templates:', error);
    throw error;
  }
}
