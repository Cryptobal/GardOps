import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndRole, getAuthenticatedUser, AuthenticatedRequest } from '../../../middleware/auth';
import { getAllGuardias, createGuardia, CreateGuardiaData } from '../../../lib/api/guardias';

// GET /api/guardias - Obtener todos los guardias del tenant
export async function GET(request: NextRequest) {
  // Aplicar middleware de autenticación y autorización (admin o supervisor)
  const authResult = requireAuthAndRole('supervisor')(request);
  
  // Si hay error en autenticación/autorización, devolver la respuesta de error
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const authenticatedRequest = authResult as AuthenticatedRequest;
  const user = getAuthenticatedUser(authenticatedRequest);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Usuario no encontrado' },
      { status: 401 }
    );
  }

  try {
    // Filtrar guardias por tenant_id del usuario autenticado
    const guardias = await getAllGuardias(user.tenant_id);
    
    console.log(`✅ Guardias obtenidos para tenant ${user.tenant_id}: ${guardias.length} registros`);
    
    return NextResponse.json({
      guardias,
      tenant_id: user.tenant_id,
      total: guardias.length
    });
  } catch (error) {
    console.error('Error obteniendo guardias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/guardias - Crear nuevo guardia (solo admin)
export async function POST(request: NextRequest) {
  // Aplicar middleware de autenticación y autorización (solo admin)
  const authResult = requireAuthAndRole('admin')(request);
  
  // Si hay error en autenticación/autorización, devolver la respuesta de error
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const authenticatedRequest = authResult as AuthenticatedRequest;
  const user = getAuthenticatedUser(authenticatedRequest);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Usuario no encontrado' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    
    // Validación básica
    if (!body.nombre || !body.apellido) {
      return NextResponse.json(
        { error: 'Nombre y apellido son requeridos' },
        { status: 400 }
      );
    }

    // Crear data del guardia con tenant_id del usuario autenticado
    const guardiaData: CreateGuardiaData = {
      tenant_id: user.tenant_id,
      nombre: body.nombre,
      apellido: body.apellido,
      email: body.email,
      telefono: body.telefono
    };

    const nuevoGuardia = await createGuardia(guardiaData);
    
    if (!nuevoGuardia) {
      return NextResponse.json(
        { error: 'Error creando guardia. Posible email duplicado.' },
        { status: 400 }
      );
    }

    console.log(`✅ Guardia creado por admin ${user.email}: ${nuevoGuardia.nombre} ${nuevoGuardia.apellido} (tenant: ${user.tenant_id})`);
    
    return NextResponse.json(nuevoGuardia, { status: 201 });
  } catch (error) {
    console.error('Error creando guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 