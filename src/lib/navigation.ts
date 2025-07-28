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
  MapPin 
} from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export const navigationItems: NavigationItem[] = [
  {
    name: "Inicio",
    href: "/",
    icon: Home,
    description: "Panel principal de GardOps"
  },
  {
    name: "Clientes",
    href: "/clientes",
    icon: Users,
    description: "Gestión de clientes"
  },
  {
    name: "Instalaciones",
    href: "/instalaciones",
    icon: Building2,
    description: "Gestión de instalaciones"
  },
  {
    name: "Guardias",
    href: "/guardias",
    icon: Shield,
    description: "Gestión de guardias de seguridad"
  },
  {
    name: "Pauta Mensual",
    href: "/pauta-mensual",
    icon: Calendar,
    description: "Planificación mensual"
  },
  {
    name: "Turnos Diarios",
    href: "/turnos-diarios",
    icon: Clock,
    description: "Gestión de turnos diarios"
  },
  {
    name: "PPC",
    href: "/ppc",
    icon: FileText,
    description: "Procedimientos y protocolos"
  },
  {
    name: "Documentos",
    href: "/documentos",
    icon: FolderOpen,
    description: "Gestión documental"
  },
  {
    name: "Alertas y KPIs",
    href: "/alertas",
    icon: AlertTriangle,
    description: "Monitoreo y indicadores"
  },
  {
    name: "Configuración",
    href: "/configuracion",
    icon: Settings,
    description: "Configuración del sistema"
  },
  {
    name: "Test Direcciones",
    href: "/test-direccion",
    icon: MapPin,
    description: "Prueba de autocompletado de direcciones"
  }
]; 