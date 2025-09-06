"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemConfig } from "@/hooks/useSystemConfig";

interface MilitaryTimeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MilitaryTimeSelect({ 
  value, 
  onValueChange, 
  placeholder = "Seleccionar hora",
  className = "",
  disabled = false 
}: MilitaryTimeSelectProps) {
  const { config, formatTime } = useSystemConfig();

  // Generar opciones de tiempo según configuración
  const generateTimeOptions = () => {
    const options = [];
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Crear fecha dummy para formatear según configuración
        const dummyDate = new Date();
        dummyDate.setHours(hour, minute, 0, 0);
        
        const displayText = config.formato_hora === '24h' 
          ? timeValue 
          : formatTime(dummyDate);

        options.push({
          value: timeValue,
          label: displayText
        });
      }
    }
    
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Formatear el valor mostrado en el trigger
  const getDisplayValue = (timeValue: string) => {
    if (!timeValue) return placeholder;
    
    try {
      const [hour, minute] = timeValue.split(':').map(Number);
      const dummyDate = new Date();
      dummyDate.setHours(hour, minute, 0, 0);
      
      return config.formato_hora === '24h' 
        ? timeValue 
        : formatTime(dummyDate);
    } catch {
      return timeValue;
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value ? getDisplayValue(value) : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[200px]">
        {timeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}