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
  Phone,
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
    icon: Users,
    permission: "clientes.view"
  },
  {
    name: "Instalaciones",
    href: "/instalaciones",
    icon: Building2,
    permission: "instalaciones.view"
  },
  {
    name: "Guardias",
    href: "/guardias",
    icon: Shield,
    permission: "guardias.view"
  },
  {
    name: "Pauta Mensual",
    href: "/pauta-mensual",
    icon: Calendar,
    permission: "pautas.view"
  },
  {
    name: "Pauta Diaria",
    href: "/pauta-diaria",
    icon: CalendarDays,
    permission: "pautas.view"
  },
  {
    name: "Central de Monitoreo",
    href: "/central-monitoreo",
    icon: Phone,
    permission: "central_monitoring.view"
  },
  {
    name: "Turnos Extras",
    href: "/pauta-diaria/turnos-extras",
    icon: DollarSign,
    permission: "turnos.view"
  },
  {
    name: "Payroll",
    href: "/payroll",
    icon: CreditCard,
    permission: "payroll.view"
  },
  {
    name: "PPC",
    href: "/ppc",
    icon: FileText,
    permission: "ppc.view"
  },
  {
    name: "Documentos",
    href: "/documentos",
    icon: FolderOpen,
    permission: "documentos.view"
  },
  {
    name: "Documentos Instalaciones",
    href: "/instalaciones/documentos",
    icon: Building2,
    permission: "documentos.view"
  },
  {
    name: "Asignaciones",
    href: "/asignaciones",
    icon: Target,
    permission: "asignaciones.view"
  },
  {
    name: "Configuración",
    href: "/configuracion",
    icon: Settings,
    permission: "configuracion.view"
  },
  {
    name: "Documentos Postulación",
    href: "/configuracion/documentos-postulacion",
    icon: FileText,
    permission: "configuracion.view"
  }
]; 