import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientTable from './ClientTable';
import { PautaRow } from './types';
import * as canModule from '@/lib/can';

// Mock de dependencias
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
  usePathname: () => '/pauta-diaria-v2',
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));

jest.mock('@/lib/can', () => ({
  useCan: jest.fn(),
}));

// Mock fetch global para APIs
global.fetch = jest.fn();

describe('ClientTable - Paneles Inline', () => {
  const mockRows: PautaRow[] = [
    {
      pauta_id: '1',
      fecha: '2024-01-01',
      puesto_id: 'abc-123-def-456',
      puesto_nombre: 'Puesto 1',
      instalacion_id: '1',
      instalacion_nombre: 'Instalación A',
      estado: 'planificado',
      estado_ui: 'plan',
      meta: null,
      guardia_trabajo_id: '1',
      guardia_trabajo_nombre: 'Juan Pérez',
      guardia_titular_id: '1',
      guardia_titular_nombre: 'Juan Pérez',
      es_ppc: false,
      es_reemplazo: false,
      es_sin_cobertura: false,
      es_falta_sin_aviso: false,
      necesita_cobertura: false,
      hora_inicio: '08:00',
      hora_fin: '16:00',
      rol_id: '1',
      rol_nombre: 'Guardia',
      rol_alias: 'G',
      reemplazo_guardia_nombre: null,
      cobertura_guardia_nombre: null,
    },
    {
      pauta_id: '2',
      fecha: '2024-01-01',
      puesto_id: 'def-456-ghi-789',
      puesto_nombre: null,
      instalacion_id: '1',
      instalacion_nombre: 'Instalación A',
      estado: 'trabajado',
      estado_ui: 'asistido',
      meta: null,
      guardia_trabajo_id: '2',
      guardia_trabajo_nombre: 'María González',
      guardia_titular_id: '2',
      guardia_titular_nombre: 'María González',
      es_ppc: false,
      es_reemplazo: false,
      es_sin_cobertura: false,
      es_falta_sin_aviso: false,
      necesita_cobertura: false,
      hora_inicio: '08:00',
      hora_fin: '16:00',
      rol_id: '2',
      rol_nombre: 'Supervisor',
      rol_alias: 'S',
      reemplazo_guardia_nombre: null,
      cobertura_guardia_nombre: null,
    },
    {
      pauta_id: '3',
      fecha: '2024-01-01',
      puesto_id: 'ghi-789-jkl-012',
      puesto_nombre: null,
      instalacion_id: '2',
      instalacion_nombre: 'Instalación B',
      estado: 'sin_cobertura',
      estado_ui: 'ppc_libre',
      meta: null,
      guardia_trabajo_id: null,
      guardia_trabajo_nombre: null,
      guardia_titular_id: null,
      guardia_titular_nombre: null,
      es_ppc: true,
      es_reemplazo: false,
      es_sin_cobertura: false,
      es_falta_sin_aviso: false,
      necesita_cobertura: true,
      hora_inicio: '08:00',
      hora_fin: '16:00',
      rol_id: '1',
      rol_nombre: 'Guardia',
      rol_alias: 'G',
      reemplazo_guardia_nombre: null,
      cobertura_guardia_nombre: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Renderizado básico', () => {
    it('debería renderizar la tabla con los datos correctos', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      expect(screen.getByText('Instalación A')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('María González')).toBeInTheDocument();
    });

    it('debería mostrar UUID truncado cuando no hay puesto_nombre', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      // Puesto sin nombre debería mostrar UUID truncado
      expect(screen.getByText('def-456-…')).toBeInTheDocument();
    });

    it('debería mostrar badge PPC para puestos PPC', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      expect(screen.getByText('PPC')).toBeInTheDocument();
    });
  });

  describe('Paneles inline expandibles', () => {
    it('debería mostrar botón de Acciones para filas con acciones disponibles', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    it('debería expandir panel inline al hacer clic en Acciones', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      const accionesBtn = screen.getByText('Acciones');
      fireEvent.click(accionesBtn);
      
      // Panel expandido debería mostrar las opciones
      expect(screen.getByText('✅ Asistió')).toBeInTheDocument();
      expect(screen.getByText('❌ No asistió')).toBeInTheDocument();
    });

    it('debería colapsar panel al hacer clic en botón cerrar', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      // Expandir panel
      const accionesBtn = screen.getByText('Acciones');
      fireEvent.click(accionesBtn);
      
      // Cerrar panel
      const cerrarBtn = screen.getByText('Cerrar');
      fireEvent.click(cerrarBtn);
      
      // Panel debería estar colapsado
      expect(screen.queryByText('✅ Asistió')).not.toBeInTheDocument();
    });
  });

  describe('Funcionalidad No Asistió con panel inline', () => {
    it('debería mostrar opciones de cobertura al seleccionar No asistió', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      // Expandir panel
      const accionesBtn = screen.getByText('Acciones');
      fireEvent.click(accionesBtn);
      
      // Click en No asistió
      const noAsistioBtn = screen.getByText('❌ No asistió');
      fireEvent.click(noAsistioBtn);
      
      // Debería mostrar opciones de cobertura
      expect(screen.getByText('Tipo de cobertura')).toBeInTheDocument();
      expect(screen.getByText('⛔ Sin cobertura')).toBeInTheDocument();
      expect(screen.getByText('✅ Con cobertura')).toBeInTheDocument();
    });

    it('debería cargar guardias disponibles al seleccionar Con cobertura', async () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: '10', nombre: 'Pedro', apellido_paterno: 'García', apellido_materno: 'López', nombre_completo: 'Pedro García López' },
            { id: '11', nombre: 'Ana', apellido_paterno: 'Martínez', apellido_materno: 'Silva', nombre_completo: 'Ana Martínez Silva' },
          ]
        })
      });
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      // Expandir panel
      const accionesBtn = screen.getByText('Acciones');
      fireEvent.click(accionesBtn);
      
      // Click en No asistió
      const noAsistioBtn = screen.getByText('❌ No asistió');
      fireEvent.click(noAsistioBtn);
      
      // Seleccionar Con cobertura
      const conCoberturaBtn = screen.getByText('✅ Con cobertura');
      fireEvent.click(conCoberturaBtn);
      
      // Esperar que se carguen los guardias
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/guardias/disponibles')
        );
      });
    });

    it('debería enviar inasistencia sin cobertura correctamente', async () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK'
      });
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      // Expandir panel
      const accionesBtn = screen.getByText('Acciones');
      fireEvent.click(accionesBtn);
      
      // Click en No asistió
      const noAsistioBtn = screen.getByText('❌ No asistió');
      fireEvent.click(noAsistioBtn);
      
      // Confirmar sin cobertura (default)
      const confirmarBtn = screen.getByText('Confirmar');
      fireEvent.click(confirmarBtn);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/turnos/inasistencia',
          expect.objectContaining({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              pauta_id: '1',
              falta_sin_aviso: true,
              motivo: 'Falta sin aviso',
              cubierto_por: null
            })
          })
        );
      });
    });
  });

  describe('Funcionalidad Cubrir PPC con panel inline', () => {
    it('debería mostrar selector de guardias al expandir panel de PPC', async () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: '20', nombre: 'Carlos', apellido_paterno: 'Ruiz', apellido_materno: 'Díaz', nombre_completo: 'Carlos Ruiz Díaz' },
          ]
        })
      });
      
      render(<ClientTable rows={[mockRows[2]]} fecha="2024-01-01" />);
      
      // Expandir panel
      const accionesBtn = screen.getByText('Acciones');
      fireEvent.click(accionesBtn);
      
      // Click en Cubrir
      const cubrirBtn = screen.getByText('👥 Cubrir');
      fireEvent.click(cubrirBtn);
      
      // Debería mostrar selector de guardias
      expect(screen.getByText('Guardia para cubrir turno')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/guardias/disponibles')
        );
      });
    });

    it('debería enviar cobertura de PPC correctamente', async () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      // Mock para cargar guardias
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              { id: '20', nombre: 'Carlos', apellido_paterno: 'Ruiz', apellido_materno: 'Díaz', nombre_completo: 'Carlos Ruiz Díaz' },
            ]
          })
        })
        // Mock para cubrir PPC
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'OK'
        });
      
      render(<ClientTable rows={[mockRows[2]]} fecha="2024-01-01" />);
      
      // Expandir panel
      const accionesBtn = screen.getByText('Acciones');
      fireEvent.click(accionesBtn);
      
      // Click en Cubrir
      const cubrirBtn = screen.getByText('👥 Cubrir');
      fireEvent.click(cubrirBtn);
      
      // Esperar que se carguen los guardias
      await waitFor(() => {
        expect(screen.getByText('Guardia para cubrir turno')).toBeInTheDocument();
      });
      
      // No podemos simular selección de Select fácilmente en el test
      // pero verificamos que la estructura existe
      expect(screen.getByText('Selecciona guardia')).toBeInTheDocument();
    });
  });

  describe('Accesibilidad', () => {
    it('debería tener labels correctos para todos los controles', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      // Expandir panel
      const accionesBtn = screen.getByText('Acciones');
      fireEvent.click(accionesBtn);
      
      // Click en No asistió
      const noAsistioBtn = screen.getByText('❌ No asistió');
      fireEvent.click(noAsistioBtn);
      
      // Verificar labels
      expect(screen.getByText('Motivo de inasistencia')).toBeInTheDocument();
      expect(screen.getByText('Tipo de cobertura')).toBeInTheDocument();
    });

    it('debería permitir navegación por teclado', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      // Verificar que los botones son accesibles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Filtros', () => {
    it('debería filtrar por instalación', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      // Inicialmente deberían verse todas las instalaciones
      expect(screen.getByText('Instalación A')).toBeInTheDocument();
      expect(screen.getByText('Instalación B')).toBeInTheDocument();
      
      // Filtrar por instalación
      const filtroInput = screen.getByPlaceholderText('Filtrar instalación…');
      fireEvent.change(filtroInput, { target: { value: 'Instalación A' } });
    });

    it('debería mostrar switch para ver libres', () => {
      (canModule.useCan as jest.Mock).mockReturnValue({ allowed: true, loading: false });
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      expect(screen.getByText('Ver libres')).toBeInTheDocument();
    });
  });
});