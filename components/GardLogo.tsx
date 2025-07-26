import * as React from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface GardLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function GardLogo({ className, size = "md", showText = true }: GardLogoProps) {
  const { theme, resolvedTheme } = useTheme()
  
  // Determinar qué logo usar basado en el tema
  const isDarkMode = resolvedTheme === 'dark' || className?.includes("text-white")
  const logoSrc = isDarkMode ? "/Logo Gard noche.png" : "/Logo Gard dia.png"
  
  const sizes = {
    sm: { height: 20, width: 80 },  // Más compacto y minimalista
    md: { height: 24, width: 96 },  // Tamaño perfecto para navbar
    lg: { height: 32, width: 128 }  // Para casos especiales
  }

  return (
    <div className={cn("flex items-center", className)}>
      {/* Logo PNG Real */}
      <div className="relative">
        <Image
          src={logoSrc}
          alt="GARD Security Logo"
          width={sizes[size].width}
          height={sizes[size].height}
          className="object-contain"
          priority
          onError={(e) => {
            // Fallback a un logo SVG simple si las imágenes no existen
            console.warn("Logo PNG no encontrado, usando fallback")
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
        
        {/* Fallback SVG si no se encuentran las imágenes PNG */}
        <div className="hidden fallback-logo">
          <svg
            width={sizes[size].width}
            height={sizes[size].height}
            viewBox="0 0 120 30"
            className="object-contain"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Escudo simplificado más pequeño */}
            <path
              d="M3 3L1 5V14C1 20 4 25 8 28C12 25 15 20 15 14V5L8 3L3 3Z"
              fill={isDarkMode ? "#60A5FA" : "#1E40AF"}
            />
            
            {/* Texto GARD más compacto */}
            <text
              x="20"
              y="14"
              fill={isDarkMode ? "#FFFFFF" : "#1D4ED8"}
              fontSize="12"
              fontWeight="bold"
              fontFamily="system-ui"
            >
              GARD
            </text>
            
            {/* Texto SECURITY más pequeño */}
            <text
              x="20"
              y="24"
              fill={isDarkMode ? "#FFFFFF99" : "#2563EB"}
              fontSize="8"
              fontWeight="500"
              fontFamily="system-ui"
            >
              SECURITY
            </text>
          </svg>
        </div>
      </div>
    </div>
  )
} 