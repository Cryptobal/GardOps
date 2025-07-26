import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    console.log('Obteniendo lista de guardias...')
    
    const result = await query(`
      SELECT 
        g.*,
        i.nombre as instalacion_nombre,
        b.codigo as banco_codigo,
        b.nombre as banco_nombre,
        isp.nombre as salud_nombre,
        a.nombre as afp_nombre
      FROM guardias g
      LEFT JOIN instalaciones i ON g.instalacion_id = i.id
      LEFT JOIN bancos b ON g.banco_id = b.id
      LEFT JOIN isapres isp ON g.salud_id = isp.id
      LEFT JOIN afps a ON g.afp_id = a.id
      ORDER BY g.created_at DESC
    `)

    console.log(`Guardias encontrados: ${result.rows.length}`)
    
    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error al obtener guardias:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Creando nuevo guardia...')
    
    const body = await request.json()
    console.log('Datos recibidos:', JSON.stringify(body, null, 2))

    // Validar campos obligatorios
    const requiredFields = [
      'nombre', 'apellido_paterno', 'apellido_materno', 'rut', 
      'fecha_nacimiento', 'celular', 'instalacion_id', 'jornada',
      'direccion', 'banco_id', 'tipo_cuenta', 'salud_id', 'afp_id', 
      'email', 'estado'
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `Campo obligatorio faltante: ${field}`
        }, { status: 400 })
      }
    }

    // Insertar en la base de datos
    const insertQuery = `
      INSERT INTO guardias (
        nombre, apellido_paterno, apellido_materno, rut, fecha_nacimiento,
        celular, instalacion_id, jornada, direccion, lat, lng, comuna, ciudad,
        banco_id, tipo_cuenta, salud_id, afp_id, email, estado
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `

    const values = [
      body.nombre,
      body.apellido_paterno, 
      body.apellido_materno,
      body.rut,
      body.fecha_nacimiento,
      body.celular,
      body.instalacion_id,
      body.jornada,
      body.direccion,
      body.lat || null,
      body.lng || null,
      body.comuna || '',
      body.ciudad || '',
      body.banco_id,
      body.tipo_cuenta,
      body.salud_id,
      body.afp_id,
      body.email,
      body.estado
    ]

    console.log('Ejecutando consulta INSERT:', insertQuery)
    console.log('Valores:', values)

    const result = await query(insertQuery, values)
    
    if (result.rows.length === 0) {
      throw new Error('No se pudo insertar el guardia')
    }

    const newGuardia = result.rows[0]
    console.log('Guardia creado exitosamente:', newGuardia.id)

    return NextResponse.json({
      success: true,
      data: newGuardia,
      message: 'Guardia creado exitosamente'
    })

  } catch (error) {
    console.error('Error al crear guardia:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear guardia'
    }, { status: 500 })
  }
} 