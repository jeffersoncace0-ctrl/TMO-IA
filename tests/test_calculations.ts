import assert from 'assert';
import { TMOCalculator } from '../backend/src/services/tmoCalculator';
import { NormalizedCallRecord } from '../backend/src/types';

console.log('--- INICIO DE PRUEBAS UNITARIAS: CÁLCULOS MATEMÁTICOS DE TMO ---');

// 1. Caso de prueba: Cálculo de TMO por Agente
const testRecords: NormalizedCallRecord[] = [
  // Agente 1: 3 llamadas válidas con duraciones 10s, 15s, 20s -> TMO = (10+15+20)/3 = 15.0s (APROBADO)
  {
    agentCode: 'AG-01',
    agentName: 'Agente Cumplidor',
    callType: 'ENTRANTE',
    callStatus: 'CONTESTADA',
    talkTimeSeconds: 10,
    waitTimeSeconds: 0,
    wrapUpTimeSeconds: 0,
    silenceTimeSeconds: 2,
    totalDurationSeconds: 10,
    isValid: true,
    isDuplicate: false,
    validationErrors: [],
    rawData: {}
  },
  {
    agentCode: 'AG-01',
    agentName: 'Agente Cumplidor',
    callType: 'ENTRANTE',
    callStatus: 'CONTESTADA',
    talkTimeSeconds: 15,
    waitTimeSeconds: 0,
    wrapUpTimeSeconds: 0,
    silenceTimeSeconds: 3,
    totalDurationSeconds: 15,
    isValid: true,
    isDuplicate: false,
    validationErrors: [],
    rawData: {}
  },
  {
    agentCode: 'AG-01',
    agentName: 'Agente Cumplidor',
    callType: 'ENTRANTE',
    callStatus: 'CONTESTADA',
    talkTimeSeconds: 20,
    waitTimeSeconds: 0,
    wrapUpTimeSeconds: 0,
    silenceTimeSeconds: 4,
    totalDurationSeconds: 20,
    isValid: true,
    isDuplicate: false,
    validationErrors: [],
    rawData: {}
  },

  // Agente 2: 2 llamadas válidas con duraciones 30s, 40s -> TMO = (30+40)/2 = 35.0s (REQUIERE_REVISION)
  {
    agentCode: 'AG-02',
    agentName: 'Agente en Exceso',
    callType: 'ENTRANTE',
    callStatus: 'CONTESTADA',
    talkTimeSeconds: 30,
    waitTimeSeconds: 0,
    wrapUpTimeSeconds: 0,
    silenceTimeSeconds: 8,
    totalDurationSeconds: 30,
    isValid: true,
    isDuplicate: false,
    validationErrors: [],
    rawData: {}
  },
  {
    agentCode: 'AG-02',
    agentName: 'Agente en Exceso',
    callType: 'ENTRANTE',
    callStatus: 'CONTESTADA',
    talkTimeSeconds: 40,
    waitTimeSeconds: 0,
    wrapUpTimeSeconds: 0,
    silenceTimeSeconds: 12,
    totalDurationSeconds: 40,
    isValid: true,
    isDuplicate: false,
    validationErrors: [],
    rawData: {}
  },

  // Agente 3: Registro inválido (duración negativa o incompleta) -> ERROR_DATOS
  {
    agentCode: 'AG-03',
    agentName: 'Agente Incompleto',
    callType: 'ENTRANTE',
    callStatus: 'CONTESTADA',
    talkTimeSeconds: 0,
    waitTimeSeconds: 0,
    wrapUpTimeSeconds: 0,
    silenceTimeSeconds: 0,
    totalDurationSeconds: 0,
    isValid: false,
    isDuplicate: false,
    validationErrors: ['Duración no válida'],
    rawData: {}
  }
];

const summaries = TMOCalculator.calculateAgentSummaries(testRecords, 20.0);

// Verificación Agente 1 (Aprobado)
const ag1 = summaries.find(s => s.agentCode === 'AG-01');
assert.ok(ag1, 'El resumen del Agente 1 debe existir');
assert.strictEqual(ag1.ahtTmoSeconds, 15.0, 'TMO de AG-01 debe ser exactamente 15.0s');
assert.strictEqual(ag1.classification, 'APROBADO', 'Clasificación de AG-01 debe ser APROBADO');
assert.strictEqual(ag1.complianceRate, 100, 'Cumplimiento debe ser 100% (todas <= 20s)');
console.log('✅ Prueba 1 superada: Cálculo exacto de TMO y clasificación APROBADO.');

// Verificación Agente 2 (Requiere Revisión)
const ag2 = summaries.find(s => s.agentCode === 'AG-02');
assert.ok(ag2, 'El resumen del Agente 2 debe existir');
assert.strictEqual(ag2.ahtTmoSeconds, 35.0, 'TMO de AG-02 debe ser exactamente 35.0s');
assert.strictEqual(ag2.classification, 'REQUIERE_REVISION', 'Clasificación de AG-02 debe ser REQUIERE_REVISION');
assert.strictEqual(ag2.complianceRate, 0, 'Cumplimiento debe ser 0% (ninguna <= 20s)');
console.log('✅ Prueba 2 superada: Clasificación determinista REQUIERE_REVISION (> 20s).');

// Verificación Agente 3 (Error de Datos)
const ag3 = summaries.find(s => s.agentCode === 'AG-03');
assert.ok(ag3, 'El resumen del Agente 3 debe existir');
assert.strictEqual(ag3.classification, 'ERROR_DATOS', 'Clasificación de AG-03 sin gestiones válidas debe ser ERROR_DATOS');
console.log('✅ Prueba 3 superada: Manejo correcto de ERROR_DATOS.');

// 2. Verificación de TMO Global Ponderado vs Promedio de Promedios
// Promedio de promedios ingenuo sería (15 + 35) / 2 = 25.0s
// TMO Global Ponderado real = (10 + 15 + 20 + 30 + 40) / 5 = 115 / 5 = 23.0s
const kpis = TMOCalculator.calculateGlobalKPIs(testRecords, summaries, 20.0);
assert.strictEqual(kpis.averageHandleTimeSeconds, 23.0, 'El TMO global ponderado debe ser 23.0s (no 25.0s promedio simple)');
console.log('✅ Prueba 4 superada: TMO Global Ponderado correcto evitando falacia de promedio de promedios.');

console.log('--- TODAS LAS PRUEBAS MATEMÁTICAS FINALIZARON EXITOSAMENTE ---');
