'use client';

import { DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface NavigationTabsProps {
  activeTab: 'turnos' | 'dashboard' | 'historial';
  onTabChange: (tab: 'turnos' | 'dashboard' | 'historial') => void;
}

export default function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const tabs = [
    {
      name: 'Turnos Pago, Turnos Extras',
      mobileName: 'Turnos',
      value: 'turnos' as const,
      icon: DollarSign,
      description: 'Administrar pagos pendientes'
    },
    {
      name: 'Dashboard',
      mobileName: 'Dashboard',
      value: 'dashboard' as const,
      icon: BarChart3,
      description: 'Análisis Big Data'
    },
    {
      name: 'Historial de Planillas',
      mobileName: 'Historial',
      value: 'historial' as const,
      icon: Calendar,
      description: 'Ver planillas generadas'
    }
  ];

  return (
    <div className={`flex gap-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 p-2 rounded-xl mb-4 sm:mb-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50 ${
      isMobile ? 'grid grid-cols-3' : 'flex-wrap'
    }`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        const Icon = tab.icon;
        const displayName = isMobile ? tab.mobileName : tab.name;
        
        return (
          <button
            key={tab.name}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              'flex items-center gap-2 px-3 py-3 text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap border-2 shadow-sm transform hover:scale-105 active:scale-95',
              isActive
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30'
                : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-transparent hover:border-blue-200 dark:hover:border-blue-800'
            )}
          >
            <Icon className={cn(
              'h-4 w-4 transition-colors duration-300',
              isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'
            )} />
            <span className={cn(
              'transition-colors duration-300',
              isMobile ? 'text-xs' : 'text-sm'
            )}>
              {displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
} 