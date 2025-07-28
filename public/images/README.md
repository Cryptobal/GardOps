# Logos de Gard

Esta carpeta contiene los logos de Gard para diferentes temas y tamaños.

## Archivos requeridos

Para que el sistema funcione correctamente, necesitas cargar los siguientes archivos:

### Logos principales (requeridos)
- `gard-logo.png` - Logo principal (fallback para todos los temas)
- `gard-logo-dark.png` - Logo para modo oscuro
- `gard-logo-light.png` - Logo para modo claro

### Especificaciones recomendadas

#### Logo principal (gard-logo.png)
- **Formato**: PNG con transparencia
- **Tamaño**: 160x60px (mínimo)
- **Fondo**: Transparente
- **Uso**: Fallback cuando no se encuentra el logo específico del tema

#### Logo modo oscuro (gard-logo-dark.png)
- **Formato**: PNG con transparencia
- **Tamaño**: 160x60px (mínimo)
- **Colores**: Optimizado para fondos oscuros
- **Uso**: Se muestra automáticamente en modo oscuro

#### Logo modo claro (gard-logo-light.png)
- **Formato**: PNG con transparencia
- **Tamaño**: 160x60px (mínimo)
- **Colores**: Optimizado para fondos claros
- **Uso**: Se muestra automáticamente en modo claro

## Cómo cargar los logos

1. **Prepara tus imágenes** según las especificaciones anteriores
2. **Renombra los archivos** exactamente como se indica arriba
3. **Coloca los archivos** en esta carpeta (`public/images/`)
4. **Reinicia el servidor** de desarrollo si es necesario

## Componentes disponibles

El sistema incluye varios componentes de logo:

- `LogoSmall` - 32x32px (sidebar)
- `LogoMedium` - 80x32px (navbar)
- `LogoLarge` - 160x60px (páginas principales)

## Fallback automático

Si no tienes los logos específicos del tema, el sistema usará automáticamente `gard-logo.png` como fallback.

## Notas importantes

- Los logos deben tener fondo transparente para mejor integración
- Se recomienda usar PNG para mantener la transparencia
- Los tamaños mínimos aseguran buena calidad en todos los dispositivos
- El sistema detecta automáticamente el tema y cambia el logo correspondiente 