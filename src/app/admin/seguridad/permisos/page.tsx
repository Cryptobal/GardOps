"use client";
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function PermisosPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState<string | 'global'>('global');
  const [permisos, setPermisos] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre: '', clave: '' });
  const { success, error } = useToast();
  const router = useRouter();

  async function loadTenants() {
    const res = await fetch('/api/admin/tenants');
    const data = await res.json();
    setTenants(data?.data ?? []);
  }
  async function loadPermisos() {
    const qs = tenantId === 'global' ? '?tenant_id=' : `?tenant_id=${tenantId}`; // cuando vacio => solo globales
    const res = await fetch(`/api/admin/rbac/permisos${qs}`);
    const data = await res.json();
    setPermisos(data?.data ?? []);
  }
  useEffect(() => { loadTenants(); }, []);
  useEffect(() => { loadPermisos(); }, [tenantId]);

  async function createPermiso() {
    try {
      const res = await fetch('/api/admin/rbac/permisos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId === 'global' ? null : tenantId, ...form })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      success('Permiso creado');
      setForm({ nombre: '', clave: '' });
      await loadPermisos();
      router.refresh();
    } catch (e: any) { error('Error creando permiso', e?.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span>Tenant:</span>
        <Select value={tenantId} onValueChange={(v) => setTenantId(v as any)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.nombre} ({t.slug})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50"><tr>
            <th className="px-4 py-2 text-left text-xs uppercase">Nombre</th>
            <th className="px-4 py-2 text-left text-xs uppercase">Clave</th>
          </tr></thead>
          <tbody>
            {permisos.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.nombre}</td>
                <td className="px-4 py-2">{r.clave}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Crear Permiso</h3>
        <div className="flex gap-2">
          <Input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input placeholder="Clave" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} />
          <Button onClick={createPermiso}>Crear</Button>
        </div>
      </div>
    </div>
  );
}


