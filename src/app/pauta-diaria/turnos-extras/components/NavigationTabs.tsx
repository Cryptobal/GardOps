'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui'
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
    <div className={`flex gap-1 bg-muted/30 p-1 rounded-lg mb-4 sm:mb-6 ${
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
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap border border-transparent',
              isActive
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/30 shadow-sm'
                : 'text-muted-foreground hover:text-white hover:bg-muted/40'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className={isMobile ? 'text-xs' : ''}>
              {displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
} 