"use client";

import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Search, Filter, X, ChevronDown } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'search' | 'toggle';
  options?: FilterOption[];
  placeholder?: string;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearAll?: () => void;
  searchPlaceholder?: string;
  className?: string;
}

export function FilterBar({
  filters,
  values,
  onFilterChange,
  onClearAll,
  searchPlaceholder = "Buscar...",
  className = ""
}: FilterBarProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const activeFiltersCount = Object.values(values).filter(v => v && v !== "" && v !== "Todos").length;

  const handleFilterChange = (key: string, value: string) => {
    onFilterChange(key, value);
    setOpenPopover(null);
  };

  const clearFilter = (key: string) => {
    onFilterChange(key, "");
  };

  const CustomDropdown: React.FC<{
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
    placeholder?: string;
  }> = ({ label, value, options, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="min-w-[180px] justify-between bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
        >
          <span className="truncate">
            {options.find(opt => opt.value === value)?.label || placeholder || label}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
        </Button>
        
        {isOpen && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-700 transition-colors"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
                {option.value === value && (
                  <Badge variant="secondary" className="ml-2 text-xs">✓</Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`sticky top-4 z-30 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl p-4 shadow-lg ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        {/* Búsqueda principal */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={values.search || ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filtros */}
        {filters.map((filter) => {
          if (filter.type === 'select' && filter.options) {
            return (
              <CustomDropdown
                key={filter.key}
                label={filter.label}
                value={values[filter.key] || ""}
                onChange={(value) => handleFilterChange(filter.key, value)}
                options={filter.options}
                placeholder={filter.placeholder}
              />
            );
          }

          if (filter.type === 'toggle') {
            return (
              <Button
                key={filter.key}
                variant={values[filter.key] === "true" ? "default" : "outline"}
                onClick={() => handleFilterChange(filter.key, values[filter.key] === "true" ? "false" : "true")}
                className={`
                  ${values[filter.key] === "true" 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'border-slate-600 text-slate-200 hover:bg-slate-700'
                  }
                `}
              >
                <Filter className="mr-2 h-4 w-4" />
                {filter.label}
              </Button>
            );
          }

          return null;
        })}

        {/* Botón limpiar filtros */}
        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Información de registros */}
      {values.totalCount !== undefined && (
        <div className="mt-2 text-sm text-slate-400">
          {values.filteredCount || values.totalCount} de {values.totalCount} registros
        </div>
      )}
    </div>
  );
} 