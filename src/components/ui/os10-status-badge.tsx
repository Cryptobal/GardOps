import React from 'react';
import { Badge } from './badge';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { calcularEstadoOS10, OS10Status } from '@/lib/utils/os10-status';

interface OS10StatusBadgeProps {
  fechaOS10: string | null;
  showDays?: boolean;
  className?: string;
}

export function OS10StatusBadge({ fechaOS10, showDays = true, className = '' }: OS10StatusBadgeProps) {
  const estado = calcularEstadoOS10(fechaOS10);

  const getIcon = () => {
    switch (estado.icon) {
      case 'check':
        return <CheckCircle className="h-3 w-3" />;
      case 'alert':
        return <AlertTriangle className="h-3 w-3" />;
      case 'x':
        return <XCircle className="h-3 w-3" />;
      case 'help':
        return <HelpCircle className="h-3 w-3" />;
      default:
        return <HelpCircle className="h-3 w-3" />;
    }
  };

  const getVariant = () => {
    switch (estado.color) {
      case 'green':
        return 'default';
      case 'yellow':
        return 'outline';
      case 'red':
        return 'destructive';
      case 'gray':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getText = () => {
    switch (estado.estado) {
      case 'vigente':
        return 'Vigente';
      case 'por_vencer':
        return showDays ? `Por vencer (${estado.dias_restantes} días)` : 'Por vencer';
      case 'vencido':
        return showDays ? `Vencido (${estado.dias_restantes} días)` : 'Vencido';
      case 'sin_fecha':
        return 'Sin OS10';
      default:
        return 'Sin OS10';
    }
  };

  const getColorClasses = () => {
    switch (estado.color) {
      case 'green':
        return 'text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20';
      case 'yellow':
        return 'text-orange-600 border-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'red':
        return 'text-red-600 border-red-600 bg-red-50 dark:bg-red-900/20';
      case 'gray':
        return 'text-gray-600 border-gray-600 bg-gray-50 dark:bg-gray-900/20';
      default:
        return '';
    }
  };

  return (
    <Badge 
      variant={getVariant()}
      className={`flex items-center gap-1 ${getColorClasses()} ${className}`}
    >
      {getIcon()}
      <span className="text-xs">{getText()}</span>
    </Badge>
  );
}


