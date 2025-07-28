import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Shield, Plus } from "lucide-react";

export default function GuardiasPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold heading-gradient">Gestión de Guardias</h2>
          <p className="text-muted-foreground">
            Administra el personal de seguridad y sus asignaciones
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Guardia
        </button>
      </div>

      <Card className="card-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Personal de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium text-foreground">
              Módulo en Desarrollo
            </h3>
            <p className="text-muted-foreground max-w-sm">
              Este módulo estará disponible próximamente. Aquí podrás gestionar
              todo el personal de guardias de seguridad.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 