import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DesgloseCalculoProps {
  desglose: {
    gratificacion: number;
    total_imponible: number;
    cotizaciones: {
      afp: number;
      salud: number;
      afc: number;
      total: number;
    };
    cargas_sociales: {
      sis: number;
      afc_empleador: number;
      mutual: number;
      reforma_previsional: number;
      total: number;
    };
    base_tributable: number;
    impuesto_unico: number;
  };
  sueldoBase: number;
  bono1: number;
  bono2: number;
  bono3: number;
  sueldoLiquido: number;
  costoEmpresa: number;
}

export function DesgloseCalculo({
  desglose,
  sueldoBase,
  bono1,
  bono2,
  bono3,
  sueldoLiquido,
  costoEmpresa
}: DesgloseCalculoProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          📊 Desglose del Cálculo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {/* Ingresos */}
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-green-600 mb-2">💰 Ingresos</h3>
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span>Sueldo Base:</span>
              <span className="font-medium">{formatCurrency(sueldoBase)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gratificación Legal (25%):</span>
              <span className="font-medium">{formatCurrency(desglose.gratificacion)}</span>
            </div>
            {bono1 > 0 && (
              <div className="flex justify-between">
                <span>Colación (No Imponible):</span>
                <span className="font-medium">{formatCurrency(bono1)}</span>
              </div>
            )}
            {bono2 > 0 && (
              <div className="flex justify-between">
                <span>Movilización (No Imponible):</span>
                <span className="font-medium">{formatCurrency(bono2)}</span>
              </div>
            )}
            {bono3 > 0 && (
              <div className="flex justify-between">
                <span>Responsabilidad (Imponible):</span>
                <span className="font-medium">{formatCurrency(bono3)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Imponible:</span>
              <span className="text-blue-600">{formatCurrency(desglose.total_imponible)}</span>
            </div>
          </div>
        </div>

        {/* Cotizaciones */}
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-red-600 mb-2">💸 Cotizaciones del Trabajador</h3>
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span>AFP Capital (11.44%):</span>
              <span className="font-medium">{formatCurrency(desglose.cotizaciones.afp)}</span>
            </div>
            <div className="flex justify-between">
              <span>FONASA (7%):</span>
              <span className="font-medium">{formatCurrency(desglose.cotizaciones.salud)}</span>
            </div>
            <div className="flex justify-between">
              <span>Seguro de Cesantía (0.6%):</span>
              <span className="font-medium">{formatCurrency(desglose.cotizaciones.afc)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Cotizaciones:</span>
              <span className="text-red-600">{formatCurrency(desglose.cotizaciones.total)}</span>
            </div>
          </div>
        </div>

        {/* Base Tributable e Impuesto */}
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-purple-600 mb-2">📋 Tributación</h3>
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span>Base Tributable:</span>
              <span className="font-medium">{formatCurrency(desglose.base_tributable)}</span>
            </div>
            <div className="flex justify-between">
              <span>Impuesto Único:</span>
              <span className="font-medium">{formatCurrency(desglose.impuesto_unico)}</span>
            </div>
          </div>
        </div>

        {/* Cargas Sociales del Empleador */}
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-orange-600 mb-2">🏢 Cargas Sociales del Empleador</h3>
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span>SIS (2%):</span>
              <span className="font-medium">{formatCurrency(desglose.cargas_sociales.sis)}</span>
            </div>
            <div className="flex justify-between">
              <span>AFC Empleador (2.4%):</span>
              <span className="font-medium">{formatCurrency(desglose.cargas_sociales.afc_empleador)}</span>
            </div>
            <div className="flex justify-between">
              <span>Mutual (0.9%):</span>
              <span className="font-medium">{formatCurrency(desglose.cargas_sociales.mutual)}</span>
            </div>
            <div className="flex justify-between">
              <span>Reforma Previsional (1%):</span>
              <span className="font-medium">{formatCurrency(desglose.cargas_sociales.reforma_previsional)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Cargas Sociales:</span>
              <span className="text-orange-600">{formatCurrency(desglose.cargas_sociales.total)}</span>
            </div>
          </div>
        </div>

        {/* Resultados Finales */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">🎯 Resultados Finales</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm">Sueldo Líquido:</span>
              <Badge variant="default" className="text-xs sm:text-sm px-2 py-1 bg-green-100 text-green-800">
                {formatCurrency(sueldoLiquido)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm">Costo Total Empresa:</span>
              <Badge variant="default" className="text-xs sm:text-sm px-2 py-1 bg-red-100 text-red-800">
                {formatCurrency(costoEmpresa)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Fórmula Resumen */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="text-xs sm:text-sm font-semibold text-blue-800 mb-2">📝 Fórmulas Aplicadas</h4>
          <div className="text-xs sm:text-sm text-blue-700 space-y-1">
            <p>• <strong>Sueldo Líquido:</strong> Total Imponible + No Imponible - Cotizaciones - Impuesto</p>
            <p>• <strong>Costo Empresa:</strong> Total Imponible + No Imponible + Cargas Sociales</p>
            <p>• <strong>Gratificación:</strong> 25% del Sueldo Base</p>
            <p>• <strong>Cargas Sociales:</strong> SIS + AFC + Mutual + Reforma Previsional</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

