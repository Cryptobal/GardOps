'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar } from 'lucide-react';

interface TooltipHorariosProps {
  children: React.ReactNode;
  horarios: { dia: string; inicio: string; fin: string }[];
  esVariable: boolean;
}

export function TooltipHorarios({ children, horarios, esVariable }: TooltipHorariosProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  if (!esVariable || horarios.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => {
          if (timeoutId) clearTimeout(timeoutId);
          setShowTooltip(true);
        }}
        onMouseLeave={() => {
          const id = setTimeout(() => setShowTooltip(false), 300);
          setTimeoutId(id);
        }}
        className="cursor-help"
      >
        {children}
      </div>
      
      {showTooltip && (
        <>
          {/* Área invisible para conectar trigger con tooltip */}
          <div className="absolute z-40 bottom-0 left-1/2 transform -translate-x-1/2 w-full h-6"></div>
          
          <div 
            className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-3 animate-in fade-in-0 zoom-in-95 duration-200"
            onMouseEnter={() => {
              if (timeoutId) clearTimeout(timeoutId);
              setShowTooltip(true);
            }}
            onMouseLeave={() => {
              const id = setTimeout(() => setShowTooltip(false), 150);
              setTimeoutId(id);
            }}
          >
          <Card className="shadow-2xl border-blue-300 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 min-w-72 max-w-80">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-semibold text-blue-700 dark:text-blue-300">
                  Horarios Variables
                </span>
              </div>
              
              <div className="space-y-3">
                {horarios.map((horario, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-sm font-bold text-white">
                          {horario.dia}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {horario.dia === 'L' ? 'Lunes' :
                           horario.dia === 'M' ? 'Martes' :
                           horario.dia === 'X' ? 'Miércoles' :
                           horario.dia === 'J' ? 'Jueves' :
                           horario.dia === 'V' ? 'Viernes' :
                           horario.dia === 'S' ? 'Sábado' :
                           horario.dia === 'D' ? 'Domingo' :
                           `Día ${horario.dia}`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Día {index + 1} del ciclo
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-600 px-3 py-1 rounded-md">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">
                        {horario.inicio} - {horario.fin}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  💡 Horarios personalizados por día del ciclo
                </div>
              </div>
              
              {/* Flecha del tooltip mejorada */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-blue-300 drop-shadow-sm"></div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-px">
                  <div className="w-0 h-0 border-l-5 border-r-5 border-t-5 border-transparent border-t-blue-50 dark:border-t-gray-800"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </>
      )}
    </div>
  );
}
