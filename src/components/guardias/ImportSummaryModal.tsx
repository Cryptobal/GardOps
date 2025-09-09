import React from 'react';
import { X, CheckCircle, AlertCircle, Info, Download, MapPin } from 'lucide-react';

interface ImportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    success: boolean;
    creados: number;
    actualizados: number;
    errores: number;
    total: number;
    erroresDetalle?: string[];
    fecha_proceso?: string;
  } | null;
}

export function ImportSummaryModal({ isOpen, onClose, result }: ImportSummaryModalProps) {
  if (!isOpen || !result) return null;

  const successRate = result.total > 0 ? ((result.creados + result.actualizados) / result.total * 100).toFixed(1) : '0';
  const hasErrors = result.errores > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {hasErrors ? (
              <AlertCircle className="h-6 w-6 text-amber-500" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
            <h2 className="text-xl font-semibold">
              Resumen de Importación
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Estadísticas principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{result.total}</div>
              <div className="text-sm text-blue-600">Total Filas</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{result.creados}</div>
              <div className="text-sm text-green-600">Creados</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{result.actualizados}</div>
              <div className="text-sm text-blue-600">Actualizados</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{result.errores}</div>
              <div className="text-sm text-red-600">Errores</div>
            </div>
          </div>

          {/* Tasa de éxito */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Tasa de Éxito</span>
              <span className="text-sm font-medium text-gray-700">{successRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  parseFloat(successRate) >= 90 ? 'bg-green-500' :
                  parseFloat(successRate) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${successRate}%` }}
              ></div>
            </div>
          </div>

          {/* Mensaje de estado */}
          <div className={`p-4 rounded-lg mb-6 ${
            hasErrors ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              {hasErrors ? (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <span className={`font-medium ${
                hasErrors ? 'text-amber-800' : 'text-green-800'
              }`}>
                {hasErrors 
                  ? 'Importación completada con errores' 
                  : 'Importación completada exitosamente'
                }
              </span>
            </div>
            <p className={`text-sm mt-1 ${
              hasErrors ? 'text-amber-700' : 'text-green-700'
            }`}>
              {hasErrors 
                ? `${result.errores} filas tuvieron errores y no se procesaron.`
                : 'Todas las filas se procesaron correctamente.'
              }
            </p>
          </div>

          {/* Errores detallados */}
          {hasErrors && result.erroresDetalle && result.erroresDetalle.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Errores Detallados
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {result.erroresDetalle.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Información Adicional
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Los guardias creados tendrán PIN generado automáticamente</p>
              <p>• Las direcciones se pueden geocodificar posteriormente</p>
              <p>• Los días de vacaciones se calculan automáticamente</p>
              {result.fecha_proceso && (
                <p>• Fecha de procesamiento: {new Date(result.fecha_proceso).toLocaleDateString('es-CL')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {result.creados + result.actualizados} de {result.total} filas procesadas
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                // Recargar la página para ver los cambios
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Ver Resultados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
