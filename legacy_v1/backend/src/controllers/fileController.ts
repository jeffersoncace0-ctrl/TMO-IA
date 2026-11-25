import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ExcelProcessor } from '../services/excelProcessor';
import { TMOCalculator } from '../services/tmoCalculator';
import { AIService } from '../services/aiService';
import { ExcelReportGenerator } from '../services/excelGenerator';
import { config } from '../config';
import { getLocalDb, saveLocalDb, supabase } from '../config/supabase';
import { ColumnMapping } from '../types';

export class FileController {
  /**
   * Carga de archivo Excel (.xlsx / .xls) y retorno de vista previa estructurada
   */
  public static async uploadAndPreview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se ha adjuntado ningún archivo.' });
      }

      const file = req.file;
      const originalPath = file.path;
      const fileName = file.originalname;

      // Validar extensión
      const ext = path.extname(fileName).toLowerCase();
      if (ext !== '.xlsx' && ext !== '.xls') {
        fs.unlinkSync(originalPath);
        return res.status(400).json({ success: false, message: 'Formato no compatible. Solo se admiten archivos .xlsx y .xls.' });
      }

      const previewLimit = parseInt(req.query.previewLimit as string, 10) || 50;
      const sheetName = req.query.sheet as string;

      const previewData = ExcelProcessor.inspectAndPreview(originalPath, fileName, sheetName, previewLimit);
      const fileId = uuidv4();

      // Registrar archivo cargado
      const fileRecord = {
        id: fileId,
        nombre_archivo: fileName,
        hash_sha256: previewData.fileHash,
        tamano_bytes: previewData.fileSize,
        tipo_mime: file.mimetype,
        ruta_almacenamiento: originalPath,
        nombre_hoja_seleccionada: previewData.selectedSheet,
        total_filas: previewData.totalRows,
        filas_validas: previewData.sampleValidation.validCount,
        filas_invalidas: previewData.sampleValidation.invalidCount,
        filas_duplicadas: previewData.sampleValidation.duplicateCount,
        estado: 'CARGADO',
        mapeo_columnas: previewData.suggestedMapping,
        creado_en: new Date().toISOString()
      };

      if (supabase) {
        await supabase.from('archivos_cargados').insert(fileRecord);
      } else {
        const db = getLocalDb();
        db.archivos.unshift(fileRecord);
        saveLocalDb();
      }

      return res.status(200).json({
        success: true,
        fileId,
        preview: previewData
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Ejecuta el análisis y procesamiento completo a partir del archivo cargado y mapeo de columnas confirmado
   */
  public static async processFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileId, sheetName, columnMapping, threshold } = req.body;

      if (!fileId) {
        return res.status(400).json({ success: false, message: 'fileId es requerido' });
      }

      // Buscar archivo
      let fileRecord: any;
      if (supabase) {
        const { data } = await supabase.from('archivos_cargados').select('*').eq('id', fileId).single();
        fileRecord = data;
      } else {
        const db = getLocalDb();
        fileRecord = db.archivos.find((f: any) => f.id === fileId);
      }

      if (!fileRecord) {
        return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
      }

      const filePath = fileRecord.ruta_almacenamiento;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'El archivo físico original no existe en el servidor' });
      }

      const targetSheet = sheetName || fileRecord.nombre_hoja_seleccionada;
      const mapping: ColumnMapping = columnMapping || fileRecord.mapeo_columnas;
      const appliedThreshold = threshold ? parseFloat(threshold) : config.defaultTmoThreshold;

      // 1. Parsear y normalizar registros individuales (preservando datos crudos)
      const normalizedCalls = ExcelProcessor.parseAndNormalize(filePath, targetSheet, mapping);

      // 2. Calcular consolidado por agente y TMO ponderado
      const agentSummaries = TMOCalculator.calculateAgentSummaries(normalizedCalls, appliedThreshold);

      // 3. Calcular KPIs globales
      const kpis = TMOCalculator.calculateGlobalKPIs(normalizedCalls, agentSummaries, appliedThreshold);

      // 4. Auditoría Inteligente con IA
      const aiValidations = await AIService.analyzeAgentsBatch(agentSummaries, normalizedCalls, kpis, appliedThreshold);

      // 5. Generar reporte consolidado en Excel (4 hojas con gráficos nativos)
      const reportFileName = `Reporte_TMO_${path.parse(fileRecord.nombre_archivo).name}_${Date.now()}.xlsx`;
      const reportResult = await ExcelReportGenerator.generate4SheetReport({
        fileName: fileRecord.nombre_archivo,
        processedAt: new Date().toISOString(),
        thresholdSeconds: appliedThreshold,
        calls: normalizedCalls,
        agentSummaries,
        kpis,
        aiValidations
      }, reportFileName);

      // 6. Guardar en Base de Datos (PostgreSQL / Supabase o Local DB)
      if (supabase) {
        await supabase.from('archivos_cargados').update({
          estado: 'PROCESADO',
          total_filas: normalizedCalls.length,
          filas_validas: normalizedCalls.filter(c => c.isValid).length,
          filas_invalidas: normalizedCalls.filter(c => !c.isValid).length,
          filas_duplicadas: normalizedCalls.filter(c => c.isDuplicate).length
        }).eq('id', fileId);

        // Guardar llamadas
        const callsToInsert = normalizedCalls.map(c => ({
          archivo_id: fileId,
          codigo_agente_origen: c.agentCode,
          nombre_agente_origen: c.agentName,
          identificador_llamada: c.originalCallId,
          fecha_llamada: c.callDate,
          tipo_llamada: c.callType,
          estado_llamada: c.callStatus,
          tiempo_conversacion_seg: c.talkTimeSeconds,
          tiempo_espera_seg: c.waitTimeSeconds,
          tiempo_post_llamada_seg: c.wrapUpTimeSeconds,
          tiempo_silencio_seg: c.silenceTimeSeconds,
          duracion_total_seg: c.totalDurationSeconds,
          es_valido: c.isValid,
          es_duplicado: c.isDuplicate,
          errores_validacion: c.validationErrors,
          datos_crudos_json: c.rawData
        }));
        await supabase.from('registros_llamadas').insert(callsToInsert.slice(0, 1000));

        // Guardar resumen de agentes
        const summariesToInsert = agentSummaries.map(a => ({
          archivo_id: fileId,
          codigo_agente: a.agentCode,
          nombre_agente: a.agentName,
          total_llamadas: a.totalCalls,
          llamadas_contestadas: a.answeredCalls,
          llamadas_perdidas: a.missedCalls,
          llamadas_validas: a.validCalls,
          suma_tiempo_gestion_seg: a.sumDurationSeconds,
          tmo_promedio_seg: a.ahtTmoSeconds,
          tiempo_promedio_conversacion_seg: a.avgTalkTimeSeconds,
          tiempo_promedio_silencio_seg: a.avgSilenceTimeSeconds,
          porcentaje_cumplimiento: a.complianceRate,
          umbral_aplicado_seg: a.thresholdApplied,
          clasificacion_determinista: a.classification
        }));
        await supabase.from('resumen_agentes').insert(summariesToInsert);

        // Guardar reporte
        await supabase.from('reportes_generados').insert({
          archivo_id: fileId,
          nombre_reporte: reportFileName,
          ruta_almacenamiento: reportResult.filePath,
          tamano_bytes: reportResult.fileSize,
          graficos_incluidos: reportResult.chartsIncluded
        });
      } else {
        const db = getLocalDb();
        fileRecord.estado = 'PROCESADO';
        fileRecord.total_filas = normalizedCalls.length;
        fileRecord.filas_validas = normalizedCalls.filter(c => c.isValid).length;
        fileRecord.filas_invalidas = normalizedCalls.filter(c => !c.isValid).length;
        fileRecord.filas_duplicadas = normalizedCalls.filter(c => c.isDuplicate).length;

        // Limpiar llamadas previas de este archivo si se reprocesa
        db.llamadas = db.llamadas.filter((c: any) => c.archivo_id !== fileId);
        normalizedCalls.forEach(c => {
          db.llamadas.push({
            id: uuidv4(),
            archivo_id: fileId,
            codigo_agente_origen: c.agentCode,
            nombre_agente_origen: c.agentName,
            identificador_llamada: c.originalCallId,
            fecha_llamada: c.callDate,
            tipo_llamada: c.callType,
            estado_llamada: c.callStatus,
            tiempo_conversacion_seg: c.talkTimeSeconds,
            tiempo_espera_seg: c.waitTimeSeconds,
            tiempo_post_llamada_seg: c.wrapUpTimeSeconds,
            tiempo_silencio_seg: c.silenceTimeSeconds,
            duracion_total_seg: c.totalDurationSeconds,
            es_valido: c.isValid,
            es_duplicado: c.isDuplicate,
            errores_validacion: c.validationErrors,
            datos_crudos_json: c.rawData
          });
        });

        db.resumenAgentes = db.resumenAgentes.filter((s: any) => s.archivo_id !== fileId);
        agentSummaries.forEach(a => {
          db.resumenAgentes.push({
            id: uuidv4(),
            archivo_id: fileId,
            codigo_agente: a.agentCode,
            nombre_agente: a.agentName,
            total_llamadas: a.totalCalls,
            llamadas_contestadas: a.answeredCalls,
            llamadas_perdidas: a.missedCalls,
            llamadas_validas: a.validCalls,
            suma_tiempo_gestion_seg: a.sumDurationSeconds,
            tmo_promedio_seg: a.ahtTmoSeconds,
            tiempo_promedio_conversacion_seg: a.avgTalkTimeSeconds,
            tiempo_promedio_silencio_seg: a.avgSilenceTimeSeconds,
            porcentaje_cumplimiento: a.complianceRate,
            umbral_aplicado_seg: a.thresholdApplied,
            clasificacion_determinista: a.classification,
            isStatisticalOutlier: a.isStatisticalOutlier,
            zScore: a.zScore
          });
        });

        db.validacionesIA = db.validacionesIA.filter((v: any) => v.archivo_id !== fileId);
        aiValidations.forEach(v => {
          db.validacionesIA.push({
            id: uuidv4(),
            archivo_id: fileId,
            ...v
          });
        });

        db.reportes.unshift({
          id: uuidv4(),
          archivo_id: fileId,
          nombre_reporte: reportFileName,
          ruta_almacenamiento: reportResult.filePath,
          tamano_bytes: reportResult.fileSize,
          graficos_incluidos: reportResult.chartsIncluded,
          creado_en: new Date().toISOString()
        });

        saveLocalDb();
      }

      return res.status(200).json({
        success: true,
        message: 'Archivo procesado e indicadores calculados exitosamente.',
        fileId,
        kpis,
        agentSummaries,
        aiValidations,
        reportFileName,
        chartsIncluded: reportResult.chartsIncluded
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Obtiene la lista de todos los archivos cargados
   */
  public static async getFiles(req: Request, res: Response, next: NextFunction) {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('archivos_cargados')
          .select('*')
          .order('creado_en', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ success: true, files: data });
      } else {
        const db = getLocalDb();
        return res.status(200).json({ success: true, files: db.archivos });
      }
    } catch (err) {
      next(err);
    }
  }
}
