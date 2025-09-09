"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  ExternalLink, 
  TrendingUp, 
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import BackToPayroll from '@/components/BackToPayroll';

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

export default function ValoresUTMUFPage() {
  const [ufData, setUfData] = useState<UFData | null>(null);
  const [utmData, setUtmData] = useState<UTMData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const API_KEY = 'd9f76c741ee20ccf0e776ecdf58c32102cfa9806';
  const UF_API_URL = `https://api.cmfchile.cl/api-sbifv3/recursos_api/uf?apikey=${API_KEY}&formato=json`;
  const UTM_API_URL = `https://api.cmfchile.cl/api-sbifv3/recursos_api/utm?apikey=${API_KEY}&formato=json`;

  /**
   * Convierte un string con formato chileno (39.280,76) a número
   */
  const parseChileanNumber = (value: string): number => {
    // Remover puntos (separadores de miles) y reemplazar coma por punto
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue);
  };

  const fetchUF = async (): Promise<UFData> => {
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
  };

  const fetchUTM = async (): Promise<UTMData> => {
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
  };

  const fetchValues = async () => {
    setLoading(true);
    try {
      const [ufResult, utmResult] = await Promise.all([
        fetchUF(),
        fetchUTM()
      ]);
      
      setUfData(ufResult);
      setUtmData(utmResult);
      setLastUpdate(new Date());
    } catch (error) {
      logger.error('Error fetching values::', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValues();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <BackToPayroll />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Valores UF/UTM en Tiempo Real</h1>
          <p className="text-sm text-muted-foreground">
            Valores actualizados desde las APIs oficiales de la CMF
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchValues} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Información de APIs */}
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <ExternalLink className="h-4 w-4" />
        <AlertDescription>
          <strong>Fuente de datos:</strong> APIs oficiales de la Comisión para el Mercado Financiero (CMF)
        </AlertDescription>
      </Alert>

      {/* Valores principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* UF */}
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <TrendingUp className="h-5 w-5" />
              Unidad de Fomento (UF)
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Valor oficial del día
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ufData?.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Error al obtener valor UF: {ufData.error}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-800 dark:text-green-200">
                    {ufData ? formatCurrency(ufData.valor) : 'Cargando...'}
                  </div>
                  {ufData && (
                    <div className="text-sm text-green-600 dark:text-green-400 mt-2">
                      Fecha: {formatDate(ufData.fecha)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700 dark:text-green-300">API Source:</span>
                  <Badge variant="outline" className="text-green-700 dark:text-green-300">
                    CMF Chile
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* UTM */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <DollarSign className="h-5 w-5" />
              Unidad Tributaria Mensual (UTM)
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Valor oficial del mes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {utmData?.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Error al obtener valor UTM: {utmData.error}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                    {utmData ? formatCurrency(utmData.valor) : 'Cargando...'}
                  </div>
                  {utmData && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                      Fecha: {formatDate(utmData.fecha)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-300">API Source:</span>
                  <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
                    CMF Chile
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información de APIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              API UF
            </CardTitle>
            <CardDescription>
              Endpoint para obtener el valor de la UF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">URL de la API:</Label>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm font-mono break-all">
                {UF_API_URL}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Documentación:</Label>
              <a 
                href="https://api.cmfchile.cl/documentacion/UF.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm flex items-center gap-1"
              >
                Ver documentación oficial
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              API UTM
            </CardTitle>
            <CardDescription>
              Endpoint para obtener el valor de la UTM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">URL de la API:</Label>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm font-mono break-all">
                {UTM_API_URL}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Documentación:</Label>
              <a 
                href="https://api.cmfchile.cl/documentacion/UTM.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm flex items-center gap-1"
              >
                Ver documentación oficial
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado de actualización */}
      {lastUpdate && (
        <Card className="bg-gray-50 dark:bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>
                Última actualización: {lastUpdate.toLocaleString('es-CL')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información adicional */}
      <Card className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 border-purple-200/50 dark:from-purple-950/20 dark:to-blue-950/20 dark:border-purple-800/50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Integración con Cálculos de Payroll
              </h3>
              <p className="text-muted-foreground mb-4">
                Estos valores se integrarán automáticamente en los cálculos de sueldos, 
                reemplazando los valores estáticos actuales. Los valores se actualizan 
                en tiempo real desde las fuentes oficiales de la CMF.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-foreground">✓ Valores Oficiales</p>
                  <p className="text-muted-foreground">Directamente desde CMF</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">✓ Actualización Automática</p>
                  <p className="text-muted-foreground">En tiempo real</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">✓ Integración Completa</p>
                  <p className="text-muted-foreground">Con cálculos de payroll</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente Label para evitar errores de importación
const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={className}>{children}</label>
);

