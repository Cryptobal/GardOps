export interface Usuario {
  id: string;
  email: string;
  password: string; // Hash de la contraseña
  nombre: string;
  apellido: string;
  rol: 'admin' | 'supervisor' | 'guardia';
  activo: boolean;
  fechaCreacion: Date;
  ultimoAcceso?: Date;
  telefono?: string;
  avatar?: string;
  tenant_id: string; // ID del tenant/empresa
}

export interface CreateUsuarioData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: 'admin' | 'supervisor' | 'guardia';
  telefono?: string;
  tenant_id: string; // ID del tenant/empresa
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    rol: string;
    tenant_id: string;
  };
}

export const UsuarioRoles = {
  ADMIN: 'admin' as const,
  SUPERVISOR: 'supervisor' as const,
  GUARDIA: 'guardia' as const,
};

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  // Mínimo 6 caracteres
  return password.length >= 6;
}

export function validateUsuario(data: CreateUsuarioData): string[] {
  const errors: string[] = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Email inválido');
  }

  if (!data.password || !validatePassword(data.password)) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
  }

  if (!data.nombre || data.nombre.trim().length === 0) {
    errors.push('El nombre es obligatorio');
  }

  if (!data.apellido || data.apellido.trim().length === 0) {
    errors.push('El apellido es obligatorio');
  }

  if (!Object.values(UsuarioRoles).includes(data.rol)) {
    errors.push('Rol inválido');
  }

  return errors;
} 