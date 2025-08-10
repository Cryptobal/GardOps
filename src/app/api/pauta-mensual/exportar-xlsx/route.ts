import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import * as XLSX from 'xlsx';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instalacion_id = searchParams.get('instalacion_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    if (!instalacion_id || !anio || !mes) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id, anio, mes' },
        { status: 400 }
      );
    }

    // Obtener información de la instalación
    const instalacionResult = await query(`
      SELECT 
        i.nombre as instalacion_nombre,
        i.direccion,
        c.nombre as cliente_nombre
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE i.id = $1
    `, [instalacion_id]);

    if (instalacionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    const instalacion = instalacionResult.rows[0];

    // Obtener la pauta mensual
    const pautaResult = await query(`
      SELECT 
        pm.puesto_id,
        pm.guardia_id,
        pm.dia,
        pm.estado,
        po.nombre_puesto,
        po.es_ppc,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
        te.guardia_id as cobertura_guardia_id,
        rg.nombre as cobertura_nombre,
        rg.apellido_paterno as cobertura_apellido_paterno,
        rg.apellido_materno as cobertura_apellido_materno,
        te.estado as tipo_cobertura
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN TE_turnos_extras te ON pm.id = te.pauta_id
      LEFT JOIN guardias rg ON te.guardia_id = rg.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
        AND po.activo = true
      ORDER BY po.nombre_puesto, pm.dia
    `, [instalacion_id, anio, mes]);

    // Obtener todos los puestos operativos
    const puestosResult = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacion_id]);

    // Generar días del mes
    const diasDelMes = Array.from(
      { length: new Date(parseInt(anio), parseInt(mes), 0).getDate() }, 
      (_, i) => i + 1
    );

    // Función para obtener el nombre del mes
    const getNombreMes = (mes: number): string => {
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return meses[mes - 1];
    };

    // Función para obtener el día de la semana
    const getDiaSemana = (anio: number, mes: number, dia: number): string => {
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const fecha = new Date(anio, mes - 1, dia);
      return dias[fecha.getDay()];
    };

    // Función para obtener el texto del estado
    const getTextoEstado = (estado: string): string => {
      switch (estado) {
        case 'planificado':
          return 'T';
        case 'trabajado':
        case 'A':
          return 'A';
        case 'I':
        case 'inasistencia':
          return 'I';
        case 'R':
        case 'reemplazo':
          return 'R';
        case 'S':
        case 'sin_cobertura':
          return 'S';
        case 'L':
        case 'libre':
          return 'L';
        case 'P':
        case 'permiso':
          return 'P';
        case 'V':
        case 'vacaciones':
          return 'V';
        case 'M':
        case 'licencia':
          return 'M';
        default:
          return '';
      }
    };

    // Crear el workbook
    const workbook = XLSX.utils.book_new();

    // Crear la hoja principal de la pauta
    const pautaData: any[] = [];

    // Encabezado del documento
    pautaData.push(['PAUTA MENSUAL DE GUARDIAS']);
    pautaData.push([]);
    pautaData.push([`Instalación: ${instalacion.instalacion_nombre}`]);
    if (instalacion.cliente_nombre) {
      pautaData.push([`Cliente: ${instalacion.cliente_nombre}`]);
    }
    pautaData.push([`Período: ${getNombreMes(parseInt(mes))} ${anio}`]);
    pautaData.push([`Dirección: ${instalacion.direccion}`]);
    pautaData.push([]);

    // Leyenda
    pautaData.push(['LEYENDA:']);
    pautaData.push(['T', 'Turno Planificado']);
    pautaData.push(['A', 'Asistió']);
    pautaData.push(['I', 'Inasistencia']);
    pautaData.push(['R', 'Reemplazo']);
    pautaData.push(['S', 'Sin Cobertura']);
    pautaData.push(['L', 'Libre']);
    pautaData.push(['P', 'Permiso']);
    pautaData.push(['V', 'Vacaciones']);
    pautaData.push(['M', 'Licencia']);
    pautaData.push([]);

    // Encabezados de la tabla
    const headers = ['Guardia / Puesto', 'Rol'];
    diasDelMes.forEach(dia => {
      const diaSemana = getDiaSemana(parseInt(anio), parseInt(mes), dia);
      headers.push(`${dia}\n${diaSemana}`);
    });
    pautaData.push(headers);

    // Datos de la pauta
    puestosResult.rows.forEach((puesto: any) => {
      const row: any[] = [];
      
      // Nombre del guardia/puesto
      const nombreTexto = puesto.es_ppc ? 
        `PPC ${puesto.nombre_puesto}` : 
        `${puesto.nombre_completo || 'Sin asignar'} - ${puesto.nombre_puesto}`;
      row.push(nombreTexto);
      
      // Rol
      row.push(puesto.patron_turno || '-');
      
      // Días del mes
      diasDelMes.forEach(dia => {
        const pautaDia = pautaResult.rows.find((p: any) => 
          p.puesto_id === puesto.puesto_id && p.dia === dia
        );
        const estado = pautaDia?.estado || '';
        row.push(getTextoEstado(estado));
      });
      
      pautaData.push(row);
    });

    // Crear la hoja de la pauta
    const pautaSheet = XLSX.utils.aoa_to_sheet(pautaData);

    // Configurar estilos para la hoja de la pauta
    pautaSheet['!cols'] = [
      { width: 30 }, // Guardia / Puesto
      { width: 12 }, // Rol
      ...diasDelMes.map(() => ({ width: 8 })) // Días del mes
    ];

    // Configurar estilos para las celdas
    const range = XLSX.utils.decode_range(pautaSheet['!ref'] || 'A1');
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = pautaSheet[cellAddress];
        
        if (cell) {
          // Estilo para el título principal
          if (R === 0) {
            cell.s = {
              font: { bold: true, size: 16, color: { rgb: '1F2937' } },
              alignment: { horizontal: 'center' }
            };
          }
          // Estilo para información de la instalación
          else if (R >= 2 && R <= 6) {
            cell.s = {
              font: { size: 12, color: { rgb: '6B7280' } }
            };
          }
          // Estilo para la leyenda
          else if (R === 8) {
            cell.s = {
              font: { bold: true, size: 12, color: { rgb: '374151' } }
            };
          }
          else if (R >= 9 && R <= 17) {
            cell.s = {
              font: { size: 11, color: { rgb: '374151' } }
            };
          }
          // Estilo para los encabezados de la tabla
          else if (R === 19) {
            cell.s = {
              font: { bold: true, size: 10, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '374151' } },
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              border: {
                top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                right: { style: 'thin', color: { rgb: 'D1D5DB' } }
              }
            };
          }
          // Estilo para las filas de datos
          else if (R > 19) {
            cell.s = {
              font: { size: 9, color: { rgb: '374151' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                right: { style: 'thin', color: { rgb: 'D1D5DB' } }
              }
            };
            
            // Colorear las celdas según el estado
            if (C >= 2 && cell.v) {
              const estado = cell.v.toString();
              switch (estado) {
                case 'T':
                  cell.s.fill = { fgColor: { rgb: '10B981' } };
                  cell.s.font.color = { rgb: 'FFFFFF' };
                  break;
                case 'I':
                  cell.s.fill = { fgColor: { rgb: 'EF4444' } };
                  cell.s.font.color = { rgb: 'FFFFFF' };
                  break;
                case 'R':
                  cell.s.fill = { fgColor: { rgb: 'F59E0B' } };
                  cell.s.font.color = { rgb: 'FFFFFF' };
                  break;
                case 'S':
                  cell.s.fill = { fgColor: { rgb: '6B7280' } };
                  cell.s.font.color = { rgb: 'FFFFFF' };
                  break;
                case 'L':
                  cell.s.fill = { fgColor: { rgb: '3B82F6' } };
                  cell.s.font.color = { rgb: 'FFFFFF' };
                  break;
                case 'P':
                  cell.s.fill = { fgColor: { rgb: '8B5CF6' } };
                  cell.s.font.color = { rgb: 'FFFFFF' };
                  break;
                case 'V':
                  cell.s.fill = { fgColor: { rgb: 'EC4899' } };
                  cell.s.font.color = { rgb: 'FFFFFF' };
                  break;
                case 'M':
                  cell.s.fill = { fgColor: { rgb: 'F97316' } };
                  cell.s.font.color = { rgb: 'FFFFFF' };
                  break;
              }
            }
          }
        }
      }
    }

    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(workbook, pautaSheet, 'Pauta Mensual');

    // Crear hoja de resumen
    const resumenData: any[] = [];
    resumenData.push(['RESUMEN DE PAUTA MENSUAL']);
    resumenData.push([]);
    resumenData.push([`Instalación: ${instalacion.instalacion_nombre}`]);
    resumenData.push([`Período: ${getNombreMes(parseInt(mes))} ${anio}`]);
    resumenData.push([]);

    // Estadísticas por estado
    const estadisticas: { [key: string]: number } = {};
    puestosResult.rows.forEach((puesto: any) => {
      diasDelMes.forEach(dia => {
        const pautaDia = pautaResult.rows.find((p: any) => 
          p.puesto_id === puesto.puesto_id && p.dia === dia
        );
        const estado = pautaDia?.estado || '';
        const textoEstado = getTextoEstado(estado);
        if (textoEstado) {
          estadisticas[textoEstado] = (estadisticas[textoEstado] || 0) + 1;
        }
      });
    });

    resumenData.push(['ESTADÍSTICAS POR ESTADO']);
    resumenData.push(['Estado', 'Cantidad', 'Porcentaje']);
    
    const totalDias = puestosResult.rows.length * diasDelMes.length;
    Object.entries(estadisticas).forEach(([estado, cantidad]) => {
      const porcentaje = ((cantidad / totalDias) * 100).toFixed(1);
      resumenData.push([estado, cantidad, `${porcentaje}%`]);
    });

    resumenData.push([]);
    resumenData.push(['INFORMACIÓN GENERAL']);
    resumenData.push(['Total de puestos', puestosResult.rows.length]);
    resumenData.push(['Días del mes', diasDelMes.length]);
    resumenData.push(['Total de asignaciones', totalDias]);
    resumenData.push(['Días trabajados', estadisticas['planificado'] || 0]);
    resumenData.push(['Días con inasistencia', estadisticas['I'] || 0]);
    resumenData.push(['Días con reemplazo', estadisticas['R'] || 0]);

    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
    
    // Configurar estilos para la hoja de resumen
    resumenSheet['!cols'] = [
      { width: 25 },
      { width: 15 },
      { width: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');

    // Generar el archivo XLSX
    const xlsxBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });

    const filename = `pauta_mensual_${instalacion.instalacion_nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${mes}_${anio}.xlsx`;

    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': xlsxBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generando XLSX:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 