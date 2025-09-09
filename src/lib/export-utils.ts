import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Puesto {
  puesto_id: string;
  nombre_puesto: string;
  guardia_original: { id: string; nombre: string } | null;
  asignacion_real: string;
  cobertura_real: string | null;
  estado: string;
  observaciones: string | null;
  instalacion_id: string;
  es_ppc: boolean;
}

// Función helper para generar ID corto de puesto
const generarIdCortoPuesto = (puestoId: string | number) => {
  const puestoIdStr = puestoId.toString();
  return `P-${puestoIdStr.slice(-4).toUpperCase()}`;
};

// Función para obtener el estado formateado
const getEstadoFormateado = (puesto: Puesto) => {
  switch (puesto.estado) {
    case 'trabajado': return 'Trabajado';
    case 'reemplazo': return 'Reemplazo';
    case 'sin_cobertura': return 'Sin Cobertura';
    case 'inasistencia': return 'Inasistencia';
    case 'libre': return 'Libre';
    case 'planificado': return 'Asignado';
    case 'vacaciones': return 'Vacaciones';
    case 'permiso': return 'Permiso';
    case 'licencia': return 'Licencia';
    default: return puesto.estado;
  }
};

// Función para obtener el icono del estado
const getEstadoIcono = (puesto: Puesto) => {
  switch (puesto.estado) {
    case 'trabajado': return '✓';
    case 'reemplazo': return '⟲';
    case 'sin_cobertura': return '▲';
    case 'inasistencia': return '✗';
    case 'libre': return '○';
    case 'planificado': return '📋';
    case 'vacaciones': return '🌴';
    case 'permiso': return '🏖';
    case 'licencia': return '🏥';
    default: return '·';
  }
};

// Función para obtener el color del estado
const getEstadoColor = (puesto: Puesto) => {
  switch (puesto.estado) {
    case 'trabajado': return '#10B981'; // Green
    case 'reemplazo': return '#F59E0B'; // Amber
    case 'sin_cobertura': return '#EF4444'; // Red
    case 'inasistencia': return '#EF4444'; // Red
    case 'libre': return '#6B7280'; // Gray
    case 'planificado': return '#3B82F6'; // Blue
    case 'vacaciones': return '#8B5CF6'; // Purple
    case 'permiso': return '#6366F1'; // Indigo
    case 'licencia': return '#EC4899'; // Pink
    default: return '#6B7280'; // Gray
  }
};

export const exportarPautaPDF = (puestos: Puesto[], fecha: string) => {
  // Crear PDF en formato horizontal (landscape)
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // Configurar fuentes y colores
  doc.setFont('helvetica');
  
  // Título principal
  doc.setFontSize(24);
  doc.setTextColor(31, 41, 55); // Gray-800
  doc.text('PAUTA DIARIA', 140, 25, { align: 'center' });
  
  // Fecha
  doc.setFontSize(16);
  doc.setTextColor(107, 114, 128); // Gray-500
  const fechaFormateada = format(new Date(fecha), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es });
  doc.text(fechaFormateada, 140, 35, { align: 'center' });
  
  // Estadísticas
  const estadisticas = {
    asignados: puestos.filter(p => p.estado === 'planificado').length,
    trabajados: puestos.filter(p => p.estado === 'trabajado').length,
    reemplazos: puestos.filter(p => p.estado === 'reemplazo').length,
    sin_cobertura: puestos.filter(p => p.estado === 'sin_cobertura').length
  };
  
  // Dibujar estadísticas
  doc.setFontSize(12);
  doc.setTextColor(107, 114, 128);
  doc.text(`Total: ${puestos.length} puestos`, 20, 50);
  doc.text(`Asignados: ${estadisticas.asignados}`, 20, 60);
  doc.text(`Trabajados: ${estadisticas.trabajados}`, 20, 70);
  doc.text(`Reemplazos: ${estadisticas.reemplazos}`, 20, 80);
  doc.text(`Sin Cobertura: ${estadisticas.sin_cobertura}`, 20, 90);
  
  // Preparar datos para la tabla
  const tableData = puestos.map(puesto => [
    generarIdCortoPuesto(puesto.puesto_id),
    puesto.nombre_puesto,
    puesto.asignacion_real,
    puesto.cobertura_real || 'Sin cobertura',
    `${getEstadoIcono(puesto)} ${getEstadoFormateado(puesto)}`,
    puesto.observaciones || '-'
  ]);
  
  // Configurar tabla
  autoTable(doc, {
    head: [['Puesto', 'Rol del Puesto', 'Asignación', 'Cobertura', 'Estado', 'Observaciones']],
    body: tableData,
    startY: 110,
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [229, 231, 235], // Gray-200
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [31, 41, 55], // Gray-800
      textColor: [255, 255, 255], // White
      fontStyle: 'bold',
      fontSize: 11,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gray-50
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Puesto
      1: { cellWidth: 50 }, // Rol del Puesto
      2: { cellWidth: 60 }, // Asignación
      3: { cellWidth: 60 }, // Cobertura
      4: { cellWidth: 40 }, // Estado
      5: { cellWidth: 60 }, // Observaciones
    },
    didParseCell: function(data) {
      // Colorear estados
      if (data.column.index === 4) { // Columna de estado
        const puesto = puestos[data.row.index];
        const color = getEstadoColor(puesto);
        data.cell.styles.textColor = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
      }
      
      // Resaltar PPCs
      if (data.column.index === 0) { // Columna de puesto
        const puesto = puestos[data.row.index];
        if (puesto.es_ppc) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [139, 92, 246, 0.1]; // Purple con transparencia
        }
      }
    }
  });
  
  // Pie de página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Página ${i} de ${pageCount}`, 140, 200, { align: 'center' });
    doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 140, 205, { align: 'center' });
  }
  
  // Guardar PDF
  const nombreArchivo = `pauta-diaria-${format(new Date(fecha), 'yyyy-MM-dd')}.pdf`;
  doc.save(nombreArchivo);
};

