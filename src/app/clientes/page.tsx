import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Users, Plus } from "lucide-react";

export default function ClientesPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold heading-gradient">Gestión de Clientes</h2>
          <p className="text-muted-foreground">
            Administra la información y contratos de tus clientes
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </button>
      </div>

      <Card className="card-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Lista de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Users className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium text-foreground">
              Módulo en Desarrollo
            </h3>
            <p className="text-muted-foreground max-w-sm">
              Este módulo estará disponible próximamente. Aquí podrás gestionar
              toda la información de tus clientes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 