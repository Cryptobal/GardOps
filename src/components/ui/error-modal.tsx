'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X, Building2, CheckCircle, XCircle } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: {
    instalacionesActivas?: Array<{
      id: string;
      nombre: string;
      estado: string;
    }>;
    instalacionesInactivas?: Array<{
      id: string;
      nombre: string;
      estado: string;
    }>;
  };
  onAction?: () => void;
  actionLabel?: string;
}

export default function ErrorModal({
  isOpen,
  onClose,
  title,
  message,
  details,
  onAction,
  actionLabel
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-700 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <CardTitle className="text-xl text-slate-100">{title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Mensaje principal */}
          <div className="text-slate-300 leading-relaxed">
            {message}
          </div>

          {/* Detalles de instalaciones */}
          {details && (
            <div className="space-y-4">
              {/* Instalaciones activas */}
              {details.instalacionesActivas && details.instalacionesActivas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="font-medium text-red-400">
                      Instalaciones Activas ({details.instalacionesActivas.length})
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {details.instalacionesActivas.map((instalacion) => (
                      <div
                        key={instalacion.id}
                        className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-red-400" />
                          <span className="text-slate-200">{instalacion.nombre}</span>
                        </div>
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                          Activa
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instalaciones inactivas */}
              {details.instalacionesInactivas && details.instalacionesInactivas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="font-medium text-green-400">
                      Instalaciones Inactivas ({details.instalacionesInactivas.length})
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {details.instalacionesInactivas.map((instalacion) => (
                      <div
                        key={instalacion.id}
                        className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-green-400" />
                          <span className="text-slate-200">{instalacion.nombre}</span>
                        </div>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                          Inactiva
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Información adicional */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">¿Cómo resolver este problema?</p>
                <p>
                  Para poder inactivar el cliente, primero debes inactivar todas sus instalaciones activas. 
                  Ve a cada instalación y cambia su estado a "Inactivo".
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Entendido
            </Button>
            {onAction && actionLabel && (
              <Button
                onClick={onAction}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {actionLabel}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 