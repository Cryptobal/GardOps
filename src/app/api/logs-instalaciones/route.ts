import { NextRequest, NextResponse } from 'next/server';
import { 
  obtenerLogsInstalacion,
  logInstalacionCreada,
  logEdicionDatos,
  logCambioEstado,
  logDocumentoSubido,
  logDocumentoEliminado,
  logGuardiaAsignado,
  logGuardiaRemovido,
  logPuestoCreado,
  logPuestoActualizado,
  logAlertaGenerada
} from '../../../lib/api/logs-instalaciones';

// GET /api/logs-instalaciones - Obtener logs de una instalación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');
    
    if (!instalacionId) {
      return NextResponse.json(
        { success: false, error: 'ID de instalación requerido' },
        { status: 400 }
      );
    }
    
    const logs = await obtenerLogsInstalacion(instalacionId);
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('❌ Error obteniendo logs de instalación:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener logs' },
      { status: 500 }
    );
  }
}

// POST /api/logs-instalaciones - Crear nuevo log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instalacion_id, tipo_evento, descripcion, datos_anteriores, datos_nuevos } = body;
    
    if (!instalacion_id || !tipo_evento || !descripcion) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    // Registrar el log según el tipo de evento
    switch (tipo_evento) {
      case 'INSTALACION_CREADA':
        await logInstalacionCreada(instalacion_id, descripcion.split('"')[1] || 'Nueva instalación');
        break;
      case 'DATOS_EDITADOS':
        await logEdicionDatos(instalacion_id, descripcion, datos_anteriores, datos_nuevos);
        break;
      case 'CAMBIO_ESTADO':
        const estadoMatch = descripcion.match(/de "([^"]*)" a "([^"]*)"/);
        if (estadoMatch) {
          await logCambioEstado(instalacion_id, estadoMatch[2], estadoMatch[1]);
        }
        break;
      case 'DOCUMENTO_SUBIDO':
        await logDocumentoSubido(instalacion_id, descripcion, 'Documento');
        break;
      case 'DOCUMENTO_ELIMINADO':
        await logDocumentoEliminado(instalacion_id, descripcion);
        break;
      case 'GUARDIA_ASIGNADO':
        await logGuardiaAsignado(instalacion_id, descripcion);
        break;
      case 'GUARDIA_REMOVIDO':
        await logGuardiaRemovido(instalacion_id, descripcion);
        break;
      case 'PUESTO_CREADO':
        await logPuestoCreado(instalacion_id, descripcion);
        break;
      case 'PUESTO_ACTUALIZADO':
        await logPuestoActualizado(instalacion_id, descripcion, 'Cambios generales');
        break;
      case 'ALERTA_GENERADA':
        await logAlertaGenerada(instalacion_id, 'Sistema', descripcion);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de evento no válido' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Log registrado correctamente' 
    });
  } catch (error) {
    console.error('❌ Error registrando log:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar log' },
      { status: 500 }
    );
  }
}