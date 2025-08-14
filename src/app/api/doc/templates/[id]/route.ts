import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { extractVars } from '@/lib/vars';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// GET /api/doc/templates/[id] - Obtener plantilla por ID
export async function GET(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'doc', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'doc', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'doc', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const result = await query(`
      SELECT id, name, content_html, variables, created_at, updated_at
      FROM doc_templates
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error en GET /api/doc/templates/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener plantilla' },
      { status: 500 }
    );
  }
}

// PUT /api/doc/templates/[id] - Actualizar plantilla
export async function PUT(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'doc', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'doc', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'doc', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, content_html } = body;
    
    // Validar datos requeridos
    if (!name || !content_html) {
      return NextResponse.json(
        { success: false, error: 'Nombre y contenido son requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar que la plantilla existe
    const checkResult = await query(`
      SELECT id FROM doc_templates WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }
    
    // Extraer variables del contenido HTML
    const variables = extractVars(content_html);
    
    // Actualizar plantilla
    const result = await query(`
      UPDATE doc_templates 
      SET name = $1, content_html = $2, variables = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, content_html, variables, created_at, updated_at
    `, [name, content_html, variables, id]);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Plantilla actualizada correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error en PUT /api/doc/templates/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar plantilla' },
      { status: 500 }
    );
  }
}

// DELETE /api/doc/templates/[id] - Eliminar plantilla
export async function DELETE(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'doc', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'doc', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'doc', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Verificar que la plantilla existe
    const checkResult = await query(`
      SELECT id FROM doc_templates WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }
    
    // Eliminar plantilla
    await query(`
      DELETE FROM doc_templates WHERE id = $1
    `, [id]);
    
    return NextResponse.json({
      success: true,
      message: 'Plantilla eliminada correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error en DELETE /api/doc/templates/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar plantilla' },
      { status: 500 }
    );
  }
}
