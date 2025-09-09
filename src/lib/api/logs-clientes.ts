// Función reutilizable para registrar logs desde cualquier acción

export async function registrarLogCliente({
  cliente_id,
  accion,
  usuario,
  tipo = "manual",
  contexto = null,
}: {
  cliente_id: string;
  accion: string;
  usuario: string;
  tipo?: "manual" | "sistema" | "automatizado";
  contexto?: string | null;
}) {
  try {
    const response = await fetch("/api/logs-clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id, accion, usuario, tipo, contexto }),
    });

    if (!response.ok) {
      console.error("Error registrando log:", response.statusText);
    }
  } catch (error) {
    console.error("Error registrando log:", error);
  }
}

// Función helper para obtener el nombre del usuario actual
export function obtenerUsuarioActual(): string {
  // Aquí puedes integrar con tu sistema de autenticación
  // Por ahora retornamos un valor por defecto
  return "Admin"; // TODO: Integrar con sistema de auth real
}

// Funciones de conveniencia para acciones comunes
export async function logCambioEstado(cliente_id: string, nuevoEstado: string, usuario?: string) {
  await registrarLogCliente({
    cliente_id,
    accion: `Estado cambiado a ${nuevoEstado}`,
    usuario: usuario || obtenerUsuarioActual(),
    tipo: "manual",
    contexto: "Cambio desde panel de administración"
  });
}

export async function logEdicionDatos(cliente_id: string, campo: string, usuario?: string) {
  await registrarLogCliente({
    cliente_id,
    accion: `Actualizó ${campo}`,
    usuario: usuario || obtenerUsuarioActual(),
    tipo: "manual",
    contexto: "Edición desde panel de administración"
  });
}

export async function logDocumentoSubido(cliente_id: string, nombreDocumento: string, usuario?: string) {
  await registrarLogCliente({
    cliente_id,
    accion: `Subió documento: ${nombreDocumento}`,
    usuario: usuario || obtenerUsuarioActual(),
    tipo: "manual",
    contexto: "Gestión de documentos"
  });
}

export async function logDocumentoEliminado(cliente_id: string, nombreDocumento: string, usuario?: string) {
  await registrarLogCliente({
    cliente_id,
    accion: `Eliminó documento: ${nombreDocumento}`,
    usuario: usuario || obtenerUsuarioActual(),
    tipo: "manual",
    contexto: "Gestión de documentos"
  });
}

export async function logClienteCreado(cliente_id: string, usuario?: string) {
  await registrarLogCliente({
    cliente_id,
    accion: "Cliente creado",
    usuario: usuario || obtenerUsuarioActual(),
    tipo: "sistema",
    contexto: "Creación inicial del cliente"
  });
} 