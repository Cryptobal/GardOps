'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface QuickNavigationItem {
  id: string;
  name: string;
  rut?: string;
  status?: string;
}

interface QuickNavigationProps {
  currentId: string;
  items: QuickNavigationItem[];
  onNavigate: (id: string) => void;
  placeholder?: string;
}

export function QuickNavigation({ 
  currentId, 
  items = [], 
  onNavigate, 
  placeholder = "Buscar..." 
}: QuickNavigationProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!searchTerm.trim()) return items;
    
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item?.name?.toLowerCase().includes(term) ||
      (item?.rut && item.rut.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  const currentItem = useMemo(() => {
    if (!Array.isArray(items)) return null;
    return items.find(item => item?.id === currentId) || null;
  }, [items, currentId]);

  const handleSelect = (id: string) => {
    if (id && typeof onNavigate === 'function') {
      onNavigate(id);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-9"
        />
      </div>
      <Select value={currentId} onValueChange={handleSelect}>
        <SelectTrigger className="w-full h-9">
          <SelectValue placeholder={currentItem ? currentItem.name : "Seleccionar..."}>
            {currentItem ? (
              <div className="flex items-center gap-2">
                <span>{currentItem.name}</span>
                {currentItem.rut && <span className="text-muted-foreground text-xs">({currentItem.rut})</span>}
              </div>
            ) : (
              "Seleccionar..."
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filteredItems.map(item => (
            <SelectItem key={item.id} value={item.id}>
              <div className="flex flex-col">
                <span>{item.name}</span>
                {item.rut && <span className="text-muted-foreground text-xs">{item.rut}</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
