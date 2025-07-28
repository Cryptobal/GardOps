import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Building2, Plus } from "lucide-react";

export default function InstalacionesPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen lg:min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold heading-gradient">Gestión de Instalaciones</h2>
          <p className="text-muted-foreground">
            Administra las ubicaciones y sitios bajo vigilancia
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Instalación
        </button>
      </div>

      <Card className="card-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            Lista de Instalaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium text-foreground">
              Módulo en Desarrollo
            </h3>
            <p className="text-muted-foreground max-w-sm">
              Este módulo estará disponible próximamente. Aquí podrás gestionar
              todas las instalaciones y sitios.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 