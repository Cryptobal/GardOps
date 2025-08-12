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
    icon: CreditCard
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
    icon: FolderOpen
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
    icon: Settings
  }
]; 