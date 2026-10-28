const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { TMOCalculator } = require('../backend/dist/services/tmoCalculator');
const { ExcelProcessor } = require('../backend/dist/services/excelProcessor');
const { AIService } = require('../backend/dist/services/aiService');
const { ExcelReportGenerator } = require('../backend/dist/services/excelGenerator');

async function main() {
  console.log('================================================================');
  console.log('SUITE DE PRUEBAS INTEGRALES DE LA PLATAFORMA DE TMO');
  console.log('================================================================');

  // -------------------------------------------------------------
  // TEST 1: Cálculos de TMO y Clasificación Determinista
  // -------------------------------------------------------------
  console.log('\n[TEST 1] Verificación Matemática de TMO y Clasificación...');
  const testRecords = [
    // Agente AG-01: 3 llamadas de 10s, 15s, 20s => TMO = 15.0s (APROBADO)
    {
      agentCode: 'AG-01',
      agentName: 'Carlos Ramirez',
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
      agentName: 'Carlos Ramirez',
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
      agentName: 'Carlos Ramirez',
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

    // Agente AG-02: 2 llamadas de 30s, 40s => TMO = 35.0s (REQUIERE_REVISION)
    {
      agentCode: 'AG-02',
      agentName: 'Juan Delgado',
      callType: 'ENTRANTE',
      callStatus: 'CONTESTADA',
      talkTimeSeconds: 30,
      waitTimeSeconds: 0,
      wrapUpTimeSeconds: 0,
      silenceTimeSeconds: 6,
      totalDurationSeconds: 30,
      isValid: true,
      isDuplicate: false,
      validationErrors: [],
      rawData: {}
    },
    {
      agentCode: 'AG-02',
      agentName: 'Juan Delgado',
      callType: 'ENTRANTE',
      callStatus: 'CONTESTADA',
      talkTimeSeconds: 40,
      waitTimeSeconds: 0,
      wrapUpTimeSeconds: 0,
      silenceTimeSeconds: 8,
      totalDurationSeconds: 40,
      isValid: true,
      isDuplicate: false,
      validationErrors: [],
      rawData: {}
    },

    // Agente AG-03: Registro Inválido => ERROR_DATOS
    {
      agentCode: 'AG-03',
      agentName: 'Agente Invalido',
      callType: 'ENTRANTE',
      callStatus: 'CONTESTADA',
      talkTimeSeconds: 0,
      waitTimeSeconds: 0,
      wrapUpTimeSeconds: 0,
      silenceTimeSeconds: 0,
      totalDurationSeconds: 0,
      isValid: false,
      isDuplicate: false,
      validationErrors: ['Fila corrupta'],
      rawData: {}
    }
  ];

  const summaries = TMOCalculator.calculateAgentSummaries(testRecords, 20.0);
  const ag1 = summaries.find(s => s.agentCode === 'AG-01');
  const ag2 = summaries.find(s => s.agentCode === 'AG-02');
  const ag3 = summaries.find(s => s.agentCode === 'AG-03');

  assert.strictEqual(ag1.ahtTmoSeconds, 15.0, 'AG-01 TMO debe ser 15.0s');
  assert.strictEqual(ag1.classification, 'APROBADO', 'AG-01 debe ser APROBADO');
  assert.strictEqual(ag2.ahtTmoSeconds, 35.0, 'AG-02 TMO debe ser 35.0s');
  assert.strictEqual(ag2.classification, 'REQUIERE_REVISION', 'AG-02 debe ser REQUIERE_REVISION');
  assert.strictEqual(ag3.classification, 'ERROR_DATOS', 'AG-03 debe ser ERROR_DATOS');

  // Ponderación global correcta: (10+15+20+30+40)/5 = 23.0s (NO 25s)
  const kpis = TMOCalculator.calculateGlobalKPIs(testRecords, summaries, 20.0);
  assert.strictEqual(kpis.averageHandleTimeSeconds, 23.0, 'TMO Global Ponderado debe ser 23.0s');
  console.log('✅ TEST 1 COMPLETADO: Fórmulas de TMO individual, ponderado global y clasificación determinista aprobadas.');

  // -------------------------------------------------------------
  // TEST 2: Pipeline de Excel con Archivo Real (>75 filas)
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Verificación de Ingesta, Normalización y Reporte Excel...');
  const demoFile = path.resolve(__dirname, '../sample_data/call_center_dataset_demo.xlsx');
  const preview = ExcelProcessor.inspectAndPreview(demoFile, 'call_center_dataset_demo.xlsx');

  assert.ok(preview.totalRows >= 80, 'Deben existir al menos 80 filas en el dataset demo');
  assert.ok(preview.suggestedMapping.agentCode, 'Columna agente detectada');
  assert.ok(preview.suggestedMapping.duration, 'Columna duración detectada');

  const normalized = ExcelProcessor.parseAndNormalize(demoFile, preview.selectedSheet, preview.suggestedMapping);
  assert.ok(normalized.length >= 80);

  const demoSummaries = TMOCalculator.calculateAgentSummaries(normalized, 20.0);
  const demoKpis = TMOCalculator.calculateGlobalKPIs(normalized, demoSummaries, 20.0);
  const demoAi = await AIService.analyzeAgentsBatch(demoSummaries, normalized, demoKpis, 20.0);

  assert.ok(demoAi.length >= 8);
  console.log(`✅ Ingesta validada: ${normalized.length} llamadas, ${demoSummaries.length} agentes, ${demoAi.length} análisis IA.`);

  // Generar Reporte Oficial con Gráficos Nativos
  const outReportName = `Reporte_Validacion_${Date.now()}.xlsx`;
  const reportResult = await ExcelReportGenerator.generate4SheetReport({
    fileName: 'call_center_dataset_demo.xlsx',
    processedAt: new Date().toISOString(),
    thresholdSeconds: 20.0,
    calls: normalized,
    agentSummaries: demoSummaries,
    kpis: demoKpis,
    aiValidations: demoAi
  }, outReportName);

  assert.ok(fs.existsSync(reportResult.filePath), 'El archivo Excel de 4 hojas debe generarse en disco');
  assert.ok(reportResult.fileSize > 5000, 'El archivo debe tener contenido válido');
  console.log(`✅ TEST 2 COMPLETADO: Reporte Excel de 4 hojas generado con éxito en: ${reportResult.filePath}`);
  console.log(`   Gráficos nativos de Barras y Dona embebidos: ${reportResult.chartsIncluded}`);

  // -------------------------------------------------------------
  // TEST 3: Casos Borde y Manejo de Errores (Edge Cases)
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Verificación de Casos Borde y Tolerancia a Fallos...');
  const edgeFile = path.resolve(__dirname, '../sample_data/call_center_edge_cases.xlsx');
  const edgePreview = ExcelProcessor.inspectAndPreview(edgeFile, 'call_center_edge_cases.xlsx');

  assert.ok(edgePreview.sampleValidation.duplicateCount >= 1, 'Debe detectar duplicados exactos');
  assert.ok(edgePreview.sampleValidation.invalidCount >= 2, 'Debe aislar registros corruptos');
  console.log(`✅ TEST 3 COMPLETADO: Detección estricta de ${edgePreview.sampleValidation.duplicateCount} duplicados y ${edgePreview.sampleValidation.invalidCount} inconsistencias.`);

  console.log('\n================================================================');
  console.log('🎉 TODAS LAS PRUEBAS AUTOMATIZADAS PASARON EXITOSAMENTE (100% OK)');
  console.log('================================================================');
}

main().catch(err => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
