#!/usr/bin/env npx tsx

import { config } from 'dotenv';
config({ path: '.env.local' });

async function testRbacEndpoint() {
  try {
    console.log('🔍 Probando endpoint RBAC...\n');
    
    // Test 1: Sin autenticación
    console.log('1. Test sin autenticación:');
    const response1 = await fetch('http://localhost:3000/api/rbac/can?permiso=rbac.admin');
    const data1 = await response1.json();
    console.log('   Respuesta:', data1);
    
    // Test 2: Con método POST y userId explícito
    console.log('\n2. Test con POST y userId explícito:');
    const response2 = await fetch('http://localhost:3000/api/rbac/can', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        permiso: 'rbac.admin',
        userId: '2370ce2b-5dd0-4943-8594-9e635d2cbfe2' // ID de carlos.irigoyen@gard.cl
      })
    });
    const data2 = await response2.json();
    console.log('   Respuesta:', data2);
    
    // Test 3: Probar el endpoint /api/me/permissions (legacy)
    console.log('\n3. Test endpoint legacy /api/me/permissions:');
    const response3 = await fetch('http://localhost:3000/api/me/permissions?perm=rbac.admin');
    console.log('   Status:', response3.status);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRbacEndpoint();
