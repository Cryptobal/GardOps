import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientTable from './ClientTable';
import { PautaRow } from './types';
import * as canModule from '@/lib/can';
import * as turnosApi from '@/lib/api/turnos';

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
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));

jest.mock('@/lib/can', () => ({
  useCan: jest.fn(),
}));

jest.mock('@/lib/api/turnos', () => ({
  marcarAsistencia: jest.fn(),
  deshacerAsistencia: jest.fn(),
  verificarPermisos: jest.fn(),
}));

describe('ClientTable', () => {
  const mockRows: PautaRow[] = [
    {
      pauta_id: 1,
      fecha: '2024-01-01',
      puesto_id: 'abc-123-def-456',
      puesto_nombre: 'Puesto 1',
      instalacion_id: 1,
      instalacion_nombre: 'Instalación A',
      estado: 'planificado',
      meta: 0,
      guardia_trabajo_id: 1,
      guardia_trabajo_nombre: 'Juan Pérez',
      guardia_titular_id: null,
      guardia_titular_nombre: null,
      es_ppc: false,
      es_reemplazo: false,
      es_sin_cobertura: false,
      es_falta_sin_aviso: false,
      hora_inicio: '08:00',
      hora_fin: '16:00',
      rol_nombre: 'Guardia',
    },
    {
      pauta_id: 2,
      fecha: '2024-01-01',
      puesto_id: 'def-456-ghi-789',
      instalacion_id: 1,
      instalacion_nombre: 'Instalación A',
      estado: 'trabajado',
      meta: 0,
      guardia_trabajo_id: 2,
      guardia_trabajo_nombre: 'María González',
      guardia_titular_id: null,
      guardia_titular_nombre: null,
      es_ppc: false,
      es_reemplazo: false,
      es_sin_cobertura: false,
      es_falta_sin_aviso: false,
      hora_inicio: '08:00',
      hora_fin: '16:00',
      rol_nombre: 'Supervisor',
    },
    {
      pauta_id: 3,
      fecha: '2024-01-01',
      puesto_id: 'ghi-789-jkl-012',
      instalacion_id: 2,
      instalacion_nombre: 'Instalación B',
      estado: 'sin_cobertura',
      meta: 0,
      guardia_trabajo_id: null,
      guardia_trabajo_nombre: null,
      guardia_titular_id: null,
      guardia_titular_nombre: null,
      es_ppc: true,
      es_reemplazo: false,
      es_sin_cobertura: true,
      es_falta_sin_aviso: false,
      hora_inicio: '08:00',
      hora_fin: '16:00',
      rol_nombre: 'Guardia',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado básico', () => {
    it('debería renderizar la tabla con los datos correctos', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      expect(screen.getByText('Instalación A')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('María González')).toBeInTheDocument();
    });

    it('debería mostrar UUID truncado cuando no hay puesto_nombre', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      // Puesto sin nombre debería mostrar UUID truncado
      expect(screen.getByText('def-456-…')).toBeInTheDocument();
    });

    it('debería mostrar badge PPC para puestos PPC', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      expect(screen.getByText('PPC')).toBeInTheDocument();
    });

    it('debería mostrar horario formateado correctamente', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      expect(screen.getAllByText('08:00–16:00')).toHaveLength(3);
    });
  });

  describe('Estados y acciones con permisos', () => {
    it('estado planificado con permisos - debería mostrar botones Asistió y No asistió', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      expect(screen.getByText('Asistió')).toBeInTheDocument();
      expect(screen.getByText('No asistió')).toBeInTheDocument();
      expect(screen.queryByText('Deshacer')).not.toBeInTheDocument();
    });

    it('estado asistido con permisos - solo debería mostrar botón Deshacer', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      render(<ClientTable rows={[mockRows[1]]} fecha="2024-01-01" />);
      
      expect(screen.getByText('Deshacer')).toBeInTheDocument();
      expect(screen.queryByText('Asistió')).not.toBeInTheDocument();
      expect(screen.queryByText('No asistió')).not.toBeInTheDocument();
    });

    it('PPC sin_cobertura con permisos - debería mostrar botón Asignar cobertura', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      render(<ClientTable rows={[mockRows[2]]} fecha="2024-01-01" />);
      
      expect(screen.getByText('Asignar cobertura')).toBeInTheDocument();
      expect(screen.queryByText('Asistió')).not.toBeInTheDocument();
      expect(screen.queryByText('No asistió')).not.toBeInTheDocument();
    });

    it('sin permisos - no debería mostrar acciones habilitadas', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(false);
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      // Deberían estar deshabilitados los botones
      const accionesButtons = screen.getAllByText('Acciones');
      accionesButtons.forEach(button => {
        expect(button.closest('button')).toBeDisabled();
      });
    });
  });

  describe('Interacciones', () => {
    it('debería llamar marcarAsistencia al hacer clic en Asistió', async () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      (turnosApi.marcarAsistencia as jest.Mock).mockResolvedValue({ ok: true });
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      const asistioBtn = screen.getByText('Asistió');
      fireEvent.click(asistioBtn);
      
      await waitFor(() => {
        expect(turnosApi.marcarAsistencia).toHaveBeenCalledWith({
          pautaId: 1,
          estado: 'asistio'
        });
      });
    });

    it('debería llamar marcarAsistencia con estado deshacer al hacer clic en Deshacer', async () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      (turnosApi.marcarAsistencia as jest.Mock).mockResolvedValue({ ok: true });
      
      render(<ClientTable rows={[mockRows[1]]} fecha="2024-01-01" />);
      
      const deshacerBtn = screen.getByText('Deshacer');
      fireEvent.click(deshacerBtn);
      
      await waitFor(() => {
        expect(turnosApi.marcarAsistencia).toHaveBeenCalledWith({
          pautaId: 2,
          estado: 'deshacer'
        });
      });
    });

    it('debería mostrar toast al hacer clic en Asignar cobertura', async () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      const addToastMock = jest.fn();
      jest.spyOn(require('@/hooks/use-toast'), 'useToast').mockReturnValue({
        addToast: addToastMock,
      });
      
      render(<ClientTable rows={[mockRows[2]]} fecha="2024-01-01" />);
      
      const asignarBtn = screen.getByText('Asignar cobertura');
      fireEvent.click(asignarBtn);
      
      await waitFor(() => {
        expect(addToastMock).toHaveBeenCalledWith({
          title: 'Asignar cobertura',
          description: 'Funcionalidad disponible pronto',
          type: 'success'
        });
      });
    });

    it('debería manejar error 403 al marcar asistencia', async () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      (turnosApi.marcarAsistencia as jest.Mock).mockResolvedValue({ 
        ok: false, 
        status: 403 
      });
      
      const addToastMock = jest.fn();
      jest.spyOn(require('@/hooks/use-toast'), 'useToast').mockReturnValue({
        addToast: addToastMock,
      });
      
      render(<ClientTable rows={[mockRows[0]]} fecha="2024-01-01" />);
      
      const asistioBtn = screen.getByText('Asistió');
      fireEvent.click(asistioBtn);
      
      await waitFor(() => {
        expect(addToastMock).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Sin permiso para marcar asistencia',
          type: 'error'
        });
      });
    });
  });

  describe('Filtros', () => {
    it('debería filtrar por instalación', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      const { rerender } = render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      // Inicialmente deberían verse todas las instalaciones
      expect(screen.getByText('Instalación A')).toBeInTheDocument();
      expect(screen.getByText('Instalación B')).toBeInTheDocument();
      
      // Filtrar por instalación
      const filtroInput = screen.getByPlaceholderText('Filtrar instalación…');
      fireEvent.change(filtroInput, { target: { value: 'Instalación A' } });
      
      // Forzar re-render con el filtro aplicado
      rerender(<ClientTable rows={mockRows} fecha="2024-01-01" />);
    });

    it('debería filtrar por estado', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      // Verificar que existe el selector de estado
      expect(screen.getByText('Estado (todos)')).toBeInTheDocument();
    });

    it('debería filtrar por PPC', () => {
      (canModule.useCan as jest.Mock).mockReturnValue(true);
      
      render(<ClientTable rows={mockRows} fecha="2024-01-01" />);
      
      // Verificar que existe el selector de PPC
      expect(screen.getByText('Todos')).toBeInTheDocument();
    });
  });
});