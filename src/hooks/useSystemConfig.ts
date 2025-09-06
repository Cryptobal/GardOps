"use client";

import { useState, useEffect } from 'react';

export interface SystemConfig {
  id: string;
  tenant_id?: string;
  zona_horaria: string;
  formato_hora: string;
  pais: string;
  codigo_pais: string;
  moneda: string;
  simbolo_moneda: string;
  idioma: string;
  formato_fecha: string;
  separador_miles: string;
  separador_decimales: string;
}

const defaultConfig: SystemConfig = {
  id: '',
  zona_horaria: 'America/Santiago',
  formato_hora: '24h',
  pais: 'CL',
  codigo_pais: '+56',
  moneda: 'CLP',
  simbolo_moneda: '$',
  idioma: 'es-CL',
  formato_fecha: 'DD/MM/YYYY',
  separador_miles: '.',
  separador_decimales: ','
};

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configuracion/sistema');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setConfig(data.data);
        } else {
          console.warn('No se pudo cargar configuración del sistema, usando valores por defecto');
          setConfig(defaultConfig);
        }
      } else {
        console.warn('Error cargando configuración del sistema, usando valores por defecto');
        setConfig(defaultConfig);
      }
      setError(null);
    } catch (err) {
      console.error('Error cargando configuración del sistema:', err);
      setError('Error cargando configuración');
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Funciones de formateo usando la configuración
  const formatTime = (date: Date | string, includeSeconds = false): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Hora inválida';
    }

    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds && { second: '2-digit' }),
      hour12: config.formato_hora === '12h',
      timeZone: config.zona_horaria
    };

    return dateObj.toLocaleTimeString(config.idioma, options);
  };

  const formatDate = (date: Date | string): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }

    // Mapear formato de fecha a opciones de Intl
    const options: Intl.DateTimeFormatOptions = {
      timeZone: config.zona_horaria
    };

    switch (config.formato_fecha) {
      case 'DD/MM/YYYY':
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
        break;
      case 'MM/DD/YYYY':
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
        break;
      case 'YYYY-MM-DD':
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
        break;
      default:
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
    }

    const formatted = dateObj.toLocaleDateString(config.idioma, options);
    
    // Ajustar formato según configuración
    if (config.formato_fecha === 'YYYY-MM-DD') {
      const parts = formatted.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    
    return formatted;
  };

  const formatDateTime = (date: Date | string, includeSeconds = false): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha/hora inválida';
    }

    const dateStr = formatDate(dateObj);
    const timeStr = formatTime(dateObj, includeSeconds);
    
    return `${dateStr} ${timeStr}`;
  };

  const formatCurrency = (amount: number): string => {
    const formattedNumber = amount.toLocaleString(config.idioma, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    // Aplicar separadores personalizados si son diferentes
    let result = formattedNumber;
    if (config.separador_miles !== '.' || config.separador_decimales !== ',') {
      // Reemplazar separadores estándar con los configurados
      result = result
        .replace(/\./g, '|TEMP|') // Temporal
        .replace(/,/g, config.separador_decimales)
        .replace(/\|TEMP\|/g, config.separador_miles);
    }

    return `${config.simbolo_moneda}${result}`;
  };

  const formatNumber = (number: number, decimals = 0): string => {
    const formattedNumber = number.toLocaleString(config.idioma, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    // Aplicar separadores personalizados
    let result = formattedNumber;
    if (config.separador_miles !== '.' || config.separador_decimales !== ',') {
      result = result
        .replace(/\./g, '|TEMP|')
        .replace(/,/g, config.separador_decimales)
        .replace(/\|TEMP\|/g, config.separador_miles);
    }

    return result;
  };

  // Función para formatear rangos de hora (ej: "19:00 - 07:00")
  const formatTimeRange = (startTime: string, endTime: string): string => {
    try {
      // Crear fechas dummy para formatear las horas
      const today = new Date();
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin);
      
      return `${formatTime(startDate)} - ${formatTime(endDate)}`;
    } catch (error) {
      console.error('Error formateando rango de tiempo:', error);
      return `${startTime} - ${endTime}`;
    }
  };

  return {
    config,
    loading,
    error,
    formatTime,
    formatDate,
    formatDateTime,
    formatCurrency,
    formatNumber,
    formatTimeRange,
    reload: loadConfig
  };
}
