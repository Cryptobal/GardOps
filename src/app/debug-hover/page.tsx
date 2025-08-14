import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DebugHoverPage() {
  const handleClick = (id: string) => {
    console.log("🖱️ Click detectado en:", id);
    alert(`Click detectado en: ${id}`);
  };

  const handleMouseEnter = (id: string) => {
    console.log("🖱️ Hover detectado en:", id);
  };

  const testData = [
    { id: "1", nombre: "Cliente 1", email: "cliente1@test.com" },
    { id: "2", nombre: "Cliente 2", email: "cliente2@test.com" },
    { id: "3", nombre: "Cliente 3", email: "cliente3@test.com" },
  ];

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Debug Hover vs Click</h1>
      
      {/* Prueba con Card */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Prueba con Card</h2>
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
          onClick={() => handleClick("card")}
          onMouseEnter={() => handleMouseEnter("card")}
        >
          <CardContent>
            <p>Esta es una tarjeta de prueba</p>
            <p className="text-sm text-muted-foreground">
              Haz hover y click para ver la diferencia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prueba con Botón */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Prueba con Botón</h2>
        <Button 
          onClick={() => handleClick("button")}
          onMouseEnter={() => handleMouseEnter("button")}
        >
          Botón de prueba
        </Button>
      </div>

      {/* Prueba con Tabla */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Prueba con Tabla</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testData.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleClick(`row-${item.id}`)}
                onMouseEnter={() => handleMouseEnter(`row-${item.id}`)}
              >
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.nombre}</TableCell>
                <TableCell>{item.email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Instrucciones:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Abre la consola del navegador (F12)</li>
          <li>Haz hover sobre los elementos - deberías ver logs de "Hover detectado"</li>
          <li>Haz click en los elementos - deberías ver logs de "Click detectado" y un alert</li>
          <li>Si el hover activa el click, hay un problema</li>
        </ul>
      </div>
    </div>
  );
} 