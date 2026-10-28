import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ExcelJS from 'exceljs';
import { 
  NormalizedCallRecord, 
  AgentSummaryMetrics, 
  GlobalKPIMetrics, 
  AIValidationItem 
} from '../types';
import { config } from '../config';

const execFileAsync = promisify(execFile);

export interface ExcelReportData {
  fileName: string;
  processedAt: string;
  thresholdSeconds: number;
  calls: NormalizedCallRecord[];
  agentSummaries: AgentSummaryMetrics[];
  kpis: GlobalKPIMetrics;
  aiValidations: AIValidationItem[];
}

export class ExcelReportGenerator {
  /**
   * Genera el libro Excel de 4 hojas con gráficos nativos utilizando openpyxl (Python)
   * o fallback nativo con ExcelJS en Node.js.
   */
  public static async generate4SheetReport(
    data: ExcelReportData,
    outputFileName: string
  ): Promise<{ filePath: string; chartsIncluded: boolean; fileSize: number }> {
    const outputPath = path.resolve(config.reportsDir, outputFileName);
    const pythonScript = path.resolve(__dirname, '../../scripts/generate_excel_charts.py');
    const tempJsonPath = path.resolve(config.reportsDir, `temp_${Date.now()}_data.json`);

    let chartsIncluded = false;

    try {
      // Intentar generación con Python openpyxl para gráficos nativos de Excel
      fs.writeFileSync(tempJsonPath, JSON.stringify(data, null, 2), 'utf-8');

      await execFileAsync('python', [pythonScript, tempJsonPath, outputPath]);
      chartsIncluded = true;
    } catch (pythonErr) {
      console.warn('Advertencia: Generador Python no disponible o falló. Utilizando motor ExcelJS de Node:', pythonErr);
      // Fallback robusto con ExcelJS (estilizado completo de 4 hojas con formato condicional)
      await this.generateWithExcelJS(data, outputPath);
      chartsIncluded = false;
    } finally {
      if (fs.existsSync(tempJsonPath)) {
        try { fs.unlinkSync(tempJsonPath); } catch (e) {}
      }
    }

    const stats = fs.statSync(outputPath);
    return {
      filePath: outputPath,
      chartsIncluded,
      fileSize: stats.size
    };
  }

  /**
   * Generador alternativo en Node.js mediante ExcelJS
   */
  private static async generateWithExcelJS(data: ExcelReportData, outputPath: string): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Call Center Analytics Platform';
    wb.created = new Date();

    // Hoja 1: Datos Originales
    const ws1 = wb.addWorksheet('Datos Originales', { views: [{ showGridLines: true }] });
    ws1.addRow(['ID Llamada', 'Código Agente', 'Nombre Agente', 'Fecha', 'Tipo', 'Estado', 'Duración (s)', 'Conversación (s)', 'Silencio (s)', 'Válido']);
    ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    for (const c of data.calls) {
      ws1.addRow([
        c.originalCallId,
        c.agentCode,
        c.agentName,
        c.callDate ? c.callDate.substring(0, 19).replace('T', ' ') : '',
        c.callType,
        c.callStatus,
        c.totalDurationSeconds,
        c.talkTimeSeconds,
        c.silenceTimeSeconds,
        c.isValid ? 'SÍ' : 'NO'
      ]);
    }

    // Hoja 2: Resumen de Agentes
    const ws2 = wb.addWorksheet('Resumen de Agentes', { views: [{ showGridLines: true }] });
    ws2.addRow(['Código', 'Nombre del Agente', 'Total Llamadas', 'Gestiones Válidas', 'TMO Promedio (s)', 'Silencio Promedio (s)', '% Cumplimiento', 'Clasificación']);
    ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    for (const a of data.agentSummaries) {
      const row = ws2.addRow([
        a.agentCode,
        a.agentName,
        a.totalCalls,
        a.validCalls,
        a.ahtTmoSeconds,
        a.avgSilenceTimeSeconds,
        `${a.complianceRate}%`,
        a.classification
      ]);
      const cellClasif = row.getCell(8);
      if (a.classification === 'APROBADO') {
        cellClasif.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        cellClasif.font = { color: { argb: 'FF166534' }, bold: true };
      } else {
        cellClasif.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        cellClasif.font = { color: { argb: 'FF991B1B' }, bold: true };
      }
    }

    // Hoja 3: Análisis Estadístico
    const ws3 = wb.addWorksheet('Análisis Estadístico', { views: [{ showGridLines: true }] });
    ws3.addRow(['Métrica Global', 'Valor']);
    ws3.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    ws3.addRow(['Total de Llamadas', data.kpis.totalCalls]);
    ws3.addRow(['Total de Agentes', data.kpis.totalAgents]);
    ws3.addRow(['TMO Global Ponderado (s)', data.kpis.averageHandleTimeSeconds]);
    ws3.addRow(['Tiempo Promedio Conversación (s)', data.kpis.averageTalkTimeSeconds]);
    ws3.addRow(['Tiempo Promedio Silencio (s)', data.kpis.averageSilenceTimeSeconds]);
    ws3.addRow(['Porcentaje de Cumplimiento Global', `${data.kpis.percentageOfCompliance}%`]);
    ws3.addRow(['Umbral Aplicado (s)', `${data.thresholdSeconds}s`]);
    ws3.addRow(['Agentes Aprobados', data.kpis.approvedAgentsCount]);
    ws3.addRow(['Agentes Requieren Revisión', data.kpis.reviewRequiredAgentsCount]);

    // Hoja 4: Validación de IA
    const ws4 = wb.addWorksheet('Validación de IA', { views: [{ showGridLines: true }] });
    ws4.addRow(['Agente', 'TMO (s)', 'Umbral', 'Regla Determinista', 'Revisión IA', 'Motivo de Clasificación', 'Recomendación Operativa']);
    ws4.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws4.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    for (const v of data.aiValidations) {
      ws4.addRow([
        `${v.agentName} (${v.agentCode})`,
        v.ahtTmoSeconds,
        `${v.thresholdApplied}s`,
        v.ruleResult,
        v.aiClassification,
        v.classificationReason,
        v.operationalRecommendation
      ]);
    }

    // Ajuste de columnas
    [ws1, ws2, ws3, ws4].forEach(ws => {
      ws.columns.forEach(col => {
        col.width = 18;
      });
    });

    await wb.xlsx.writeFile(outputPath);
  }
}
