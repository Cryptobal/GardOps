"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LogoPlaceholder, LogoPlaceholderSmall, LogoPlaceholderMedium, LogoPlaceholderLarge } from "./logo-placeholder";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function Logo({ 
  className = "", 
  width = 120, 
  height = 40, 
  priority = false 
}: LogoProps) {
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
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

  // Si hubo error con la imagen, mostrar placeholder
  if (imageError) {
    return (
      <LogoPlaceholder 
        className={className}
        width={width}
        height={height}
        priority={priority}
      />
    );
  }

  // Determinar el tema actual
  const currentTheme = resolvedTheme || theme || "dark";
  const isDark = currentTheme === "dark";

  // Rutas de las imágenes según el tema
  const logoSrc = isDark 
    ? "/images/gard-logo-dark.png" 
    : "/images/gard-logo-light.png";

  return (
    <div className={`relative ${className}`}>
      <Image
        src={logoSrc}
        alt="Gard Logo"
        width={width}
        height={height}
        priority={priority}
        className="object-contain"
        onError={() => {
          // Fallback si no existe la imagen específica del tema
          const fallbackSrc = "/images/gard-logo.png";
          const img = document.querySelector(`img[src="${logoSrc}"]`) as HTMLImageElement;
          if (img && img.src !== fallbackSrc) {
            img.src = fallbackSrc;
            img.onerror = () => {
              // Si también falla el fallback, mostrar placeholder
              setImageError(true);
            };
          } else {
            // Si también falla el fallback, mostrar placeholder
            setImageError(true);
          }
        }}
      />
    </div>
  );
}

// Componente de logo pequeño para el sidebar
export function LogoSmall({ className = "" }: { className?: string }) {
  return (
    <Logo 
      className={className}
      width={80}
      height={80}
    />
  );
}

// Componente de logo mediano para el navbar
export function LogoMedium({ className = "" }: { className?: string }) {
  return (
    <Logo 
      className={className}
      width={80}
      height={32}
    />
  );
}

// Componente de logo grande para páginas principales
export function LogoLarge({ className = "" }: { className?: string }) {
  return (
    <Logo 
      className={className}
      width={160}
      height={60}
      priority={true}
    />
  );
} 