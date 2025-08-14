import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { PayrollItemExtraSchema, CreatePayrollItemExtraSchema, UpdatePayrollItemExtraSchema } from '@/lib/schemas/payroll';

// GET - Obtener ítems extras por payroll run
export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const payrollRunId = searchParams.get('payroll_run_id');
    const instalacionId = searchParams.get('instalacion_id');
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const q = searchParams.get('q'); // Parámetro de búsqueda

    if (!payrollRunId && (!instalacionId || !mes || !anio)) {
      return NextResponse.json(
        { error: 'Se requiere payroll_run_id o la combinación de instalacion_id, mes y anio' },
        { status: 400 }
      );
    }

    let sql = `
      SELECT 
        pie.id,
        pie.payroll_run_id,
        pie.guardia_id,
        pie.item_id,
        pie.tipo,
        pie.nombre,
        pie.monto,
        pie.glosa,
        pie.created_at,
        pie.updated_at,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut as guardia_rut,
        i.nombre as instalacion_nombre,
        si.nombre as item_nombre,
        si.clase as item_clase,
        si.naturaleza as item_naturaleza
      FROM payroll_items_extras pie
      JOIN guardias g ON pie.guardia_id = g.id
      JOIN payroll_run pr ON pie.payroll_run_id = pr.id
      JOIN instalaciones i ON g.instalacion_id = i.id
      LEFT JOIN sueldo_item si ON pie.item_id = si.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (payrollRunId) {
      sql += ` AND pie.payroll_run_id = $${paramIndex}`;
      params.push(payrollRunId);
      paramIndex++;
    } else {
      sql += ` AND g.instalacion_id = $${paramIndex} AND pr.mes = $${paramIndex + 1} AND pr.anio = $${paramIndex + 2}`;
      params.push(instalacionId, parseInt(mes!), parseInt(anio!));
      paramIndex += 3;
    }

    // Agregar búsqueda por texto
    if (q) {
      sql += ` AND (
        g.nombre ILIKE $${paramIndex} OR 
        g.apellido_paterno ILIKE $${paramIndex} OR 
        g.apellido_materno ILIKE $${paramIndex} OR 
        pie.nombre ILIKE $${paramIndex} OR 
        pie.glosa ILIKE $${paramIndex} OR
        si.nombre ILIKE $${paramIndex}
      )`;
      params.push(`%${q}%`);
      paramIndex++;
    }

    sql += ` ORDER BY g.apellido_paterno, g.apellido_materno, g.nombre, pie.nombre`;

    const result = await query(sql, params);

    // Transformar los datos para incluir nombre completo
    const items = result.rows.map((row: any) => ({
      ...row,
      guardia_nombre_completo: `${row.guardia_nombre} ${row.apellido_paterno} ${row.apellido_materno}`.trim(),
    }));

    return NextResponse.json({ data: items });

  } catch (error) {
    console.error('Error al obtener ítems extras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo ítem extra
export async function POST(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const body = await request.json();
    
    // Validar datos de entrada
    const validatedData = CreatePayrollItemExtraSchema.parse(body);

    // Verificar si ya existe un payroll run para la instalación/mes/año
    let payrollRunId = validatedData.payroll_run_id;
    
    if (!payrollRunId) {
      // Buscar o crear payroll run
      const payrollRunResult = await query(`
        SELECT id FROM payroll_run 
        WHERE instalacion_id = $1 AND mes = $2 AND anio = $3
      `, [validatedData.instalacion_id, validatedData.mes, validatedData.anio]);

      if (payrollRunResult.rows.length === 0) {
        // Crear nuevo payroll run
        const newPayrollRun = await query(`
          INSERT INTO payroll_run (instalacion_id, mes, anio, estado)
          VALUES ($1, $2, $3, 'borrador')
          RETURNING id
        `, [validatedData.instalacion_id, validatedData.mes, validatedData.anio]);
        
        payrollRunId = newPayrollRun.rows[0].id;
      } else {
        payrollRunId = payrollRunResult.rows[0].id;
      }
    }

    // Verificar si ya existe un ítem con el mismo nombre y tipo para el guardia
    const existingItem = await query(`
      SELECT id FROM payroll_items_extras 
      WHERE payroll_run_id = $1 AND guardia_id = $2 AND nombre = $3 AND tipo = $4
    `, [payrollRunId, validatedData.guardia_id, validatedData.nombre, validatedData.tipo]);

    if (existingItem.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un ítem con el mismo nombre y tipo para este guardia' },
        { status: 409 }
      );
    }

    // Insertar el nuevo ítem
    const result = await query(`
      INSERT INTO payroll_items_extras (payroll_run_id, guardia_id, item_id, tipo, nombre, monto, glosa)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [payrollRunId, validatedData.guardia_id, validatedData.item_id, validatedData.tipo, validatedData.nombre, validatedData.monto, validatedData.glosa]);

    return NextResponse.json({ 
      data: result.rows[0],
      message: 'Ítem extra creado correctamente'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear ítem extra:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar ítem extra
export async function PUT(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID del ítem' },
        { status: 400 }
      );
    }

    // Validar datos de entrada
    const validatedData = UpdatePayrollItemExtraSchema.parse(updateData);

    // Verificar si el ítem existe
    const existingItem = await query(`
      SELECT * FROM payroll_items_extras WHERE id = $1
    `, [id]);

    if (existingItem.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si ya existe otro ítem con el mismo nombre y tipo para el guardia
    if (validatedData.nombre || validatedData.tipo) {
      const currentItem = existingItem.rows[0];
      const checkDuplicate = await query(`
        SELECT id FROM payroll_items_extras 
        WHERE payroll_run_id = $1 AND guardia_id = $2 AND nombre = $3 AND tipo = $4 AND id != $5
      `, [
        currentItem.payroll_run_id,
        currentItem.guardia_id,
        validatedData.nombre || currentItem.nombre,
        validatedData.tipo || currentItem.tipo,
        id
      ]);

      if (checkDuplicate.rows.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe un ítem con el mismo nombre y tipo para este guardia' },
          { status: 409 }
        );
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await query(`
      UPDATE payroll_items_extras 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    return NextResponse.json({ 
      data: result.rows[0],
      message: 'Ítem extra actualizado correctamente'
    });

  } catch (error: any) {
    console.error('Error al actualizar ítem extra:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar ítem extra
export async function DELETE(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID del ítem' },
        { status: 400 }
      );
    }

    // Verificar si el ítem existe
    const existingItem = await query(`
      SELECT id FROM payroll_items_extras WHERE id = $1
    `, [id]);

    if (existingItem.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el ítem
    await query(`
      DELETE FROM payroll_items_extras WHERE id = $1
    `, [id]);

    return NextResponse.json({ 
      message: 'Ítem extra eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar ítem extra:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
