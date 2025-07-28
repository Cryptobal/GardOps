"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoPlaceholderProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function LogoPlaceholder({ 
  className = "", 
  width = 120, 
  height = 40, 
  priority = false 
}: LogoPlaceholderProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  // Evitar hidratación incorrecta
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className={`bg-muted animate-pulse rounded ${className}`}
        style={{ width, height }}
      />
    );
  }

  // Determinar el tema actual
  const currentTheme = resolvedTheme || theme || "dark";
  const isDark = currentTheme === "dark";

  // Calcular el tamaño de fuente basado en el ancho
  const fontSize = Math.max(10, Math.min(width * 0.25, 20));

  return (
    <div 
      className={`flex items-center justify-center rounded-md border-2 border-dashed font-bold ${
        isDark 
          ? 'bg-gray-800/50 border-gray-600 text-gray-200' 
          : 'bg-gray-100/50 border-gray-300 text-gray-700'
      } ${className}`}
      style={{ 
        width, 
        height, 
        fontSize: `${fontSize}px`,
        minWidth: width,
        minHeight: height
      }}
    >
      GARD
    </div>
  );
}

// Componente de logo placeholder pequeño para el sidebar
export function LogoPlaceholderSmall({ className = "" }: { className?: string }) {
  return (
    <LogoPlaceholder 
      className={className}
      width={32}
      height={32}
    />
  );
}

// Componente de logo placeholder mediano para el navbar
export function LogoPlaceholderMedium({ className = "" }: { className?: string }) {
  return (
    <LogoPlaceholder 
      className={className}
      width={80}
      height={32}
    />
  );
}

// Componente de logo placeholder grande para páginas principales
export function LogoPlaceholderLarge({ className = "" }: { className?: string }) {
  return (
    <LogoPlaceholder 
      className={className}
      width={160}
      height={60}
      priority={true}
    />
  );
} 