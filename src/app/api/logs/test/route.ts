import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { v4 as uuid } from 'uuid';

const tablas = [
  { modulo: 'guardias', campoId: 'guardia_id', entidad: 'guardias', tieneDatosAnteriores: true },
  { modulo: 'pauta_mensual', campoId: 'pauta_mensual_id', entidad: 'pautas_mensuales', tieneDatosAnteriores: true },
  { modulo: 'pauta_diaria', campoId: 'pauta_diaria_id', entidad: 'pautas_diarias', tieneDatosAnteriores: true },
  { modulo: 'turnos_extras', campoId: 'turno_extra_id', entidad: 'turnos_extras', tieneDatosAnteriores: true },
  { modulo: 'puestos_operativos', campoId: 'puesto_operativo_id', entidad: 'as_turnos_puestos_operativos', tieneDatosAnteriores: true },
  { modulo: 'documentos', campoId: 'documento_id', entidad: 'documentos', tieneDatosAnteriores: true },
  { modulo: 'usuarios', campoId: 'usuario_id', entidad: 'usuarios', tieneDatosAnteriores: true },
  { modulo: 'instalaciones', campoId: 'instalacion_id', entidad: 'instalaciones', tieneDatosAnteriores: false },
  { modulo: 'clientes', campoId: 'cliente_id', entidad: 'clientes', tieneDatosAnteriores: false },
];

export async function GET() {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'logs', action: 'read:list' });
if (deny) return deny;

  const logsInsertados: string[] = [];
  const errores: string[] = [];

  for (const { modulo, campoId, entidad, tieneDatosAnteriores } of tablas) {
    try {
      // Verificar si la entidad existe y tiene datos
      const entidadRes = await query(`SELECT id FROM ${entidad} LIMIT 1`);
      if (entidadRes.rowCount === 0) {
        errores.push(`${modulo}: No hay datos en ${entidad}`);
        continue;
      }

      const entidadId = entidadRes.rows[0].id;
      const tablaLog = `logs_${modulo}`;

      // Verificar si la tabla de logs existe
      const tablaExiste = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tablaLog]);

      if (!tablaExiste.rows[0].exists) {
        errores.push(`${modulo}: Tabla ${tablaLog} no existe`);
        continue;
      }

      // Insertar log de prueba según la estructura de la tabla
      if (tieneDatosAnteriores) {
        // Estructura nueva con datos_anteriores y datos_nuevos
        await query(
          `INSERT INTO ${tablaLog} (${campoId}, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            entidadId,
            'Prueba automática',
            'auto@test.cl',
            'sistema',
            'Validación de logging',
            JSON.stringify({ before: null }),
            JSON.stringify({ after: 'log test OK' }),
          ]
        );
      } else {
        // Estructura antigua sin datos_anteriores y datos_nuevos
        await query(
          `INSERT INTO ${tablaLog} (${campoId}, accion, usuario, tipo, contexto, fecha)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            entidadId,
            'Prueba automática',
            'auto@test.cl',
            'sistema',
            'Validación de logging',
          ]
        );
      }

      logsInsertados.push(modulo);
    } catch (error) {
      console.error(`Error insertando log en ${modulo}:`, error.message);
      errores.push(`${modulo}: ${error.message}`);
    }
  }

  return NextResponse.json({
    status: 'ok',
    logsInsertados,
    errores,
    total: logsInsertados.length,
    mensaje: `Se insertaron logs de prueba para ${logsInsertados.length} módulos.`,
    timestamp: new Date().toISOString(),
  });
} 