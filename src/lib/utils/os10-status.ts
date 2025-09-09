export interface OS10Status {
  estado: 'vigente' | 'por_vencer' | 'vencido' | 'sin_fecha';
  dias_restantes: number | null;
  tiene_alerta: boolean;
  color: 'green' | 'yellow' | 'red' | 'gray';
  icon: 'check' | 'alert' | 'x' | 'help';
}

export function calcularEstadoOS10(fechaOS10: string | null, diasAlerta: number = 30): OS10Status {
  // Si no hay fecha, retornar sin fecha
  if (!fechaOS10) {
    return {
      estado: 'sin_fecha',
      dias_restantes: null,
      tiene_alerta: false,
      color: 'gray',
      icon: 'help'
    };
  }

  const fechaVencimiento = new Date(fechaOS10);
  const fechaActual = new Date();
  
  // Calcular diferencia en días
  const diferenciaMs = fechaVencimiento.getTime() - fechaActual.getTime();
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

  // Determinar estado
  if (diasRestantes < 0) {
    // Vencido
    return {
      estado: 'vencido',
      dias_restantes: Math.abs(diasRestantes),
      tiene_alerta: true,
      color: 'red',
      icon: 'x'
    };
  } else if (diasRestantes <= diasAlerta) {
    // Por vencer (menos de X días configurable)
    return {
      estado: 'por_vencer',
      dias_restantes: diasRestantes,
      tiene_alerta: true,
      color: 'yellow',
      icon: 'alert'
    };
  } else {
    // Vigente
    return {
      estado: 'vigente',
      dias_restantes: diasRestantes,
      tiene_alerta: false,
      color: 'green',
      icon: 'check'
    };
  }
}

export function obtenerEstadisticasOS10(guardias: any[], diasAlerta: number = 30): {
  total: number;
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  sin_fecha: number;
} {
  const estadisticas = {
    total: guardias.length,
    vigentes: 0,
    por_vencer: 0,
    vencidos: 0,
    sin_fecha: 0
  };

  guardias.forEach(guardia => {
    const estado = calcularEstadoOS10(guardia.fecha_os10, diasAlerta);
    switch (estado.estado) {
      case 'vigente':
        estadisticas.vigentes++;
        break;
      case 'por_vencer':
        estadisticas.por_vencer++;
        break;
      case 'vencido':
        estadisticas.vencidos++;
        break;
      case 'sin_fecha':
        estadisticas.sin_fecha++;
        break;
    }
  });

  return estadisticas;
}

// Función para obtener KPIs específicos de OS10
export function obtenerKPIsOS10(guardias: any[], diasAlerta: number = 30): {
  os10_por_vencer: number;
  os10_sin_fecha: number;
  os10_vencidos: number;
  os10_vigentes: number;
} {
  const estadisticas = obtenerEstadisticasOS10(guardias, diasAlerta);
  
  return {
    os10_por_vencer: estadisticas.por_vencer,
    os10_sin_fecha: estadisticas.sin_fecha,
    os10_vencidos: estadisticas.vencidos,
    os10_vigentes: estadisticas.vigentes
  };
}


