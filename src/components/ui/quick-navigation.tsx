'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickNavigationProps {
  currentId: string;
  items: Array<{
    id: string;
    name: string;
    rut?: string;
    status?: string;
  }>;
  onNavigate: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export function QuickNavigation({
  currentId,
  items,
  onNavigate,
  placeholder = "Buscar...",
  className
}: QuickNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(currentId);

  // Actualizar selectedId cuando cambie currentId
  useEffect(() => {
    setSelectedId(currentId);
  }, [currentId]);

  // Filtrar items por búsqueda
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(term) ||
      (item.rut && item.rut.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  // Encontrar el item actual
  const currentItem = items.find(item => item.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsOpen(false);
    setSearchTerm('');
    onNavigate(id);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className={cn("relative", className)}>
      <Select
        open={isOpen}
        onOpenChange={setIsOpen}
        value={selectedId}
        onValueChange={handleSelect}
      >
        <SelectTrigger 
          className="w-full min-w-[200px] max-w-[300px]"
          onClick={() => setIsOpen(!isOpen)}
        >
          <SelectValue placeholder={placeholder}>
            {currentItem ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col items-start">
                  <span className="font-medium truncate">
                    {currentItem.name}
                  </span>
                  {currentItem.rut && (
                    <span className="text-xs text-muted-foreground">
                      {currentItem.rut}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent className="w-[300px]">
          {/* Barra de búsqueda */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o RUT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-8 text-sm"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="absolute right-1 top-1 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Lista de items */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {searchTerm ? 'No se encontraron resultados' : 'No hay elementos disponibles'}
              </div>
            ) : (
              filteredItems.map((item) => (
                <SelectItem
                  key={item.id}
                  value={item.id}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium truncate">
                        {item.name}
                      </span>
                      {item.status && (
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0",
                          item.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        )}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    {item.rut && (
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {item.rut}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
