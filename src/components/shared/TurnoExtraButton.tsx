'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TurnoExtraModal } from './TurnoExtraModal';
import { useToast } from '@/hooks/use-toast';

interface TurnoExtraButtonProps {
  guardia_id: string;
  guardia_nombre: string;
  puesto_id: string;
  puesto_nombre: string;
  pauta_id: number;
  fecha: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function TurnoExtraButton({
  guardia_id,
  guardia_nombre,
  puesto_id,
  puesto_nombre,
  pauta_id,
  fecha,
  variant = 'outline',
  size = 'sm',
  className = ''
}: TurnoExtraButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={`${className}`}
      >
        📝 Turno Extra
      </Button>

      <TurnoExtraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        guardia_id={guardia_id}
        guardia_nombre={guardia_nombre}
        puesto_id={puesto_id}
        puesto_nombre={puesto_nombre}
        pauta_id={pauta_id}
        fecha={fecha}
      />
    </>
  );
} 