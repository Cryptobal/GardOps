"use client";

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Solo en desarrollo para no contaminar producción
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Web Vital:', {
        name: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
        delta: Math.round(metric.delta)
      });
    }
    
    // En producción podrías enviar a analytics
    // analytics.track('web-vital', metric);
  });

  return null;
}

