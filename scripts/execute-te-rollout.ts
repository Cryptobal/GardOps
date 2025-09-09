#!/usr/bin/env ts-node

import { readFileSync } from 'fs';
import { query } from '../src/lib/database';

async function main() {
  console.log('🚀 Ejecutando rollout TE (Turno Extra) ...');
  try {
    const sql = readFileSync('scripts/create-te-rollout.sql', 'utf8');
    await query(sql);
    console.log('✅ Rollout TE ejecutado correctamente.');
  } catch (err) {
    console.error('❌ Error ejecutando rollout TE:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
