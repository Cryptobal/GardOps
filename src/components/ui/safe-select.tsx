"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface SafeSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
}

const SafeSelect = React.forwardRef<HTMLButtonElement, SafeSelectProps>(
  ({ 
    value, 
    onValueChange, 
    disabled, 
    open, 
    onOpenChange, 
    children, 
    placeholder,
    className,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout>();

    // Manejar el estado open de forma segura
    const handleOpenChange = React.useCallback((newOpen: boolean) => {
      try {
        setIsOpen(newOpen);
        onOpenChange?.(newOpen);
      } catch (error) {
        console.warn('Error handling select open change:', error);
        setHasError(true);
        // Forzar cierre en caso de error
        setIsOpen(false);
        onOpenChange?.(false);
      }
    }, [onOpenChange]);

    // Limpiar timeouts al desmontar
    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    // Manejar errores de focus
    React.useEffect(() => {
      const handleFocusError = (event: ErrorEvent) => {
        if (event.message.includes('focus') && event.message.includes('null')) {
          console.warn('Prevented focus error in SafeSelect');
          event.preventDefault();
          setHasError(true);
          // Forzar cierre del select
          handleOpenChange(false);
        }
      };

      window.addEventListener('error', handleFocusError);
      return () => {
        window.removeEventListener('error', handleFocusError);
      };
    }, [handleOpenChange]);

    // Si hay error, mostrar un select simple
    if (hasError) {
      return (
        <select
          value={value || ''}
          onChange={(e) => onValueChange?.(e.target.value)}
          disabled={disabled}
          className={className}
          {...props}
        >
          <option value="">{placeholder || 'Seleccionar...'}</option>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === SelectItem) {
              return (
                <option value={child.props.value}>
                  {child.props.children}
                </option>
              );
            }
            return null;
          })}
        </select>
      );
    }

    return (
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        open={open !== undefined ? open : isOpen}
        onOpenChange={handleOpenChange}
        {...props}
      >
        <SelectTrigger ref={ref} className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    );
  }
);

SafeSelect.displayName = "SafeSelect";

export { SafeSelect }; 