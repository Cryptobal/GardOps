"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function TenantsClient({ initialTenants }: { initialTenants: any[] }) {
  const [tenants, setTenants] = useState(initialTenants);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', slug: '', owner_email: '', owner_nombre: '' });
  const router = useRouter();
  const { success, error } = useToast();

  async function refresh() {
    const res = await fetch('/api/admin/tenants');
    const data = await res.json();
    setTenants(data?.data ?? []);
  }

  async function createTenant() {
    try {
      const res = await fetch('/api/admin/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      success('Tenant creado');
      setOpen(false);
      setForm({ nombre: '', slug: '', owner_email: '', owner_nombre: '' });
      await refresh();
      router.refresh();
    } catch (e: any) {
      error('Error creando tenant', e?.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tenants</h2>
        <Button onClick={() => setOpen(true)}>Nuevo Tenant</Button>
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs uppercase">Nombre</th>
              <th className="px-4 py-2 text-left text-xs uppercase">Slug</th>
              <th className="px-4 py-2 text-left text-xs uppercase">Activo</th>
              <th className="px-4 py-2 text-left text-xs uppercase">Creado</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t: any) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2">{t.nombre}</td>
                <td className="px-4 py-2">{t.slug}</td>
                <td className="px-4 py-2">{t.activo ? 'Sí' : 'No'}</td>
                <td className="px-4 py-2">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-background p-6 rounded-lg w-full max-w-md space-y-3">
            <h3 className="font-semibold text-lg">Crear Tenant</h3>
            <Input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input placeholder="Owner Email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
            <Input placeholder="Owner Nombre" value={form.owner_nombre} onChange={(e) => setForm({ ...form, owner_nombre: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={createTenant}>Crear</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


