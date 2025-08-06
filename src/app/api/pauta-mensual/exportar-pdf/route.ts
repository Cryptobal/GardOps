import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import puppeteer from 'puppeteer';

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

    // Función para obtener el color del estado
    const getColorEstado = (estado: string): string => {
      switch (estado) {
        case 'T':
          return '#3B82F6'; // Azul (Turno Planificado)
        case 'trabajado':
        case 'A':
          return '#10B981'; // Verde (Asistió)
        case 'I':
        case 'inasistencia':
          return '#EF4444'; // Rojo
        case 'R':
        case 'reemplazo':
          return '#F59E0B'; // Amarillo
        case 'S':
        case 'sin_cobertura':
          return '#6B7280'; // Gris
        case 'L':
        case 'libre':
          return '#E5E7EB'; // Gris claro
        case 'P':
        case 'permiso':
          return '#8B5CF6'; // Púrpura
        case 'V':
        case 'vacaciones':
          return '#EC4899'; // Rosa
        case 'M':
        case 'licencia':
          return '#F97316'; // Naranja
        default:
          return '#E5E7EB'; // Gris claro
      }
    };

    // Función para obtener el texto del estado
    const getTextoEstado = (estado: string): string => {
      switch (estado) {
        case 'T':
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

    // Generar HTML para el PDF
    const generateHTML = () => {
      const diasHeaders = diasDelMes.map(dia => {
        const diaSemana = getDiaSemana(parseInt(anio), parseInt(mes), dia);
        return `<th style="width: 25px; text-align: center; font-size: 10px; padding: 2px;">
                  <div>${dia}</div>
                  <div style="font-size: 8px; color: #6B7280;">${diaSemana}</div>
                </th>`;
      }).join('');

      const filasGuardias = puestosResult.rows.map((puesto: any) => {
        const nombreTexto = puesto.es_ppc ? 
          `PPC ${puesto.nombre_puesto}` : 
          `${puesto.nombre_completo || 'Sin asignar'}<br>${puesto.nombre_puesto}`;

        const celdasDias = diasDelMes.map(dia => {
          const pautaDia = pautaResult.rows.find((p: any) => 
            p.puesto_id === puesto.puesto_id && p.dia === dia
          );
          
          const estado = pautaDia?.estado || '';
          const colorEstado = getColorEstado(estado);
          const textoEstado = getTextoEstado(estado);

          return `<td style="width: 25px; height: 25px; text-align: center; background-color: ${colorEstado}; color: white; font-size: 12px; font-weight: bold;">
                    ${textoEstado}
                  </td>`;
        }).join('');

        return `<tr>
                  <td style="width: 120px; padding: 5px; font-size: 10px; border: 1px solid #D1D5DB;">
                    ${nombreTexto}
                  </td>
                  <td style="width: 80px; text-align: center; font-size: 10px; border: 1px solid #D1D5DB;">
                    ${puesto.patron_turno || '-'}
                  </td>
                  ${celdasDias}
                </tr>`;
      }).join('');

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Pauta Mensual</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              color: #1F2937;
              margin-bottom: 5px;
            }
            .subtitle {
              font-size: 14px;
              color: #6B7280;
              margin-bottom: 5px;
            }
            .info {
              font-size: 10px;
              color: #6B7280;
              margin-bottom: 20px;
            }
            .leyenda {
              margin-bottom: 20px;
              font-size: 8px;
            }
            .leyenda-item {
              display: inline-block;
              margin-right: 20px;
              margin-bottom: 5px;
            }
            .leyenda-color {
              display: inline-block;
              width: 8px;
              height: 8px;
              margin-right: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th {
              background-color: #F3F4F6;
              border: 1px solid #D1D5DB;
              padding: 5px;
              text-align: center;
            }
            td {
              border: 1px solid #D1D5DB;
              padding: 2px;
            }
            .footer {
              margin-top: 20px;
              font-size: 8px;
              color: #6B7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PAUTA MENSUAL DE GUARDIAS</div>
            <div class="subtitle">${instalacion.instalacion_nombre}</div>
            ${instalacion.cliente_nombre ? `<div class="subtitle">Cliente: ${instalacion.cliente_nombre}</div>` : ''}
            <div class="subtitle">${getNombreMes(parseInt(mes))} ${anio}</div>
            <div class="info">Dirección: ${instalacion.direccion}</div>
          </div>

          <div class="leyenda">
            <strong>LEYENDA:</strong><br>
            <div class="leyenda-item">
              <span class="leyenda-color" style="background-color: #3B82F6;"></span>T - Turno Planificado
            </div>
            <div class="leyenda-item">
              <span class="leyenda-color" style="background-color: #10B981;"></span>A - Asistió
            </div>
            <div class="leyenda-item">
              <span class="leyenda-color" style="background-color: #EF4444;"></span>I - Inasistencia
            </div>
            <div class="leyenda-item">
              <span class="leyenda-color" style="background-color: #F59E0B;"></span>R - Reemplazo
            </div>
            <div class="leyenda-item">
              <span class="leyenda-color" style="background-color: #6B7280;"></span>S - Sin Cobertura
            </div>
            <div class="leyenda-item">
              <span class="leyenda-color" style="background-color: #E5E7EB;"></span>L - Libre
            </div>
            <div class="leyenda-item">
              <span class="leyenda-color" style="background-color: #8B5CF6;"></span>P - Permiso
            </div>
            <div class="leyenda-item">
              <span class="leyenda-color" style="background-color: #EC4899;"></span>V - Vacaciones
            </div>
            <div class="leyenda-item">
              <span class="leyenda-color" style="background-color: #F97316;"></span>M - Licencia
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 120px; text-align: center;">GUARDIA / PUESTO</th>
                <th style="width: 80px; text-align: center;">ROL</th>
                ${diasHeaders}
              </tr>
            </thead>
            <tbody>
              ${filasGuardias}
            </tbody>
          </table>

          <div class="footer">
            Generado el ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}
          </div>
        </body>
        </html>
      `;
    };

    // Generar PDF usando Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const html = generateHTML();
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });

    await browser.close();

    const filename = `pauta_mensual_${instalacion.instalacion_nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${mes}_${anio}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generando PDF:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 