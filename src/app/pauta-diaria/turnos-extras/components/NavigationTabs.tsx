'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NavigationTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Gestión de Pagos',
      href: '/pauta-diaria/turnos-extras',
      icon: DollarSign,
      description: 'Administrar pagos pendientes'
    },
    {
      name: 'Historial',
      href: '/pauta-diaria/turnos-extras/historial',
      icon: Calendar,
      description: 'Ver pagos realizados'
    }
  ];

  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Button
              key={tab.name}
              variant="ghost"
              onClick={() => window.location.href = tab.href}
              className={cn(
                'flex items-center gap-2 px-1 py-2 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </Button>
          );
        })}
      </nav>
    </div>
  );
} 