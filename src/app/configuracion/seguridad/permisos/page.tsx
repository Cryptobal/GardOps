"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCan } from "@/lib/permissions";
import { rbacFetch } from "@/lib/rbacClient";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

// Componente simple para renderizar descripciones con emojis
function PermisoDescription({ descripcion }: { descripcion: string }) {
  // Función simple para convertir markdown básico a HTML
  const formatDescription = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **texto** -> <strong>texto</strong>
      .replace(/\n/g, '<br />'); // Saltos de línea
  };

  return (
    <div 
      className="text-sm text-muted-foreground leading-relaxed"
      dangerouslySetInnerHTML={{ __html: formatDescription(descripcion) }}
    />
  );
}

type Permiso = { id: string; clave: string; descripcion: string | null; categoria: string | null };

type Stats = {
  total: number;
  categorias: number;
  permisosEnUso: number;
};

export default function PermisosPage() {
  const router = useRouter();
  const { allowed: canRead, loading } = useCan("rbac.permisos.read");
  const { allowed: isPlatformAdmin } = useCan("rbac.platform_admin");

  const [items, setItems] = useState<Permiso[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, categorias: 0, permisosEnUso: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const hasAccess = canRead || isPlatformAdmin;

  useEffect(() => {
    if (!hasAccess || loading) return;
    let done = false;
    (async () => {
      try {
        setBusy(true);
        setError(null);
        const res = await rbacFetch("/api/admin/rbac/permisos", { method: "GET" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j?.detail || j?.error || `HTTP ${res.status}`);
          return;
        }
        if (!done) {
          setItems(Array.isArray(j?.items) ? j.items : []);
          setStats(j?.stats || { total: 0, categorias: 0, permisosEnUso: 0 });
        }
      } catch (e: any) {
        if (!done) setError(e?.message || "Error inesperado");
      } finally {
        if (!done) setBusy(false);
      }
    })();
    return () => { done = true; };
  }, [hasAccess, loading]);

  if (loading) return <div className="p-6">Cargando…</div>;

  if (!hasAccess) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Sin acceso</h2>
          <p className="text-sm text-muted-foreground">No tienes permisos para ver esta sección.</p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => router.push("/configuracion/seguridad")}> 
              ← Volver a Seguridad
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Agrupar permisos por categoría y ordenar alfabéticamente
  const permisosPorCategoria = items.reduce((acc, permiso) => {
    const categoria = permiso.categoria || 'Sin Categoría';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(permiso);
    return acc;
  }, {} as Record<string, Permiso[]>);

  // Ordenar categorías alfabéticamente
  const categoriasOrdenadas = Object.keys(permisosPorCategoria).sort();
  
  // Ordenar permisos dentro de cada categoría alfabéticamente por clave
  Object.keys(permisosPorCategoria).forEach(categoria => {
    permisosPorCategoria[categoria].sort((a, b) => a.clave.localeCompare(b.clave));
  });

  // Funciones para manejar expansión/contracción
  const toggleCategory = (categoria: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria);
    } else {
      newExpanded.add(categoria);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(categoriasOrdenadas));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const isExpanded = (categoria: string) => expandedCategories.has(categoria);

  return (
    <div className="space-y-6">

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Total de Permisos</div>
          <div className="text-2xl font-bold">{busy ? "…" : stats.total}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Categorías</div>
          <div className="text-2xl font-bold">{busy ? "…" : stats.categorias}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Permisos en Uso</div>
          <div className="text-2xl font-bold">{busy ? "…" : stats.permisosEnUso}</div>
        </div>
      </div>

      <div className="space-y-4">
        {busy ? (
          <div className="rounded-xl border p-6 text-center text-muted-foreground">
            Cargando permisos…
          </div>
        ) : stats.total === 0 ? (
          <div className="rounded-xl border p-6 text-center text-muted-foreground">
            No hay permisos disponibles
          </div>
        ) : (
          <>
            {/* Controles de expansión/contracción */}
            <div className="flex gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={expandAll}
                className="text-xs"
              >
                Expandir Todo
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={collapseAll}
                className="text-xs"
              >
                Contraer Todo
              </Button>
            </div>

            {/* Lista de categorías */}
            {categoriasOrdenadas.map(categoria => (
              <div key={categoria} className="rounded-xl border overflow-hidden">
                {/* Header de categoría */}
                <div 
                  className="p-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCategory(categoria)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded(categoria) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{categoria}</h3>
                        <p className="text-sm text-muted-foreground">
                          {permisosPorCategoria[categoria].length} permisos
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isExpanded(categoria) ? 'Contraer' : 'Expandir'}
                    </div>
                  </div>
                </div>

                {/* Contenido de la categoría */}
                {isExpanded(categoria) && (
                  <div className="bg-background">
                    <ul className="divide-y">
                      {permisosPorCategoria[categoria].map(p => (
                        <li key={p.id} className="p-4 hover:bg-muted/20 transition-colors">
                          <div className="space-y-2">
                            <div className="font-mono text-sm font-medium text-primary">
                              {p.clave}
                            </div>
                            {p.descripcion && (
                              <PermisoDescription descripcion={p.descripcion} />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
