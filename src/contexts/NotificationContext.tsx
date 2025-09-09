"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface GlobalNotification {
  id: string;
  tipo: 'incidente';
  titulo: string;
  mensaje: string;
  instalacion: string;
  hora: string;
  timestamp: Date;
  leida: boolean;
}

interface NotificationContextType {
  globalNotifications: GlobalNotification[];
  addGlobalNotification: (notification: Omit<GlobalNotification, 'id' | 'timestamp' | 'leida'>) => void;
  markAsRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [globalNotifications, setGlobalNotifications] = useState<GlobalNotification[]>([]);

  // Cargar notificaciones desde localStorage al inicializar
  useEffect(() => {
    const savedNotifications = localStorage.getItem('globalNotifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setGlobalNotifications(parsed);
      } catch (error) {
        logger.error('Error loading notifications from localStorage::', error);
      }
    }
  }, []);

  // Guardar notificaciones en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('globalNotifications', JSON.stringify(globalNotifications));
  }, [globalNotifications]);

  const addGlobalNotification = (notification: Omit<GlobalNotification, 'id' | 'timestamp' | 'leida'>) => {
    const newNotification: GlobalNotification = {
      ...notification,
      id: `global-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      leida: false
    };

    setGlobalNotifications(prev => {
      // Evitar duplicados basados en instalación y tipo
      const isDuplicate = prev.some(n => 
        n.instalacion === notification.instalacion && 
        n.tipo === notification.tipo &&
        !n.leida
      );

      if (isDuplicate) {
        return prev;
      }

      return [...prev, newNotification].slice(-20); // Mantener solo las últimas 20
    });
  };

  const markAsRead = (id: string) => {
    setGlobalNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, leida: true } : n)
    );
  };

  const dismissNotification = (id: string) => {
    setGlobalNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setGlobalNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      globalNotifications,
      addGlobalNotification,
      markAsRead,
      dismissNotification,
      clearAllNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
