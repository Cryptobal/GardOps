import { 
  Home, 
  Users, 
  Building2, 
  Shield, 
  Calendar, 
  Clock, 
  FileText, 
  FolderOpen, 
  AlertTriangle, 
  Settings,
  MapPin,
  Target,
  CalendarDays,
  Activity,
  DollarSign,
  Calculator,
  Building,
  FileText as FileTextIcon,
  CreditCard,
  Key,
  Lock
} from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  permission?: string; // Permiso requerido para mostrar el ítem
  children?: NavigationItem[];
}

export const navigationItems: NavigationItem[] = [
  {
    name: "Inicio",
    href: "/",
    icon: Home
  },
  {
    name: "Clientes",
    href: "/clientes",
    icon: Users
  },
  {
    name: "Instalaciones",
    href: "/instalaciones",
    icon: Building2
  },
  {
    name: "Guardias",
    href: "/guardias",
    icon: Shield
  },
  {
    name: "Pauta Mensual",
    href: "/pauta-mensual",
    icon: Calendar
  },
  {
    name: "Pauta Diaria",
    href: "/pauta-diaria",
    icon: CalendarDays
  },
  {
    name: "Turnos Extras",
    href: "/pauta-diaria/turnos-extras",
    icon: DollarSign
  },
  {
    name: "Payroll",
    href: "/payroll",
    icon: CreditCard,
    children: [
      {
        name: "Ítems Globales",
        href: "/payroll/items-globales",
        icon: DollarSign
      },
      {
        name: "Ítems Extras",
        href: "/payroll/items-extras",
        icon: FileText
      }
    ]
  },
  {
    name: "Sueldos",
    href: "/sueldos",
    icon: Calculator
  },
  {
    name: "PPC",
    href: "/ppc",
    icon: FileText
  },
  {
    name: "Documentos",
    href: "/documentos",
    icon: FolderOpen,
    children: [
      {
        name: "Todos los Documentos",
        href: "/documentos",
        icon: FileText
      },
      {
        name: "Plantillas",
        href: "/documentos/plantillas",
        icon: FileTextIcon
      }
    ]
  },
  {
    name: "Alertas y KPIs",
    href: "/alertas",
    icon: AlertTriangle
  },
  {
    name: "Asignaciones",
    href: "/asignaciones",
    icon: Target
  },
  {
    name: "Configuración",
    href: "/configuracion",
    icon: Settings,
    children: [
      {
        name: "Roles de Servicio",
        href: "/configuracion/roles-servicio",
        icon: Clock
      },
      {
        name: "Estructuras de Servicio",
        href: "/estructuras",
        icon: Activity
      },
      {
        name: "Tipos de Puesto",
        href: "/configuracion/tipos-puesto",
        icon: MapPin
      },
      {
        name: "Tipos de Documentos",
        href: "/configuracion/tipos-documentos",
        icon: FileText
      },
      {
        name: "🔒 Seguridad",
        href: "/configuracion/seguridad",
        icon: Lock,
        permission: "rbac.admin",
        children: [
          {
            name: "👥 Usuarios",
            href: "/configuracion/seguridad/usuarios",
            icon: Users,
            permission: "rbac.admin"
          },
          {
            name: "🛡️ Roles",
            href: "/configuracion/seguridad/roles",
            icon: Shield,
            permission: "rbac.admin"
          },
          {
            name: "🔑 Permisos",
            href: "/configuracion/seguridad/permisos",
            icon: Key,
            permission: "rbac.admin"
          }
        ]
      }
    ]
  }
]; 