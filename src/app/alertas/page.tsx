import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { AlertTriangle, Plus } from "lucide-react";

export default function AlertasPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold heading-gradient">Alertas y KPIs</h2>
          <p className="text-muted-foreground">
            Monitoreo, alertas y indicadores de rendimiento
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Alerta
        </button>
      </div>

      <Card className="card-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Panel de Monitoreo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium text-foreground">
              Módulo en Desarrollo
            </h3>
            <p className="text-muted-foreground max-w-sm">
              Este módulo estará disponible próximamente. Aquí podrás monitorear
              alertas y KPIs del sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 