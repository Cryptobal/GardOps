import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DebugSelectComponent() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      try {
        const response = await fetch('/api/admin/rbac/roles', {
          headers: {
            'x-user-email': 'carlos.irigoyen@gard.cl'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setRoles(data.items || []);
          console.log('Roles cargados:', data.items);
        } else {
          console.error('Error cargando roles:', response.status);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRoles();
  }, []);

  if (loading) {
    return <div>Cargando roles...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Debug Select Component</h2>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Roles disponibles ({roles.length}):</label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona un rol" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.nombre}
              </SelectItem>
            ))}
            {roles.length === 0 && (
              <SelectItem value="" disabled>
                No hay roles disponibles
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        Rol seleccionado: {selectedRole || 'Ninguno'}
      </div>

      <div className="text-xs text-muted-foreground">
        <pre>{JSON.stringify(roles, null, 2)}</pre>
      </div>
    </div>
  );
}