export const exportarPautaExcel = (puestos: Puesto[], fecha: string) => {
  // Crear workbook
  const wb = XLSX.utils.book_new();
  
  // Preparar datos para la hoja principal
  const datosPrincipales = puestos.map(puesto => ({
    'Puesto': generarIdCortoPuesto(puesto.puesto_id),
    'Rol del Puesto': puesto.nombre_puesto,
    'Asignación': puesto.asignacion_real,
    'Cobertura': puesto.cobertura_real || 'Sin cobertura',
    'Estado': getEstadoFormateado(puesto),
    'Es PPC': puesto.es_ppc ? 'Sí' : 'No',
    'Observaciones': puesto.observaciones || ''
  }));
  
  // Crear hoja principal
  const ws = XLSX.utils.json_to_sheet(datosPrincipales);
  
  // Configurar anchos de columna
  ws['!cols'] = [
    { width: 15 }, // Puesto
    { width: 30 }, // Rol del Puesto
    { width: 35 }, // Asignación
    { width: 35 }, // Cobertura
    { width: 20 }, // Estado
    { width: 10 }, // Es PPC
    { width: 40 }  // Observaciones
  ];
  
  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Pauta Diaria');
  
  // Crear hoja de estadísticas
  const estadisticas = {
    asignados: puestos.filter(p => p.estado === 'planificado').length,
    trabajados: puestos.filter(p => p.estado === 'trabajado').length,
    reemplazos: puestos.filter(p => p.estado === 'reemplazo').length,
    sin_cobertura: puestos.filter(p => p.estado === 'sin_cobertura').length,
    ppcs: puestos.filter(p => p.es_ppc).length,
    total: puestos.length
  };
  
  const datosEstadisticas = [
    { 'Métrica': 'Total Puestos', 'Valor': estadisticas.total },
    { 'Métrica': 'Asignados', 'Valor': estadisticas.asignados },
    { 'Métrica': 'Trabajados', 'Valor': estadisticas.trabajados },
    { 'Métrica': 'Reemplazos', 'Valor': estadisticas.reemplazos },
    { 'Métrica': 'Sin Cobertura', 'Valor': estadisticas.sin_cobertura },
    { 'Métrica': 'PPCs', 'Valor': estadisticas.ppcs }
  ];
  
  const wsStats = XLSX.utils.json_to_sheet(datosEstadisticas);
  wsStats['!cols'] = [{ width: 20 }, { width: 15 }];
  XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas');
  
  // Crear hoja de resumen por instalación
  const resumenInstalaciones = puestos.reduce((acc, puesto) => {
    const instalacion = puesto.asignacion_real.split(' - ')[0] || 'Sin nombre';
    if (!acc[instalacion]) {
      acc[instalacion] = { total: 0, asignados: 0, trabajados: 0, reemplazos: 0, sin_cobertura: 0 };
    }
    acc[instalacion].total++;
    
    switch (puesto.estado) {
      case 'planificado': acc[instalacion].asignados++; break;
      case 'trabajado': acc[instalacion].trabajados++; break;
      case 'reemplazo': acc[instalacion].reemplazos++; break;
      case 'sin_cobertura': acc[instalacion].sin_cobertura++; break;
    }
    return acc;
  }, {} as Record<string, any>);
  
  const datosResumen = Object.entries(resumenInstalaciones).map(([instalacion, stats]) => ({
    'Instalación': instalacion,
    'Total': stats.total,
    'Asignados': stats.asignados,
    'Trabajados': stats.trabajados,
    'Reemplazos': stats.reemplazos,
    'Sin Cobertura': stats.sin_cobertura
  }));
  
  const wsResumen = XLSX.utils.json_to_sheet(datosResumen);
  wsResumen['!cols'] = [
    { width: 30 }, // Instalación
    { width: 15 }, // Total
    { width: 15 }, // Asignados
    { width: 15 }, // Trabajados
    { width: 15 }, // Reemplazos
    { width: 15 }  // Sin Cobertura
  ];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen por Instalación');
  
  // Guardar archivo
  const nombreArchivo = `pauta-diaria-${format(new Date(fecha), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
};

// Función para exportar pauta mensual en PDF
export const exportarPautaMensualPDF = (pautaData: any[], diasDelMes: number[], mes: number, anio: number) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // Título
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55);
  const nombreMes = format(new Date(anio, mes - 1), 'MMMM yyyy', { locale: es });
  doc.text(`PAUTA MENSUAL - ${nombreMes.toUpperCase()}`, 140, 20, { align: 'center' });
  
  // Configurar tabla
  const headers = ['Guardia', 'Patrón', ...diasDelMes.map(d => d.toString())];
  
  const tableData = pautaData.map(guardia => {
    const row = [
      guardia.nombre,
      guardia.patron_turno,
      ...guardia.dias.map((dia: string) => {
        // Mapear estados a iconos
        switch (dia) {
          case 'planificado': return '📋';
          case 'trabajado':
          case 'A': return '✓';
          case 'I': return '✗';
          case 'R': return '↻';
          case 'S': return '▲';
          case 'L': return '●';
          default: return '·';
        }
      })
    ];
    return row;
  });
  
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 30,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 40 }, // Guardia
      1: { cellWidth: 30 }, // Patrón
    },
    didParseCell: function(data) {
      // Colorear días según estado
      if (data.column.index > 1) { // Columnas de días
        const estado = data.cell.text[0];
        switch (estado) {
          case '📋': // Turno Planificado
            data.cell.styles.textColor = [59, 130, 246]; // Blue
            break;
          case '✓': // Asistió
            data.cell.styles.textColor = [16, 185, 129]; // Green
            break;
          case '✗': // Falta
            data.cell.styles.textColor = [239, 68, 68]; // Red
            break;
          case '↻': // Reemplazo
            data.cell.styles.textColor = [245, 158, 11]; // Orange
            break;
          case '▲': // Sin cobertura
            data.cell.styles.textColor = [239, 68, 68]; // Red
            break;
        }
      }
    }
  });
  
  // Guardar PDF
  const nombreArchivo = `pauta-mensual-${anio}-${String(mes).padStart(2, '0')}.pdf`;
  doc.save(nombreArchivo);
};

// Función para exportar pauta mensual en Excel
export const exportarPautaMensualExcel = (pautaData: any[], diasDelMes: number[], mes: number, anio: number) => {
  const wb = XLSX.utils.book_new();
  
  // Crear datos para la hoja principal
  const datos = pautaData.map(guardia => {
    const row: any = {
      'Guardia': guardia.nombre,
      'Patrón': guardia.patron_turno
    };
    
    // Agregar días
    diasDelMes.forEach((dia, index) => {
      row[`Día ${dia}`] = guardia.dias[index] || '';
    });
    
    return row;
  });
  
  const ws = XLSX.utils.json_to_sheet(datos);
  
  // Configurar anchos de columna
  const cols = [
    { width: 30 }, // Guardia
    { width: 20 }, // Patrón
    ...diasDelMes.map(() => ({ width: 8 })) // Días
  ];
  ws['!cols'] = cols;
  
  XLSX.utils.book_append_sheet(wb, ws, 'Pauta Mensual');
  
  // Guardar archivo
  const nombreArchivo = `pauta-mensual-${anio}-${String(mes).padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
}; 