import { query } from '../src/lib/database';

async function seedSueldoItems() {
  try {
    console.log('🚀 Iniciando seed de ítems de sueldo...');

    // Verificar si ya existen ítems
    const existingItems = await query(`
      SELECT COUNT(*) as count FROM sueldo_item
    `);

    if (parseInt(existingItems.rows[0].count) > 0) {
      console.log('✅ Ya existen ítems en el catálogo');
      return;
    }

    // Datos de ejemplo para el catálogo
    const items = [
      // Haberes Imponibles
      {
        nombre: 'Bono Responsabilidad',
        tipo: 'haber_imponible',
        descripcion: 'Bono por responsabilidad adicional en el cargo'
      },
      {
        nombre: 'Bono Antigüedad',
        tipo: 'haber_imponible',
        descripcion: 'Bono por años de servicio en la empresa'
      },
      {
        nombre: 'Bono Turno Nocturno',
        tipo: 'haber_imponible',
        descripcion: 'Bono por trabajar en turnos nocturnos'
      },
      {
        nombre: 'Bono Zona Peligrosa',
        tipo: 'haber_imponible',
        descripcion: 'Bono por trabajar en zonas de alto riesgo'
      },
      {
        nombre: 'Bono Capacitación',
        tipo: 'haber_imponible',
        descripcion: 'Bono por capacitaciones adicionales'
      },

      // Haberes No Imponibles
      {
        nombre: 'Colación',
        tipo: 'haber_no_imponible',
        descripcion: 'Pago de colación diaria'
      },
      {
        nombre: 'Movilización',
        tipo: 'haber_no_imponible',
        descripcion: 'Pago de movilización'
      },
      {
        nombre: 'Bono Asistencia',
        tipo: 'haber_no_imponible',
        descripcion: 'Bono por asistencia perfecta'
      },
      {
        nombre: 'Bono Productividad',
        tipo: 'haber_no_imponible',
        descripcion: 'Bono por cumplimiento de metas'
      },
      {
        nombre: 'Bono Especial',
        tipo: 'haber_no_imponible',
        descripcion: 'Bono especial por servicios destacados'
      },

      // Descuentos
      {
        nombre: 'Descuento Tardanza',
        tipo: 'descuento',
        descripcion: 'Descuento por llegadas tardías'
      },
      {
        nombre: 'Descuento Inasistencia',
        tipo: 'descuento',
        descripcion: 'Descuento por inasistencias no justificadas'
      },
      {
        nombre: 'Descuento Permiso',
        tipo: 'descuento',
        descripcion: 'Descuento por permisos personales'
      },
      {
        nombre: 'Descuento Seguro',
        tipo: 'descuento',
        descripcion: 'Descuento por seguro de vida'
      },
      {
        nombre: 'Descuento AFP',
        tipo: 'descuento',
        descripcion: 'Descuento por aporte voluntario AFP'
      }
    ];

    console.log(`📝 Insertando ${items.length} ítems en el catálogo...`);

    for (const item of items) {
      await query(`
        INSERT INTO sueldo_item (nombre, tipo, descripcion, activo, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        item.nombre,
        item.tipo,
        item.descripcion,
        true,
        'accebf8a-bacc-41fa-9601-ed39cb320a52' // tenant_id por defecto
      ]);
    }

    console.log('✅ Seed completado exitosamente');
    console.log('📋 Resumen:');
    console.log(`   - ${items.filter(i => i.tipo === 'haber_imponible').length} haberes imponibles`);
    console.log(`   - ${items.filter(i => i.tipo === 'haber_no_imponible').length} haberes no imponibles`);
    console.log(`   - ${items.filter(i => i.tipo === 'descuento').length} descuentos`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

// Ejecutar el seed si se llama directamente
if (require.main === module) {
  seedSueldoItems()
    .then(() => {
      console.log('🎉 Seed completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el seed:', error);
      process.exit(1);
    });
}

export default seedSueldoItems;
