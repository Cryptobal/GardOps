'use client';

import { usePathname } from 'next/navigation';
import { DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NavigationTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Turnos Pago, Turnos Extras',
      href: '/pauta-diaria/turnos-extras',
      icon: DollarSign,
      description: 'Administrar pagos pendientes'
    },
    {
      name: 'Dashboard',
      href: '/pauta-diaria/turnos-extras/dashboard',
      icon: BarChart3,
      description: 'Análisis Big Data'
    },
    {
      name: 'Historial de Planillas',
      href: '/pauta-diaria/turnos-extras/historial',
      icon: Calendar,
      description: 'Ver planillas generadas'
    }
  ];

  return (
    <div className="flex flex-wrap gap-1 bg-muted/30 p-1 rounded-lg mb-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.name}
            onClick={() => window.location.href = tab.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap border border-transparent',
              isActive
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/30 shadow-sm'
                : 'text-muted-foreground hover:text-white hover:bg-muted/40'
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.name}
          </button>
        );
      })}
    </div>
  );
} 