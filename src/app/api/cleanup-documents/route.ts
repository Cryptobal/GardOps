import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import pool from "@/lib/database";

// Inicializar cliente S3 para Cloudflare R2
const s3 = process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
      tls: true,
    })
  : null;

export async function POST(req: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza automática de documentos...');

    if (!s3) {
      return NextResponse.json({ 
        error: "Configuración R2 no disponible para limpieza automática" 
      }, { status: 500 });
    }

    const client = await pool.connect();
    
    try {
      // 1. Obtener todos los documentos de la base de datos
      const documentosResult = await client.query(`
        SELECT 
          id, 
          nombre_original, 
          url, 
          modulo,
          cliente_id,
          instalacion_id,
          guardia_id,
          created_at
        FROM documentos 
        WHERE url IS NOT NULL 
        AND url != ''
        ORDER BY created_at DESC
      `);

      const documentos = documentosResult.rows;
      console.log(`📋 Encontrados ${documentos.length} documentos en la base de datos`);

      let documentosEliminados = 0;
      let documentosVerificados = 0;
      let errores = 0;

      // 2. Verificar cada documento en Cloudflare R2
      for (const doc of documentos) {
        try {
          documentosVerificados++;
          
          // Extraer la key del R2 desde la URL
          let key = doc.url;
          if (doc.url.includes('https://')) {
            // Si es una URL completa, extraer solo la key
            const urlParts = doc.url.split('/');
            key = urlParts.slice(-2).join('/'); // Tomar los últimos 2 segmentos
          }

          // Verificar si el archivo existe en R2
          try {
            await s3.send(new HeadObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME || 'gardops',
              Key: key
            }));
            
            // El archivo existe en R2, está bien
            if (documentosVerificados % 10 === 0) {
              console.log(`✅ Verificados ${documentosVerificados}/${documentos.length} documentos`);
            }
            
          } catch (r2Error: any) {
            // El archivo no existe en R2, eliminarlo de la base de datos
            if (r2Error.name === 'NotFound' || r2Error.$metadata?.httpStatusCode === 404) {
              console.log(`🗑️ Documento no encontrado en R2: ${doc.nombre_original} (${key})`);
              
              // Eliminar de la base de datos
              await client.query('DELETE FROM documentos WHERE id = $1', [doc.id]);
              documentosEliminados++;
              
              console.log(`✅ Eliminado documento fantasma: ${doc.nombre_original}`);
            } else {
              console.error(`⚠️ Error verificando documento ${doc.id}:`, r2Error.message);
              errores++;
            }
          }
          
        } catch (error: any) {
          console.error(`❌ Error procesando documento ${doc.id}:`, error.message);
          errores++;
        }
      }

      // 3. Limpiar documentos sin URL válida
      const documentosSinUrl = await client.query(`
        DELETE FROM documentos 
        WHERE url IS NULL OR url = '' OR url = 'undefined'
        RETURNING id, nombre_original, modulo
      `);

      if (documentosSinUrl.rows.length > 0) {
        console.log(`🗑️ Eliminados ${documentosSinUrl.rows.length} documentos sin URL válida`);
        documentosEliminados += documentosSinUrl.rows.length;
      }

      // 4. Verificar integridad de referencias
      const referenciasInvalidas = await client.query(`
        SELECT 
          'clientes' as modulo,
          COUNT(*) as documentos_huérfanos
        FROM documentos d
        LEFT JOIN clientes c ON d.cliente_id = c.id
        WHERE d.cliente_id IS NOT NULL AND c.id IS NULL
        
        UNION ALL
        
        SELECT 
          'instalaciones' as modulo,
          COUNT(*) as documentos_huérfanos
        FROM documentos d
        LEFT JOIN instalaciones i ON d.instalacion_id = i.id
        WHERE d.instalacion_id IS NOT NULL AND i.id IS NULL
        
        UNION ALL
        
        SELECT 
          'guardias' as modulo,
          COUNT(*) as documentos_huérfanos
        FROM documentos d
        LEFT JOIN guardias g ON d.guardia_id = g.id
        WHERE d.guardia_id IS NOT NULL AND g.id IS NULL
      `);

      let documentosHuérfanos = 0;
      for (const ref of referenciasInvalidas.rows) {
        if (ref.documentos_huérfanos > 0) {
          console.log(`⚠️ ${ref.documentos_huérfanos} documentos huérfanos en módulo ${ref.modulo}`);
          documentosHuérfanos += parseInt(ref.documentos_huérfanos);
        }
      }

      // 5. Limpiar documentos huérfanos
      if (documentosHuérfanos > 0) {
        await client.query(`
          DELETE FROM documentos 
          WHERE (cliente_id IS NOT NULL AND cliente_id NOT IN (SELECT id FROM clientes))
             OR (instalacion_id IS NOT NULL AND instalacion_id NOT IN (SELECT id FROM instalaciones))
             OR (guardia_id IS NOT NULL AND guardia_id NOT IN (SELECT id FROM guardias))
        `);
        
        console.log(`🗑️ Eliminados ${documentosHuérfanos} documentos huérfanos`);
        documentosEliminados += documentosHuérfanos;
      }

      // 6. Estadísticas finales
      const estadisticasFinales = await client.query(`
        SELECT 
          COUNT(*) as total_documentos,
          COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END) as con_url,
          COUNT(CASE WHEN url IS NULL OR url = '' THEN 1 END) as sin_url
        FROM documentos
      `);

      const stats = estadisticasFinales.rows[0];
      
      console.log('🎯 Limpieza completada exitosamente');
      console.log(`📊 Estadísticas finales:`);
      console.log(`   - Total documentos: ${stats.total_documentos}`);
      console.log(`   - Con URL válida: ${stats.con_url}`);
      console.log(`   - Sin URL: ${stats.sin_url}`);
      console.log(`   - Documentos eliminados: ${documentosEliminados}`);
      console.log(`   - Errores encontrados: ${errores}`);

      return NextResponse.json({
        success: true,
        message: "Limpieza automática completada",
        estadisticas: {
          documentos_verificados: documentosVerificados,
          documentos_eliminados: documentosEliminados,
          errores: errores,
          total_final: stats.total_documentos,
          con_url_valida: stats.con_url
        }
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error en limpieza automática:', error);
    return NextResponse.json({ 
      error: "Error interno durante la limpieza",
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Endpoint GET para verificar estado sin hacer cambios
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando estado de documentos...');

    const client = await pool.connect();
    
    try {
      // Obtener estadísticas generales
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_documentos,
          COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END) as con_url,
          COUNT(CASE WHEN url IS NULL OR url = '' THEN 1 END) as sin_url,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as ultimas_24h,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as ultima_semana
        FROM documentos
      `);

      // Verificar referencias huérfanas
      const referenciasInvalidas = await client.query(`
        SELECT 
          'clientes' as modulo,
          COUNT(*) as documentos_huérfanos
        FROM documentos d
        LEFT JOIN clientes c ON d.cliente_id = c.id
        WHERE d.cliente_id IS NOT NULL AND c.id IS NULL
        
        UNION ALL
        
        SELECT 
          'instalaciones' as modulo,
          COUNT(*) as documentos_huérfanos
        FROM documentos d
        LEFT JOIN instalaciones i ON d.instalacion_id = i.id
        WHERE d.instalacion_id IS NOT NULL AND i.id IS NULL
        
        UNION ALL
        
        SELECT 
          'guardias' as modulo,
          COUNT(*) as documentos_huérfanos
        FROM documentos d
        LEFT JOIN guardias g ON d.guardia_id = g.id
        WHERE d.guardia_id IS NOT NULL AND g.id IS NULL
      `);

      const statsData = stats.rows[0];
      const referenciasData = referenciasInvalidas.rows;

      return NextResponse.json({
        success: true,
        estado: "Verificación completada",
        estadisticas: {
          total_documentos: statsData.total_documentos,
          con_url_valida: statsData.con_url,
          sin_url: statsData.sin_url,
          ultimas_24h: statsData.ultimas_24h,
          ultima_semana: statsData.ultima_semana,
          referencias_invalidas: referenciasData
        }
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error verificando estado:', error);
    return NextResponse.json({ 
      error: "Error interno durante la verificación",
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
