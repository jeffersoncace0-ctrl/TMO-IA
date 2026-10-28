import path from 'path';
import fs from 'fs';
import assert from 'assert';
import { ExcelProcessor } from '../backend/src/services/excelProcessor';
import { TMOCalculator } from '../backend/src/services/tmoCalculator';
import { AIService } from '../backend/src/services/aiService';
import { ExcelReportGenerator } from '../backend/src/services/excelGenerator';

async function runPipelineTests() {
  console.log('--- INICIO DE PRUEBAS INTEGRALES DE PIPELINE DE EXCEL ---');

  const demoPath = path.resolve(__dirname, '../sample_data/call_center_dataset_demo.xlsx');
  const edgePath = path.resolve(__dirname, '../sample_data/call_center_edge_cases.xlsx');

  assert.ok(fs.existsSync(demoPath), 'El dataset demo debe existir');
  assert.ok(fs.existsSync(edgePath), 'El dataset de casos borde debe existir');

  // 1. Inspección y Detección de Columnas
  const preview = ExcelProcessor.inspectAndPreview(demoPath, 'call_center_dataset_demo.xlsx');
  assert.strictEqual(preview.totalRows, 80, 'Deben existir 80 filas en el dataset demo');
  assert.ok(preview.suggestedMapping.agentCode, 'Debe auto-detectar la columna de código de agente');
  assert.ok(preview.suggestedMapping.duration, 'Debe auto-detectar la columna de duración');
  console.log('✅ Paso 1: Inspección y autodetección de columnas validada exitosamente.');

  // 2. Normalización de Registros
  const normalizedCalls = ExcelProcessor.parseAndNormalize(demoPath, preview.selectedSheet, preview.suggestedMapping);
  assert.strictEqual(normalizedCalls.length, 80, 'Se deben normalizar las 80 filas');
  console.log('✅ Paso 2: Normalización de 80 llamadas completada sin pérdidas.');

  // 3. Cálculo de Consolidado por Agente y Umbral de 20s
  const summaries = TMOCalculator.calculateAgentSummaries(normalizedCalls, 20.0);
  assert.ok(summaries.length >= 8, 'Deben existir al menos 8 agentes únicos');

  const carlos = summaries.find(s => s.agentCode === 'AG-101');
  assert.ok(carlos, 'Carlos Ramirez (AG-101) debe estar presente');
  assert.strictEqual(carlos.classification, 'APROBADO', 'Carlos debe estar APROBADO (TMO < 20s)');

  const juan = summaries.find(s => s.agentCode === 'AG-103');
  assert.ok(juan, 'Juan Delgado (AG-103) debe estar presente');
  assert.strictEqual(juan.classification, 'REQUIERE_REVISION', 'Juan debe estar en REQUIERE_REVISION (TMO > 20s)');

  console.log('✅ Paso 3: Agrupación y clasificación determinista validada.');

  // 4. KPIs Globales
  const kpis = TMOCalculator.calculateGlobalKPIs(normalizedCalls, summaries, 20.0);
  assert.strictEqual(kpis.totalCalls, 80);
  assert.ok(kpis.averageHandleTimeSeconds > 0);
  console.log(`✅ Paso 4: KPIs calculados. TMO Global Ponderado: ${kpis.averageHandleTimeSeconds}s.`);

  // 5. Inferencia y Auditoría Asistida por IA
  const aiValidations = await AIService.analyzeAgentsBatch(summaries, normalizedCalls, kpis, 20.0);
  assert.strictEqual(aiValidations.length, summaries.length);
  const outlier = aiValidations.find(v => v.anomalyDetected || v.isStatisticalOutlier);
  assert.ok(outlier, 'La IA debe identificar al menos una anomalía u outlier estadístico en el dataset');
  console.log('✅ Paso 5: Auditoría IA y detección de anomalías contextuales completada.');

  // 6. Generación del Reporte Excel con 4 Hojas y Gráficos Nativos
  const reportFileName = `Test_Reporte_TMO_${Date.now()}.xlsx`;
  const reportResult = await ExcelReportGenerator.generate4SheetReport({
    fileName: 'call_center_dataset_demo.xlsx',
    processedAt: new Date().toISOString(),
    thresholdSeconds: 20.0,
    calls: normalizedCalls,
    agentSummaries: summaries,
    kpis,
    aiValidations
  }, reportFileName);

  assert.ok(fs.existsSync(reportResult.filePath), 'El archivo de reporte generado debe existir físicamente en disco');
  assert.ok(reportResult.fileSize > 5000, 'El archivo debe tener un tamaño válido (> 5 KB)');
  console.log(`✅ Paso 6: Libro Excel de 4 hojas generado en: ${reportResult.filePath} (Gráficos incluidos: ${reportResult.chartsIncluded})`);

  // 7. Prueba de Casos Borde y Calidad de Datos
  const edgePreview = ExcelProcessor.inspectAndPreview(edgePath, 'call_center_edge_cases.xlsx');
  assert.ok(edgePreview.sampleValidation.duplicateCount >= 1, 'Debe detectar duplicados en casos borde');
  assert.ok(edgePreview.sampleValidation.invalidCount >= 2, 'Debe detectar registros inválidos/duración negativa');
  console.log('✅ Paso 7: Detección estricta de duplicados y tiempos inválidos superada.');

  console.log('--- TODAS LAS PRUEBAS DE INTEGRACIÓN DEL PIPELINE PASARON EXITOSAMENTE ---');
}

runPipelineTests().catch(err => {
  console.error('❌ Error en prueba integral:', err);
  process.exit(1);
});
