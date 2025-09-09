import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
const API_KEY = 'd9f76c741ee20ccf0e776ecdf58c32102cfa9806';
const UF_API_URL = `https://api.cmfchile.cl/api-sbifv3/recursos_api/uf?apikey=${API_KEY}&formato=json`;
const UTM_API_URL = `https://api.cmfchile.cl/api-sbifv3/recursos_api/utm?apikey=${API_KEY}&formato=json`;

interface UFData {
  valor: number;
  fecha: string;
  error?: string;
}

interface UTMData {
  valor: number;
  fecha: string;
  error?: string;
}

/**
 * Convierte un string con formato chileno (39.280,76) a número
 */
function parseChileanNumber(value: string): number {
  // Remover puntos (separadores de miles) y reemplazar coma por punto
  const cleanValue = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanValue);
}

async function fetchUF(): Promise<UFData> {
  try {
    const response = await fetch(UF_API_URL);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.UFs && data.UFs.length > 0) {
      const uf = data.UFs[0];
      const valor = parseChileanNumber(uf.Valor);
      
      return {
        valor: valor,
        fecha: uf.Fecha
      };
    } else {
      throw new Error('No se encontraron datos de UF');
    }
  } catch (error) {
    logger.error('Error fetching UF::', error);
    return {
      valor: 0,
      fecha: new Date().toISOString().split('T')[0],
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

async function fetchUTM(): Promise<UTMData> {
  try {
    const response = await fetch(UTM_API_URL);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.UTMs && data.UTMs.length > 0) {
      const utm = data.UTMs[0];
      const valor = parseChileanNumber(utm.Valor);
      
      return {
        valor: valor,
        fecha: utm.Fecha
      };
    } else {
      throw new Error('No se encontraron datos de UTM');
    }
  } catch (error) {
    logger.error('Error fetching UTM::', error);
    return {
      valor: 0,
      fecha: new Date().toISOString().split('T')[0],
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * GET - Obtener valores UF/UTM en tiempo real
 */
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'payroll', action: 'read:list' });
  if (deny) return deny;

  try {
    const [ufData, utmData] = await Promise.all([
      fetchUF(),
      fetchUTM()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        uf: ufData,
        utm: utmData,
        timestamp: new Date().toISOString(),
        source: 'CMF Chile APIs'
      }
    });

  } catch (error) {
    logger.error('Error al obtener valores UF/UTM::', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
