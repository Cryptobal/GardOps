'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar, Info } from 'lucide-react';

interface TooltipSimpleProps {
  children: React.ReactNode;
  titulo: string;
  contenido: string[];
  esVariable?: boolean;
}

export function TooltipSimple({ children, titulo, contenido, esVariable = false }: TooltipSimpleProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!esVariable) {
    return <>{children}</>;
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="cursor-help">
        {children}
      </div>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-3">
          <Card className="shadow-xl border-blue-200 bg-white dark:bg-gray-800 min-w-64 max-w-72">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Info className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {titulo}
                </span>
              </div>
              
              <div className="space-y-2">
                {contenido.map((linea, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <Clock className="h-3 w-3 text-blue-500 flex-shrink-0" />
                    <span>{linea}</span>
                  </div>
                ))}
              </div>
              
              {/* Flecha del tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-200"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
