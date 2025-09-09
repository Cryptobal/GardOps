# Byterover Handbook

*Generado: 2025-01-27*

## Layer 1: System Overview

**Propósito**: GardOps es una aplicación web completa para la gestión de servicios de seguridad privada, incluyendo administración de guardias, asignación de turnos, control de asistencia, nóminas y reportes. Optimiza la operación de empresas de seguridad mediante automatización de procesos críticos.

**Tech Stack**: 
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, PostgreSQL (Vercel Postgres), NextAuth.js
- **Servicios**: Google Maps API, Resend (email), AWS S3/R2 (archivos)
- **Herramientas**: Framer Motion, Recharts, jsPDF, XLSX, Puppeteer

**Arquitectura**: Aplicación monolítica Next.js con arquitectura de capas:
- **Presentación**: Componentes React con server/client components
- **API**: Routes handlers con middleware de autenticación/autorización
- **Lógica de Negocio**: Servicios y utilidades en /lib
- **Datos**: PostgreSQL con queries directas y funciones de base de datos

**Decisiones Técnicas Clave**:
- RBAC (Role-Based Access Control) personalizado para permisos granulares
- Sistema de feature flags para despliegues graduales
- Migración progresiva de APIs legacy a versiones optimizadas
- Nomenclatura de tablas con prefijo 'sueldo_' para módulo de nóminas

**Puntos de Entrada**: 
- `/src/app/page.tsx` - Dashboard principal
- `/src/app/api/` - APIs REST
- `/src/middleware.ts` - Autenticación y autorización global

---

## Layer 2: Module Map

**Módulos Core**:
- **Guardias**: Gestión de personal de seguridad (/guardias, /api/guardias)
- **Instalaciones**: Administración de sitios cliente (/instalaciones, /api/instalaciones)  
- **Asignaciones**: Optimización de asignación guardia-puesto (/asignaciones, /api/asignaciones)
- **Turnos**: Sistema de turnos activos y roles de servicio (/configuracion/roles-servicio)
- **Pauta Mensual/Diaria**: Planificación y control de asistencia (/pauta-mensual, /pauta-diaria)
- **Payroll**: Cálculo de nóminas y sueldos (/payroll, /sueldos)

**Capa de Datos**:
- **Base**: PostgreSQL con conexión via @vercel/postgres
- **Esquemas**: Definidos en /lib/schemas/ con validación Zod
- **Migraciones**: Sistema custom en /lib/database-migrations.ts
- **Queries**: Funciones optimizadas en /lib/db/ y queries directas

**Puntos de Integración**:
- **Autenticación**: NextAuth.js + RBAC custom
- **Mapas**: Google Maps API para geolocalización
- **Email**: Resend para notificaciones
- **Archivos**: AWS S3/R2 para documentos
- **Reportes**: jsPDF + Excel export

**Utilidades**:
- **UI**: Componentes reutilizables en /components/ui (shadcn/ui)
- **Hooks**: Custom hooks en /hooks/
- **Utils**: Funciones helper en /lib/utils/
- **Contexts**: Estado global en /contexts/

**Dependencias de Módulos**:
```
Guardias → Instalaciones → Asignaciones → Turnos → Pauta → Payroll
    ↓           ↓             ↓          ↓        ↓        ↓
  RBAC    →  Geoloc    →   Optimiz  →  Sched  →  Attend → Calc
```

---

## Layer 3: Integration Guide

**API Endpoints Principales**:
```
/api/guardias/* - CRUD guardias, disponibilidad, búsqueda geográfica
/api/instalaciones/* - CRUD instalaciones, turnos, puestos operativos
/api/asignaciones/* - Asignación automática/manual, optimización
/api/ppc/* - Gestión de Puestos Por Cubrir
/api/pauta-mensual/* - Planificación mensual de turnos
/api/pauta-diaria/* - Control diario de asistencia
/api/payroll/* - Cálculos de nómina, estructuras salariales
/api/auth/* - Autenticación, roles, permisos
```

**Archivos de Configuración**:
- `.env.local` - Variables de entorno (DB, APIs, secrets)
- `next.config.js` - Configuración Next.js
- `tailwind.config.ts` - Tema y estilos
- `middleware.ts` - Autenticación global
- `components.json` - Configuración shadcn/ui

**Integraciones Externas**:
- **Google Maps**: Geocodificación, cálculo distancias, mapas interactivos
- **Resend**: Envío de emails (recuperación contraseña, notificaciones)
- **Vercel Postgres**: Base de datos principal
- **AWS S3/R2**: Almacenamiento de documentos y archivos

**Flujos de Trabajo Clave**:
1. **Asignación de Guardias**: Instalación → Radio búsqueda → Guardias cercanos → PPC assignment
2. **Control de Turnos**: Rol servicio → Puestos operativos → Asignaciones → Pauta mensual → Pauta diaria
3. **Cálculo Nóminas**: Asistencia → Horas trabajadas → Estructura salarial → Liquidación → Reportes

**Definiciones de Interfaces**:
- Schemas en `/lib/schemas/` definen tipos TypeScript
- APIs retornan formato estándar: `{ success: boolean, data?: any, error?: string }`
- Estados consistentes: 'Activo'/'Inactivo', 'Pendiente'/'Asignado'/'Completado'

---

## Layer 4: Extension Points

**Patrones de Diseño**:
- **Repository Pattern**: Funciones de acceso a datos en /lib/db/
- **Factory Pattern**: Creación de componentes UI dinámicos
- **Observer Pattern**: Contexts para estado reactivo
- **Strategy Pattern**: Diferentes algoritmos de asignación/cálculo

**Puntos de Extensión**:
- **Feature Flags**: Sistema en /lib/flags.ts para funcionalidades experimentales
- **RBAC**: Permisos granulares extensibles en /lib/permissions.ts
- **API Adapters**: Capa de adaptación para migrar APIs legacy
- **Component Library**: Componentes base extensibles en /components/ui/

**Áreas de Personalización**:
- **Algoritmos de Asignación**: Lógica de optimización en /api/instalaciones/asignacion-automatica/
- **Cálculos de Nómina**: Motor de cálculo en /lib/sueldo/
- **Reportes**: Generación PDF/Excel personalizable
- **Temas UI**: Sistema de theming con Tailwind + CSS variables

**Arquitectura de Plugins**: 
- Middleware extensible para validaciones custom
- Hooks personalizados para lógica de negocio específica
- Componentes wrapper para funcionalidades adicionales

**Cambios Recientes**:
- Migración de sistema PPC a formato individual granular
- Implementación de funciones de base de datos Neon para optimización
- Sistema de recuperación de contraseñas con Resend
- Refactorización de RBAC para mejor escalabilidad
- Feature flags para despliegue gradual de nuevas funcionalidades

---

*Byterover handbook optimizado para navegación de agentes y onboarding de desarrolladores*
