'use client';

import { useState, useEffect, useMemo } from 'react';
import { getGuardiasDisponibles } from '@/lib/api/instalaciones';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User, MapPin, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface GuardiaSelectWithSearchProps {
  instalacionId: string;
  onSelect: (guardiaId: string) => void;
  placeholder?: string;
  className?: string;
  excludeIds?: string[];
}

interface Guardia {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rut: string | null;
  nombre_completo: string;
  tiene_asignacion_activa: boolean;
}

export function GuardiaSelectWithSearch({ 
  instalacionId, 
  onSelect, 
  placeholder = "Asignar guardia",
  className = "",
  excludeIds = []
}: GuardiaSelectWithSearchProps) {
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGuardia, setSelectedGuardia] = useState<Guardia | null>(null);

  // Cargar guardias disponibles
  const cargarGuardias = async (search?: string) => {
    try {
      setLoading(true);
      const searchParam = search || searchTerm;
      const url = `/api/guardias/disponibles?instalacion_id=${instalacionId}${searchParam ? `&search=${encodeURIComponent(searchParam)}` : ''}`;
      
      console.log('🔍 Cargando guardias desde:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al cargar guardias');
      }
      
      const data = await response.json();
      console.log('🔍 Datos recibidos de guardias:', data.items?.slice(0, 3));
      
      setGuardias(data.items || []);
    } catch (error) {
      console.error('Error cargando guardias:', error);
      setGuardias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarGuardias();
    }
  }, [isOpen, instalacionId]);

  // Cuando cambian los excluidos, aplicar filtro reactivo
  useEffect(() => {
    if (!isOpen || excludeIds.length === 0) return;
    setGuardias(prev => prev.filter(g => !excludeIds.includes(g.id)));
  }, [excludeIds, isOpen]);

  // Filtrar guardias localmente también para mejor UX
  const guardiasFiltrados = useMemo(() => {
    let lista = guardias;
    if (excludeIds?.length) {
      lista = lista.filter(g => !excludeIds.includes(g.id));
    }
    if (!searchTerm.trim()) return lista;
    
    const searchLower = searchTerm.toLowerCase();
    return lista.filter(guardia => 
      guardia.nombre_completo.toLowerCase().includes(searchLower) ||
      (guardia.rut ? guardia.rut.toLowerCase() : '').includes(searchLower)
    );
  }, [guardias, searchTerm, excludeIds]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const timeoutId = setTimeout(() => {
      cargarGuardias(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const handleSelectGuardia = (guardia: Guardia) => {
    if (guardia.tiene_asignacion_activa) {
      console.log('🔒 Guardia con asignación activa, no se puede seleccionar:', guardia.nombre_completo);
      return;
    }
    
    setSelectedGuardia(guardia);
    onSelect(guardia.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const tooltipContent = (guardia: Guardia) => (
    <div className="space-y-2 p-2">
      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Asignación Activa:</div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-gray-600 dark:text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">Instalación actual</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-gray-600 dark:text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">Turno activo</span>
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          No disponible para nueva asignación
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative w-full ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left"
        disabled={loading}
      >
        <span className="truncate">
          {selectedGuardia ? selectedGuardia.nombre_completo : placeholder}
        </span>
        <Search className="h-4 w-4 ml-2 flex-shrink-0" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden w-full">
          {/* Barra de búsqueda */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Buscar por nombre o RUT..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 w-full"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de guardias */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Cargando guardias...
              </div>
            ) : guardiasFiltrados.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No se encontraron guardias' : 'No hay guardias disponibles'}
              </div>
            ) : (
              <TooltipProvider>
                {guardiasFiltrados.map((guardia) => (
                  <Tooltip key={guardia.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`
                          flex items-start gap-3 p-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0
                          ${guardia.tiene_asignacion_activa 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }
                        `}
                        onClick={() => handleSelectGuardia(guardia)}
                      >
                        <User className={`h-4 w-4 mt-0.5 flex-shrink-0 ${guardia.tiene_asignacion_activa ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                            {guardia.nombre_completo}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {guardia.rut ? `RUT: ${guardia.rut}` : 'RUT: Sin RUT'}
                          </div>
                        </div>
                        {guardia.tiene_asignacion_activa && (
                          <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded flex-shrink-0">
                            🔒 Asignado
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    {guardia.tiene_asignacion_activa && (
                      <TooltipContent side="right" className="max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        {tooltipContent(guardia)}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </TooltipProvider>
            )}
          </div>
        </div>
      )}

      {/* Overlay para cerrar al hacer clic fuera */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 
