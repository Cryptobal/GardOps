import { Usuario, CreateUsuarioData, LoginCredentials, AuthResponse } from '../schemas/usuarios';
import crypto from 'crypto';

// Base de datos simulada en memoria (en producción sería una base de datos real)
class UsuariosDatabase {
  private usuarios: Usuario[] = [];

  constructor() {
    this.initializeDefaultUsers();
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  private comparePassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private initializeDefaultUsers() {
    const defaultUsers: CreateUsuarioData[] = [
      {
        email: 'admin@gardops.com',
        password: 'admin123',
        nombre: 'Administrador',
        apellido: 'Sistema',
        rol: 'admin',
        telefono: '+56 9 1234 5678'
      },
      {
        email: 'supervisor@gardops.com',
        password: 'super123',
        nombre: 'Juan',
        apellido: 'Supervisor',
        rol: 'supervisor',
        telefono: '+56 9 8765 4321'
      },
      {
        email: 'guardia@gardops.com',
        password: 'guard123',
        nombre: 'Pedro',
        apellido: 'Guardia',
        rol: 'guardia',
        telefono: '+56 9 5555 5555'
      }
    ];

    defaultUsers.forEach(userData => {
      this.createUser(userData);
    });

    console.log('✅ Usuarios por defecto creados:', this.usuarios.length);
  }

  createUser(data: CreateUsuarioData): Usuario | null {
    // Verificar si el email ya existe
    if (this.usuarios.find(u => u.email === data.email)) {
      return null;
    }

    const usuario: Usuario = {
      id: this.generateId(),
      email: data.email,
      password: this.hashPassword(data.password),
      nombre: data.nombre,
      apellido: data.apellido,
      rol: data.rol,
      activo: true,
      fechaCreacion: new Date(),
      telefono: data.telefono,
    };

    this.usuarios.push(usuario);
    return usuario;
  }

  findByEmail(email: string): Usuario | null {
    return this.usuarios.find(u => u.email === email && u.activo) || null;
  }

  findById(id: string): Usuario | null {
    return this.usuarios.find(u => u.id === id && u.activo) || null;
  }

  getAllUsers(): Usuario[] {
    return this.usuarios.filter(u => u.activo);
  }

  authenticateUser(email: string, password: string): Usuario | null {
    const user = this.findByEmail(email);
    if (!user) return null;

    if (this.comparePassword(password, user.password)) {
      // Actualizar último acceso
      user.ultimoAcceso = new Date();
      return user;
    }

    return null;
  }

  updateUser(id: string, updates: Partial<Usuario>): Usuario | null {
    const userIndex = this.usuarios.findIndex(u => u.id === id);
    if (userIndex === -1) return null;

    // No permitir actualizar ciertos campos críticos
    const { password, id: _, fechaCreacion, ...safeUpdates } = updates;
    
    this.usuarios[userIndex] = {
      ...this.usuarios[userIndex],
      ...safeUpdates,
    };

    return this.usuarios[userIndex];
  }

  deleteUser(id: string): boolean {
    const userIndex = this.usuarios.findIndex(u => u.id === id);
    if (userIndex === -1) return false;

    // Soft delete - marcar como inactivo
    this.usuarios[userIndex].activo = false;
    return true;
  }

  // Métodos para cambio de contraseña
  changePassword(id: string, oldPassword: string, newPassword: string): boolean {
    const user = this.findById(id);
    if (!user) return false;

    if (!this.comparePassword(oldPassword, user.password)) return false;

    user.password = this.hashPassword(newPassword);
    return true;
  }
}

// Instancia singleton de la base de datos
const db = new UsuariosDatabase();

// Funciones exportadas para usar en las APIs
export async function createUser(data: CreateUsuarioData): Promise<Usuario | null> {
  return db.createUser(data);
}

export async function authenticateUser(credentials: LoginCredentials): Promise<AuthResponse | null> {
  const user = db.authenticateUser(credentials.email, credentials.password);
  
  if (!user) return null;

  // Crear JWT token
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId: user.id,
    email: user.email,
    rol: user.rol,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 horas
  };

  // JWT simulado (en producción usar jsonwebtoken)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = btoa(JSON.stringify(payload));
  const signature = btoa('gardops-secret-signature');
  const access_token = `${header}.${payloadEncoded}.${signature}`;

  return {
    access_token,
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
    }
  };
}

export async function findUserByEmail(email: string): Promise<Usuario | null> {
  return db.findByEmail(email);
}

export async function findUserById(id: string): Promise<Usuario | null> {
  return db.findById(id);
}

export async function getAllUsers(): Promise<Usuario[]> {
  return db.getAllUsers();
}

export async function updateUser(id: string, updates: Partial<Usuario>): Promise<Usuario | null> {
  return db.updateUser(id, updates);
}

export async function deleteUser(id: string): Promise<boolean> {
  return db.deleteUser(id);
}

export async function changeUserPassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
  return db.changePassword(id, oldPassword, newPassword);
} 