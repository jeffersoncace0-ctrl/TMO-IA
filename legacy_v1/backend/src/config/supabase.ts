import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './index';
import fs from 'fs';
import path from 'path';

// Validar si las credenciales de Supabase están activas
const isSupabaseConfigured = 
  config.supabase.url && 
  config.supabase.url !== 'https://placeholder.supabase.co' &&
  config.supabase.serviceRoleKey &&
  config.supabase.serviceRoleKey !== 'placeholder-service-key';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Almacén en memoria persistente local para desarrollo/pruebas locales inmediatas
const possiblePaths = [
  path.resolve(__dirname, '../../database_local.json'),
  path.resolve(__dirname, '../database_local.json'),
  path.resolve(process.cwd(), 'backend', 'database_local.json'),
  path.resolve(process.cwd(), 'database_local.json')
];

let dbFile = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

interface LocalDatabase {
  archivos: any[];
  llamadas: any[];
  resumenAgentes: any[];
  validacionesIA: any[];
  configuracionUmbral: { umbral_segundos: number; actualizado_en: string };
  ejecucionesN8N: any[];
  historialCorreos: any[];
  erroresAuditoria: any[];
  reportes: any[];
}

let localDb: LocalDatabase = {
  archivos: [],
  llamadas: [],
  resumenAgentes: [],
  validacionesIA: [],
  configuracionUmbral: { umbral_segundos: config.defaultTmoThreshold, actualizado_en: new Date().toISOString() },
  ejecucionesN8N: [],
  historialCorreos: [],
  erroresAuditoria: [],
  reportes: []
};

// Cargar estado local si existe
if (fs.existsSync(dbFile)) {
  try {
    localDb = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
  } catch (e) {
    // Si falla el parseo, se mantiene el estado inicial
  }
}

export function saveLocalDb() {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error guardando base de datos local:', err);
  }
}

export const getLocalDb = () => localDb;
export const isUsingSupabase = () => !!supabase;
