"use client";

import { usePathname } from "next/navigation";
import { navigationItems } from "../../lib/navigation";
import { logout, getToken } from "../../lib/auth-client";
import { Button } from "../ui/button";
import { LogOut, User, Menu, Moon, Sun, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useCan } from "@/lib/permissions";
import { ProfileModal } from "../shared/ProfileModal";
import { UFUTMIndicator } from "../shared/UFUTMIndicator";

interface NavbarProps {
  onMobileMenuToggle?: () => void;
}

export function Navbar({ onMobileMenuToggle }: NavbarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const [isThemeInitialized, setIsThemeInitialized] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { allowed: isPlatformAdmin } = useCan('rbac.platform_admin');
  const [isPlatformAdminJwt, setIsPlatformAdminJwt] = useState(false);
  const [isCarlosIrigoyen, setIsCarlosIrigoyen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Array<{ id: string; nombre: string }>>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState<string>("Usuario");
  
  const currentPage = navigationItems.find(item => item.href === pathname);
  const pageTitle = currentPage?.name || "GardOps";
  const pageDescription = currentPage?.description;

  const handleLogout = () => {
    logout();
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light");
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  // Verificar token y permisos
  useEffect(() => {
    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1] || '')) || {};
        const isDefaultTenant = payload?.tenant_id === '550e8400-e29b-41d4-a716-446655440000';
        const platformAdminJwt = payload?.rol === 'admin' && (!payload?.tenant_id || isDefaultTenant || payload?.is_platform_admin === true);
        const carlosIrigoyen = payload?.email === 'carlos.irigoyen@gard.cl';
        
        setIsPlatformAdminJwt(platformAdminJwt);
        setIsCarlosIrigoyen(carlosIrigoyen);
        
        // Actualizar el nombre del usuario para evitar error de hidratación
        const displayName = payload.name || payload.email || "Usuario";
        setUserDisplayName(displayName);
      }
    } catch {}
    setIsInitialized(true);
  }, []);

  // Inicializar tema
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('light') ? false : true;
    setIsDark(isDarkMode);
    setIsThemeInitialized(true);
  }, []);

  // Cargar tenant seleccionado desde cookie/localStorage
  useEffect(() => {
    try {
      const cookie = document.cookie || '';
      const m = cookie.match(/(?:^|;\s*)x_tenant_id=([^;]+)/);
      const fromCookie = m?.[1] ? decodeURIComponent(m[1]) : null;
      const fromLocal = typeof window !== 'undefined' ? localStorage.getItem('selected_tenant_id') : null;
      
      // Si no hay tenant seleccionado, establecer el tenant del usuario
      if (!fromCookie && !fromLocal) {
        const token = getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1] || '')) || {};
          
          // Carlos.Irigoyen@gard.cl debe entrar siempre a "Gard" por defecto
          if (payload.email === 'carlos.irigoyen@gard.cl') {
            const gardTenant = tenants.find(t => t.nombre === 'Gard');
            if (gardTenant) {
              setTenantId(gardTenant.id);
              localStorage.setItem('selected_tenant_id', gardTenant.id);
              document.cookie = `x_tenant_id=${encodeURIComponent(gardTenant.id)}; path=/; SameSite=Lax`;
              return;
            }
          }
          
          // Para otros usuarios (como admin@demo.com), usar su tenant_id del JWT
          if (payload.tenant_id && !payload.is_platform_admin) {
            setTenantId(payload.tenant_id);
            localStorage.setItem('selected_tenant_id', payload.tenant_id);
            document.cookie = `x_tenant_id=${encodeURIComponent(payload.tenant_id)}; path=/; SameSite=Lax`;
            return;
          }
        }
      }
      
      setTenantId(fromCookie || fromLocal);
    } catch {}
  }, [tenants]); // Agregar tenants como dependencia

  // Cargar lista de tenants (solo para Carlos.Irigoyen@gard.cl)
  useEffect(() => {
    const fetchTenants = async () => {
      if (!isCarlosIrigoyen) return;
      setLoadingTenants(true);
      try {
        const res = await fetch('/api/admin/tenants?page=1&limit=100', { cache: 'no-store', credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const items = (data?.data || []).map((t: any) => ({ id: t.id, nombre: t.nombre }));
          setTenants(items);
        }
      } catch {}
      setLoadingTenants(false);
    };
    fetchTenants();
  }, [isCarlosIrigoyen]);

  const onSelectTenant: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const value = e.target.value || '';
    setTenantId(value || null);
    try {
      if (value) {
        localStorage.setItem('selected_tenant_id', value);
        document.cookie = `x_tenant_id=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
      } else {
        localStorage.removeItem('selected_tenant_id');
        document.cookie = `x_tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    } catch {}
    if (typeof window !== 'undefined') window.location.reload();
  };

  // Obtener información del usuario desde el token JWT
  // Función removida - ahora usamos el estado userDisplayName directamente

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 sm:h-14 md:h-16 max-w-screen-2xl items-center px-2 sm:px-4 md:px-6">
        {/* Mobile menu button - Ultra Responsive */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMobileMenuToggle}
          className="lg:hidden mr-1 sm:mr-2 px-1.5 sm:px-2 py-1 h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-accent/50 border border-border/30 hover:bg-accent/70 ml-1 sm:ml-2 md:ml-4 touch-manipulation active:scale-95 transition-transform"
        >
          <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>

        {/* Page title and description - Responsive */}
        <div className="flex flex-col ml-2 sm:ml-3 md:ml-4 flex-1 min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-semibold text-foreground truncate">{pageTitle}</h1>
          {pageDescription && (
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate hidden sm:block">
              {pageDescription}
            </p>
          )}
        </div>

        {/* UF/UTM Indicators - Responsive */}
        <div className="hidden md:flex items-center ml-4">
          <UFUTMIndicator compact={true} />
        </div>

        {/* Right side - User info and actions - Ultra Responsive */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {isInitialized && isCarlosIrigoyen && (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="hidden sm:inline text-[11px] text-muted-foreground">Selector Tenant</span>
              <select
                value={tenantId || ''}
                onChange={onSelectTenant}
                className="h-7 sm:h-8 rounded-md border border-border bg-background text-xs px-2"
                title="Seleccionar Tenant"
              >
                <option value="">Todos (KPIs)</option>
                {loadingTenants && <option value="" disabled>Cargando...</option>}
                {!loadingTenants && tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          )}
          {/* Theme toggle button - Responsive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg touch-manipulation active:scale-95 transition-transform"
          >
            {isThemeInitialized && (isDark ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />)}
          </Button>

          {/* Profile button - Responsive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={openProfileModal}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary touch-manipulation active:scale-95 transition-transform"
            title="Mi Perfil"
          >
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>

          {/* User info - Responsive (hidden on very small screens) */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-accent/50 border border-border/30">
            <span className="text-xs sm:text-sm font-medium text-foreground max-w-[80px] sm:max-w-[120px] md:max-w-none truncate">
              {userDisplayName}
            </span>
          </div>

          {/* Logout button - Responsive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-7 sm:h-8 px-2 sm:px-3 rounded-lg hover:bg-destructive/10 hover:text-destructive touch-manipulation active:scale-95 transition-transform"
          >
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
            <span className="hidden md:inline text-xs sm:text-sm">Cerrar</span>
          </Button>
        </div>
      </div>
      
      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </nav>
  );
} 