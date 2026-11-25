import * as XLSX from 'xlsx';
import crypto from 'crypto';
import fs from 'fs';
import { 
  ColumnMapping, 
  ExcelPreviewResult, 
  NormalizedCallRecord, 
  RawCallRow,
  CallType,
  CallStatus
} from '../types';

export class ExcelProcessor {
  /**
   * Genera el hash criptográfico SHA-256 de un archivo para garantizar integridad e idempotencia.
   */
  public static calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Lee la estructura básica del libro Excel, sus hojas y genera vista previa con detección automática de columnas.
   */
  public static inspectAndPreview(
    filePath: string, 
    fileName: string, 
    sheetName?: string, 
    previewLimit: number = 50
  ): ExcelPreviewResult {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('El archivo Excel no contiene ninguna hoja válida de datos.');
    }

    const selectedSheet = sheetName && workbook.SheetNames.includes(sheetName)
      ? sheetName
      : workbook.SheetNames[0];

    const worksheet = workbook.Sheets[selectedSheet];
    const rawRows: RawCallRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawRows.length === 0) {
      throw new Error(`La hoja "${selectedSheet}" está completamente vacía.`);
    }

    const detectedColumns = Object.keys(rawRows[0] || {});
    const suggestedMapping = this.autoDetectColumns(detectedColumns);

    // Validación preliminar de muestra
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    const sampleErrors: string[] = [];
    const seenHashes = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowHash = crypto.createHash('md5').update(JSON.stringify(row)).digest('hex');
      
      let isRowValid = true;
      const rowErrors: string[] = [];

      if (seenHashes.has(rowHash)) {
        duplicateCount++;
        rowErrors.push(`Fila ${i + 2}: Registro duplicado exacto`);
      } else {
        seenHashes.add(rowHash);
      }

      // Validar código de agente
      const agentCodeVal = suggestedMapping.agentCode ? row[suggestedMapping.agentCode] : null;
      if (!agentCodeVal || String(agentCodeVal).trim() === '') {
        isRowValid = false;
        rowErrors.push(`Fila ${i + 2}: Código de agente vacío`);
      }

      // Validar duración
      const durationVal = suggestedMapping.duration ? row[suggestedMapping.duration] : null;
      if (durationVal !== null && durationVal !== undefined) {
        const parsedSec = this.parseTimeToSeconds(durationVal);
        if (isNaN(parsedSec) || parsedSec < 0) {
          isRowValid = false;
          rowErrors.push(`Fila ${i + 2}: Duración inválida ("${durationVal}")`);
        }
      } else {
        isRowValid = false;
        rowErrors.push(`Fila ${i + 2}: Falta campo de duración`);
      }

      if (isRowValid && rowErrors.length === 0) {
        validCount++;
      } else {
        invalidCount++;
        if (sampleErrors.length < 10) {
          sampleErrors.push(...rowErrors);
        }
      }
    }

    const stats = fs.statSync(filePath);

    return {
      fileName,
      fileHash: this.calculateFileHash(filePath),
      fileSize: stats.size,
      sheetNames: workbook.SheetNames,
      selectedSheet,
      totalRows: rawRows.length,
      previewRows: rawRows.slice(0, previewLimit),
      detectedColumns,
      suggestedMapping,
      sampleValidation: {
        validCount,
        invalidCount,
        duplicateCount,
        sampleErrors: sampleErrors.slice(0, 10)
      }
    };
  }

  /**
   * Detecta inteligentemente las columnas mediante patrones de sinonimia y expresiones regulares
   */
  public static autoDetectColumns(columns: string[]): ColumnMapping {
    const mapping: ColumnMapping = {
      agentCode: '',
      agentName: '',
      callId: '',
      callDate: '',
      callType: '',
      callStatus: '',
      duration: '',
      talkTime: '',
      waitTime: '',
      wrapUpTime: '',
      silenceTime: ''
    };

    const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

    for (const col of columns) {
      const c = clean(col);

      // Código de Agente
      if (!mapping.agentCode && (c.includes('cod') || c.includes('idagente') || c.includes('agentid') || c.includes('cedula') || c.includes('agenteid') || c === 'agente' || c === 'agent')) {
        mapping.agentCode = col;
      }
      // Nombre de Agente
      else if (!mapping.agentName && (c.includes('nombre') || c.includes('name') || c.includes('asesor') || c.includes('ejecutivo'))) {
        mapping.agentName = col;
      }
      // ID Llamada
      else if (!mapping.callId && (c.includes('callid') || c.includes('idllamada') || c.includes('ticket') || c.includes('telefono') || c.includes('ani'))) {
        mapping.callId = col;
      }
      // Fecha
      else if (!mapping.callDate && (c.includes('fecha') || c.includes('date') || c.includes('hora') || c.includes('timestamp'))) {
        mapping.callDate = col;
      }
      // Tipo de llamada
      else if (!mapping.callType && (c.includes('tipo') || c.includes('type') || c.includes('direction') || c.includes('sentido'))) {
        mapping.callType = col;
      }
      // Estado de llamada
      else if (!mapping.callStatus && (c.includes('estado') || c.includes('status') || c.includes('disposition') || c.includes('resultado'))) {
        mapping.callStatus = col;
      }
      // Duración Total
      else if (!mapping.duration && (c.includes('duracion') || c.includes('duration') || c.includes('tmo') || c.includes('aht') || c.includes('tiempo') || c.includes('handletime'))) {
        mapping.duration = col;
      }
      // Tiempo Conversación
      else if (!mapping.talkTime && (c.includes('conversacion') || c.includes('talk') || c.includes('habla'))) {
        mapping.talkTime = col;
      }
      // Tiempo de Espera / Hold
      else if (!mapping.waitTime && (c.includes('espera') || c.includes('wait') || c.includes('hold'))) {
        mapping.waitTime = col;
      }
      // Tiempo posterior / Wrap up / ACW
      else if (!mapping.wrapUpTime && (c.includes('wrap') || c.includes('acw') || c.includes('post') || c.includes('cierre'))) {
        mapping.wrapUpTime = col;
      }
      // Tiempo de Silencio
      else if (!mapping.silenceTime && (c.includes('silencio') || c.includes('silence') || c.includes('pausa'))) {
        mapping.silenceTime = col;
      }
    }

    // Fallbacks si no se encontró un campo específico
    if (!mapping.agentCode && columns.length > 0) mapping.agentCode = columns[0];
    if (!mapping.duration && columns.length > 1) mapping.duration = columns[1];

    return mapping;
  }

  /**
   * Convierte un valor de celda (segundos numéricos, strings "00:01:30", "90s", fechas) a segundos exactos
   */
  public static parseTimeToSeconds(value: any): number {
    if (value === null || value === undefined || value === '') return NaN;

    if (typeof value === 'number') {
      // Si Excel almacenó una fracción de día (formato fecha/hora de Excel, e.g. 0.000694 = 1 min)
      if (value > 0 && value < 1) {
        return Math.round(value * 86400 * 100) / 100;
      }
      return Math.round(value * 100) / 100;
    }

    const str = String(value).trim();

    // Formato HH:MM:SS o MM:SS
    if (str.includes(':')) {
      const parts = str.split(':').map(p => parseFloat(p));
      if (parts.some(p => isNaN(p))) return NaN;

      if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
      }
    }

    // Formato con "s", "m", "h"
    const numClean = str.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(numClean);
    return isNaN(parsed) ? NaN : Math.round(parsed * 100) / 100;
  }

  /**
   * Normaliza y valida por lotes todos los registros de una hoja Excel
   */
  public static parseAndNormalize(
    filePath: string,
    sheetName: string,
    mapping: ColumnMapping
  ): NormalizedCallRecord[] {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: RawCallRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    const seenRows = new Set<string>();
    const normalizedRecords: NormalizedCallRecord[] = [];

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      const errors: string[] = [];
      let isValid = true;

      // Detección de duplicado
      const rowHash = crypto.createHash('md5').update(JSON.stringify(row)).digest('hex');
      const isDuplicate = seenRows.has(rowHash);
      if (isDuplicate) {
        errors.push('Registro duplicado');
      } else {
        seenRows.add(rowHash);
      }

      // Código de agente
      const rawCode = mapping.agentCode ? row[mapping.agentCode] : null;
      const agentCode = rawCode !== null && rawCode !== undefined ? String(rawCode).trim() : '';
      if (!agentCode) {
        isValid = false;
        errors.push('Código de agente faltante o vacío');
      }

      // Nombre de agente
      const rawName = mapping.agentName ? row[mapping.agentName] : null;
      const agentName = rawName !== null && rawName !== undefined ? String(rawName).trim() : agentCode;

      // Parseo de tiempos
      const rawDuration = mapping.duration ? row[mapping.duration] : null;
      let durationSec = this.parseTimeToSeconds(rawDuration);

      const rawTalk = mapping.talkTime ? row[mapping.talkTime] : null;
      let talkSec = this.parseTimeToSeconds(rawTalk);
      if (isNaN(talkSec)) talkSec = 0;

      const rawWait = mapping.waitTime ? row[mapping.waitTime] : null;
      let waitSec = this.parseTimeToSeconds(rawWait);
      if (isNaN(waitSec)) waitSec = 0;

      const rawWrap = mapping.wrapUpTime ? row[mapping.wrapUpTime] : null;
      let wrapSec = this.parseTimeToSeconds(rawWrap);
      if (isNaN(wrapSec)) wrapSec = 0;

      const rawSilence = mapping.silenceTime ? row[mapping.silenceTime] : null;
      let silenceSec = this.parseTimeToSeconds(rawSilence);
      if (isNaN(silenceSec)) silenceSec = 0;

      // Si no hay duración explícita pero hay talk + wait + wrap, calcular fórmula completa
      if (isNaN(durationSec)) {
        if (talkSec > 0 || waitSec > 0 || wrapSec > 0) {
          durationSec = talkSec + waitSec + wrapSec;
        } else {
          isValid = false;
          errors.push('Duración total no válida o no numérica');
          durationSec = 0;
        }
      }

      if (durationSec < 0) {
        isValid = false;
        errors.push('Duración negativa imposible en una llamada');
      }

      // Fecha
      let callDateStr: string | undefined;
      const rawDate = mapping.callDate ? row[mapping.callDate] : null;
      if (rawDate instanceof Date) {
        callDateStr = rawDate.toISOString();
      } else if (rawDate) {
        const d = new Date(rawDate);
        callDateStr = isNaN(d.getTime()) ? undefined : d.toISOString();
      }

      // Tipo de llamada
      let callType: CallType = 'ENTRANTE';
      const rawType = mapping.callType ? String(row[mapping.callType]).toUpperCase() : '';
      if (rawType.includes('SAL') || rawType.includes('OUT')) callType = 'SALIENTE';
      else if (rawType.includes('INT')) callType = 'INTERNA';

      // Estado de llamada
      let callStatus: CallStatus = 'CONTESTADA';
      const rawStatus = mapping.callStatus ? String(row[mapping.callStatus]).toUpperCase() : '';
      if (rawStatus.includes('PERD') || rawStatus.includes('MISS') || rawStatus.includes('ABAN')) {
        callStatus = 'PERDIDA';
      } else if (rawStatus.includes('OCUP') || rawStatus.includes('BUSY')) {
        callStatus = 'OCUPADA';
      }

      normalizedRecords.push({
        originalCallId: mapping.callId && row[mapping.callId] ? String(row[mapping.callId]) : `CALL-${index + 1}`,
        agentCode,
        agentName,
        callDate: callDateStr,
        callType,
        callStatus,
        talkTimeSeconds: talkSec,
        waitTimeSeconds: waitSec,
        wrapUpTimeSeconds: wrapSec,
        silenceTimeSeconds: silenceSec,
        totalDurationSeconds: durationSec,
        isValid: isValid && !isDuplicate,
        isDuplicate,
        validationErrors: errors,
        rawData: row
      });
    }

    return normalizedRecords;
  }
}
