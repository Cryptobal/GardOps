"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, UserCheck, Settings } from "lucide-react";
import BackToSecurity from "@/components/BackToSecurity";
import { rbacFetch } from "@/lib/rbacClient";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UsuarioRow = { 
  id: string; 
  email: string; 
  nombre: string | null; 
  apellido?: string | null;
  activo: boolean; 
  tenant_id: string | null; 
  userRole?: string; 
  roles?: string 
};
type Rol = { id: string; nombre: string; tenant_id: string | null };

export default function UsuariosPage() {
  const [rows, setRows] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioRow | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UsuarioRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UsuarioRow | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editApellido, setEditApellido] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const { addToast: toast } = useToast();
  const router = useRouter();

  async function toggleActivo(id: string, current: boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, activo: !current } : r)));
    try {
      const res = await rbacFetch(`/api/admin/rbac/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !current }),
      });
      if (res.status === 403) throw new Error("No tienes permisos suficientes (403)");
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || (json as any)?.ok === false) {
        throw new Error((json as any)?.error || "No se pudo actualizar el estado");
      }
    } catch (e: any) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, activo: current } : r)));
      setError(e?.message || "Error al actualizar estado");
    }
  }

  function openDeleteModal(user: UsuarioRow) {
    setUserToDelete(user);
    setShowDeleteModal(true);
  }

  function openEditModal(user: UsuarioRow) {
    setUserToEdit(user);
    setEditNombre(user.nombre || "");
    setEditApellido(user.apellido || "");
    setEditPassword("");
    setEditShowPassword(false);
    setShowEditModal(true);
  }

  async function saveUserEdit() {
    if (!userToEdit) return;
    
    setSavingEdit(true);
    try {
      const updates: any = {};
      if (editNombre !== userToEdit.nombre) updates.nombre = editNombre;
      if (editApellido !== userToEdit.apellido) updates.apellido = editApellido;
      if (editPassword) updates.password = editPassword;
      
      const res = await rbacFetch(`/api/admin/rbac/usuarios/${userToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (res.ok) {
        // Actualizar el usuario en la lista
        setRows(prev => prev.map(u => 
          u.id === userToEdit.id 
            ? { ...u, nombre: editNombre, apellido: editApellido }
            : u
        ));
        toast?.({ title: 'Usuario actualizado', type: 'success' });
        setShowEditModal(false);
      } else {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any)?.error || "Error al actualizar");
      }
    } catch (error: any) {
      toast?.({ title: 'Error', description: error.message, type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  }

  async function openRolesModal(user: UsuarioRow) {
    logger.debug('Abriendo modal para usuario:', user.email);
    setSelectedUser(user);
    setShowRolesModal(true);
    setLoadingRoles(true);
    setSelectedRole(null); // Reset selected role
    
    try {
      // Cargar rol actual del usuario (solo el primero)
      logger.debug('Cargando roles del usuario:', user.id);
      const res = await rbacFetch(`/api/admin/rbac/usuarios/${user.id}/roles`);
      const json = await res.json().catch(() => ({}));
      
      logger.debug('Respuesta del servidor:', json);
      
      if (res.ok) {
        const userRolesData = (json as any)?.roles || [];
        // Tomar solo el primer rol (o null si no tiene ninguno)
        const rolId = userRolesData.length > 0 ? userRolesData[0].id : null;
        logger.debug('Rol actual del usuario:', rolId);
        setUserRole(rolId);
        setSelectedRole(rolId); // Inicializar con el rol actual
      } else {
        logger.debug('Error en respuesta:', res.status, json);
        setUserRole(null);
        setSelectedRole(null);
      }
    } catch (e: any) {
      logger.error('Error cargando rol del usuario::', e);
      setUserRole(null);
      setSelectedRole(null);
    } finally {
      setLoadingRoles(false);
    }
  }

  async function deleteUser(user: UsuarioRow) {
    if (!user) return;
    
    try {
      setDeletingUser(user.id);
      logger.debug('Eliminando usuario:', user.email);
      
      const res = await rbacFetch(`/api/admin/rbac/usuarios/${user.id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        toast({ title: 'Usuario eliminado', type: 'success' });
        logger.debug('Usuario eliminado exitosamente');
        setShowDeleteModal(false);
        setUserToDelete(null);
        
        // Refrescar la lista de usuarios
        await loadUsers();
      } else {
        const json = await res.json().catch(() => ({}));
        logger.error('Error en respuesta::', json);
        throw new Error((json as any)?.error || 'Error al eliminar usuario');
      }
    } catch (e: any) {
      logger.error('Error eliminando usuario::', e);
      toast({ title: 'Error', description: e?.message || 'Error al eliminar usuario', type: 'error' });
    } finally {
      setDeletingUser(null);
    }
  }

  async function assignUserRole() {
    if (!selectedRole || !selectedUser) {
      toast({ title: 'Error', description: 'Debes seleccionar un rol', type: 'error' });
      return;
    }

    try {
      setSavingRole(true);
      logger.debug('Asignando rol:', selectedRole, 'al usuario:', selectedUser.id);
      
      const res = await rbacFetch(`/api/admin/rbac/usuarios/${selectedUser.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol_id: selectedRole, action: 'add' }),
      });
      
                  if (res.ok) {
              setUserRole(selectedRole);
              toast({ title: 'Rol asignado', type: 'success' });
              logger.debug('Rol asignado exitosamente');
              setShowRolesModal(false);
              
              // Refrescar la lista de usuarios para mostrar el rol actualizado
              logger.debug('Refrescando lista de usuarios...');
              await loadUsers();
            } else {
        const json = await res.json().catch(() => ({}));
        logger.error('Error en respuesta::', json);
        throw new Error((json as any)?.error || 'Error al asignar rol');
      }
    } catch (e: any) {
      logger.error('Error asignando rol::', e);
      toast({ title: 'Error', description: e?.message || 'Error al asignar rol', type: 'error' });
    } finally {
      setSavingRole(false);
    }
  }

  // Función para cargar los roles de cada usuario (ya no necesaria, la API los incluye)
  async function loadUserRoles(users: UsuarioRow[]): Promise<UsuarioRow[]> {
    // La API ya incluye los roles, así que solo retornamos los usuarios tal como vienen
    return users;
  }

  // Función para cargar usuarios con roles
  async function loadUsers() {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        rbacFetch(`/api/admin/rbac/usuarios?page=1&limit=20`),
        rbacFetch(`/api/admin/rbac/roles`)
      ]);
      
      const [usersJson, rolesJson] = await Promise.all([
        usersRes.json().catch(() => ({})),
        rolesRes.json().catch(() => ({}))
      ]);
      
      if (usersRes.status === 403) {
        setError("No tienes permisos suficientes (403).");
        setRows([]);
      } else if (!usersRes.ok) {
        setError((usersJson as any)?.error || "Error al cargar usuarios.");
        setRows([]);
      } else {
        const items = (usersJson as any)?.items;
        const users = Array.isArray(items) ? (items as UsuarioRow[]) : [];
        
        // Cargar roles para cada usuario
        const usersWithRoles = await loadUserRoles(users);
        setRows(usersWithRoles);
        setError(null);
      }
      
      if (rolesRes.ok) {
        const rolesItems = (rolesJson as any)?.items;
        setRoles(Array.isArray(rolesItems) ? (rolesItems as Rol[]) : []);
      }
    } catch (error) {
      logger.error('Error cargando usuarios::', error);
      setError("Error al cargar usuarios.");
      setRows([]);
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        await loadUsers();
      } catch (error) {
        if (!isMounted) return;
        setError("Error al cargar usuarios.");
        setRows([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        <div className="flex justify-between items-center">
          <Button
            onClick={() => setShowNew(true)}
            aria-label="Abrir modal Nuevo Usuario"
          >
            Nuevo Usuario
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, apellido o email..."
            className="pl-10"
          />
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Cargando usuarios…</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden border rounded-lg">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Último Acceso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {row.nombre ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {row.email}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {row.roles ? (
                            <span className="text-sm font-medium text-green-700">
                              {row.roles}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Sin rol</span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openRolesModal(row)}
                            className="h-6 w-6 p-0"
                            aria-label="Gestionar roles"
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {row.activo ? "Activo" : "Inactivo"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">—</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(row)}
                            disabled={loading}
                            aria-label="Editar usuario"
                            title="Editar usuario"
                          >
                            ✏️ Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActivo(row.id, row.activo)}
                            disabled={loading}
                            aria-label={row.activo ? "Desactivar usuario" : "Activar usuario"}
                          >
                            {row.activo ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDeleteModal(row)}
                            disabled={loading || deletingUser === row.id}
                            aria-label="Eliminar usuario"
                          >
                            {deletingUser === row.id ? "Eliminando..." : "🗑️"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No hay usuarios para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={showNew}
        onOpenChange={(open) => {
          setShowNew(open);
          if (!open) {
            setFormError(null);
            setEmail("");
            setNombre("");
            setPassword("");
            setShowPassword(false);
            setCreating(false);
            setSelectedRole(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Input
                type="email"
                placeholder="Correo electrónico"
                aria-label="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Nombre (opcional)"
                aria-label="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña *"
                aria-label="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "🙈" : "👁️"}
              </Button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rol inicial (opcional)</label>
              <Select value={selectedRole || "none"} onValueChange={(value) => setSelectedRole(value === 'none' ? null : value)}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Sin rol inicial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin rol</SelectItem>
                  {roles.map((rol) => (
                    <SelectItem key={rol.id} value={rol.id}>{rol.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNew(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setFormError(null);
                const emailValid = /\S+@\S+\.\S+/.test(email);
                if (!email || !emailValid) {
                  setFormError("Email inválido o faltante");
                  return;
                }
                if (!password || password.trim().length < 6) {
                  setFormError("La contraseña es obligatoria y debe tener al menos 6 caracteres");
                  return;
                }
                try {
                  setCreating(true);
                  const res = await rbacFetch(`/api/admin/rbac/usuarios`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email,
                      nombre: nombre || undefined,
                      password: password,
                      roleId: selectedRole ?? undefined,
                    }),
                  });
                  if (res.status === 409) {
                    const json = await res.json().catch(() => ({} as any));
                    const msg = (json as any)?.error === 'Usuario ya existe' || (json as any)?.error === 'email_duplicado'
                      ? 'El email ya existe'
                      : 'El email ya existe';
                    toast ? toast({ title: 'Error', description: msg, type: 'error' }) : logger.warn(msg);
                  } else if (res.status === 403) {
                    setFormError("No tienes permisos suficientes (403)");
                  } else {
                    const json = await res.json().catch(() => ({} as any));
                    if (!res.ok || (json as any)?.ok === false) {
                      setFormError((json as any)?.error || "No se pudo crear el usuario");
                    } else {
                      const item = (json as any)?.item as UsuarioRow | undefined;
                      if (item) {
                        setRows((prev) => [item, ...prev]);
                      } else if ((json as any)?.user) {
                        // compat
                        const user = (json as any)?.user as UsuarioRow;
                        setRows((prev) => [user, ...prev]);
                      }
                      toast ? toast({ title: 'Usuario creado', type: 'success' }) : logger.debug('Usuario creado');
                      setShowNew(false);
                      setEmail("");
                      setNombre("");
                      setPassword("");
                      setSelectedRole(null);
                      setShowPassword(false);
                      setFormError(null);
                      router.refresh();
                    }
                  }
                } catch {
                  setFormError("No se pudo crear el usuario");
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating}
              aria-label="Crear nuevo usuario"
            >
              {creating ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para gestionar roles */}
      <Dialog
        open={showRolesModal}
        onOpenChange={(open) => {
          setShowRolesModal(open);
          if (!open) {
            setSelectedUser(null);
            setUserRole(null);
            setLoadingRoles(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Gestionar Roles
            </DialogTitle>
            <DialogDescription>
              Asigna un rol al usuario seleccionado (solo un rol por usuario)
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{selectedUser.nombre || 'Sin nombre'}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                {userRole && (
                  <div className="mt-2 pt-2 border-t border-muted">
                    <p className="text-xs text-muted-foreground">Rol actual:</p>
                    <p className="text-sm font-medium text-green-700">
                      {roles.find(r => r.id === userRole)?.nombre || 'Desconocido'}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Seleccionar Rol</h4>
                {selectedRole && selectedRole !== userRole && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <p className="text-sm text-blue-700 font-medium">
                        Rol seleccionado: {roles.find(r => r.id === selectedRole)?.nombre}
                      </p>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      Haz click en "Guardar Rol" para aplicar el cambio.
                    </p>
                  </div>
                )}
                {loadingRoles ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Select 
                    value={selectedRole || ""} 
                    onValueChange={(value) => {
                      logger.debug('Select onValueChange llamado con:', value);
                      setSelectedRole(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((rol) => (
                        <SelectItem key={rol.id} value={rol.id}>
                          {rol.nombre}
                        </SelectItem>
                      ))}
                      {roles.length === 0 && (
                        <SelectItem value="" disabled>
                          No hay roles disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRolesModal(false)}
              disabled={savingRole}
            >
              Cancelar
            </Button>
            <Button
              onClick={assignUserRole}
              disabled={!selectedRole || savingRole}
            >
              {savingRole ? "Guardando..." : "Guardar Rol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar al usuario{" "}
              <strong>{userToDelete?.nombre || userToDelete?.email}</strong>?
              <br />
              <br />
              <span className="text-red-600 font-medium">
                ⚠️ Esta acción no se puede deshacer.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
              disabled={deletingUser !== null}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && deleteUser(userToDelete)}
              disabled={deletingUser !== null}
            >
              {deletingUser ? "Eliminando..." : "Eliminar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Edición de Usuario */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={userToEdit?.email || ""}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                placeholder="Nombre del usuario"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Apellido</label>
              <Input
                value={editApellido}
                onChange={(e) => setEditApellido(e.target.value)}
                placeholder="Apellido del usuario"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nueva Contraseña (opcional)</label>
              <div className="relative mt-1">
                <Input
                  type={editShowPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Dejar en blanco para no cambiar"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setEditShowPassword(!editShowPassword)}
                >
                  {editShowPassword ? "🙈" : "👁️"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveUserEdit}
              disabled={savingEdit}
            >
              {savingEdit ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
