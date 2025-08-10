import { NextRequest } from 'next/server';
import { POST } from './route';
import * as authModule from '@/lib/auth';
import * as databaseModule from '@/lib/database';

// Mock de dependencias
jest.mock('@/app/api/_middleware/withPermission', () => ({
  withPermission: (permission: string, handler: Function) => {
    // Simular withPermission para testing
    return async (req: NextRequest) => {
      // Mock: verificar permisos aquí en tests
      const mockHasPermission = (global as any).__mockHasPermission ?? true;
      
      if (!mockHasPermission) {
        return new Response('Forbidden', { status: 403 });
      }
      
      return handler(req);
    };
  },
}));

jest.mock('@/lib/auth', () => ({
  getCurrentUserRef: jest.fn(),
}));

jest.mock('@/lib/database', () => ({
  query: jest.fn(),
}));

describe('POST /api/turnos/asistencia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).__mockHasPermission = true;
  });

  describe('Validación de parámetros', () => {
    it('debería retornar 400 si no se envía body', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: 'invalid json {',
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Invalid JSON');
    });

    it('debería retornar 400 si falta pauta_id', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ estado: 'asistio' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('pauta_id y estado son requeridos');
    });

    it('debería retornar 400 si falta estado', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1 }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('pauta_id y estado son requeridos');
    });

    it('debería retornar 400 para estado inválido', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'invalido' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Estado inválido: invalido');
    });
  });

  describe('Autenticación y autorización', () => {
    it('debería retornar 403 si no tiene permisos', async () => {
      (global as any).__mockHasPermission = false;
      
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'asistio' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(403);
      const text = await response.text();
      expect(text).toBe('Forbidden');
    });

    it('debería retornar 401 si no se puede identificar al usuario', async () => {
      (authModule.getCurrentUserRef as jest.Mock).mockResolvedValue(null);
      
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'asistio' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).toBe('No se pudo identificar al usuario');
    });
  });

  describe('Llamada a función SQL', () => {
    beforeEach(() => {
      (authModule.getCurrentUserRef as jest.Mock).mockResolvedValue('user123');
    });

    it('debería llamar fn_marcar_asistencia con parámetros correctos para asistio', async () => {
      (databaseModule.query as jest.Mock).mockResolvedValue({
        rows: [{ success: true, message: 'OK' }],
      });
      
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'asistio' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(204);
      expect(databaseModule.query).toHaveBeenCalledWith(
        `SELECT * FROM as_turnos.fn_marcar_asistencia($1::bigint, $2::text, $3::jsonb, $4::text)`,
        [1, 'asistio', null, 'user123']
      );
    });

    it('debería incluir motivo en metadata para no_asistio', async () => {
      (databaseModule.query as jest.Mock).mockResolvedValue({
        rows: [{ success: true, message: 'OK' }],
      });
      
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ 
          pautaId: 1, 
          estado: 'no_asistio',
          motivo: 'sin_aviso'
        }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(204);
      expect(databaseModule.query).toHaveBeenCalledWith(
        `SELECT * FROM as_turnos.fn_marcar_asistencia($1::bigint, $2::text, $3::jsonb, $4::text)`,
        [1, 'no_asistio', JSON.stringify({ motivo: 'sin_aviso' }), 'user123']
      );
    });

    it('debería incluir reemplazo_guardia_id para estado reemplazo', async () => {
      (databaseModule.query as jest.Mock).mockResolvedValue({
        rows: [{ success: true, message: 'OK' }],
      });
      
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ 
          pautaId: 1, 
          estado: 'reemplazo',
          reemplazo_guardia_id: 123
        }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(204);
      expect(databaseModule.query).toHaveBeenCalledWith(
        `SELECT * FROM as_turnos.fn_marcar_asistencia($1::bigint, $2::text, $3::jsonb, $4::text)`,
        [1, 'no_asistio', JSON.stringify({ reemplazo_guardia_id: 123 }), 'user123']
      );
    });

    it('debería mapear estado deshacer correctamente', async () => {
      (databaseModule.query as jest.Mock).mockResolvedValue({
        rows: [{ success: true, message: 'OK' }],
      });
      
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'deshacer' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(204);
      expect(databaseModule.query).toHaveBeenCalledWith(
        `SELECT * FROM as_turnos.fn_marcar_asistencia($1::bigint, $2::text, $3::jsonb, $4::text)`,
        [1, 'deshacer', null, 'user123']
      );
    });

    it('debería manejar error de función SQL', async () => {
      (databaseModule.query as jest.Mock).mockResolvedValue({
        rows: [{ success: false, message: 'Pauta no encontrada' }],
      });
      
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'asistio' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Pauta no encontrada');
    });

    it('debería manejar excepciones de base de datos', async () => {
      (databaseModule.query as jest.Mock).mockRejectedValue(new Error('DB Connection Error'));
      
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'asistio' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe('Error interno del servidor');
    });
  });

  describe('Compatibilidad de parámetros', () => {
    beforeEach(() => {
      (authModule.getCurrentUserRef as jest.Mock).mockResolvedValue('user123');
      (databaseModule.query as jest.Mock).mockResolvedValue({
        rows: [{ success: true, message: 'OK' }],
      });
    });

    it('debería aceptar pautaId o pauta_id', async () => {
      const mockRequest1 = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'asistio' }),
      });

      const response1 = await POST(mockRequest1);
      expect(response1.status).toBe(204);

      const mockRequest2 = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pauta_id: 2, estado: 'asistio' }),
      });

      const response2 = await POST(mockRequest2);
      expect(response2.status).toBe(204);
      
      expect(databaseModule.query).toHaveBeenCalledTimes(2);
      expect(databaseModule.query).toHaveBeenNthCalledWith(1,
        expect.any(String),
        [1, 'asistio', null, 'user123']
      );
      expect(databaseModule.query).toHaveBeenNthCalledWith(2,
        expect.any(String),
        [2, 'asistio', null, 'user123']
      );
    });

    it('debería mapear estado trabajado a asistio', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'trabajado' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(204);
      expect(databaseModule.query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'asistio', null, 'user123']
      );
    });

    it('debería mapear estado inasistencia a no_asistio', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/turnos/asistencia', {
        method: 'POST',
        body: JSON.stringify({ pautaId: 1, estado: 'inasistencia' }),
      });

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(204);
      expect(databaseModule.query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'no_asistio', null, 'user123']
      );
    });
  });
});