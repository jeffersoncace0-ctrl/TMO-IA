import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  ArrowRight,
  Layers,
  Settings2,
  Table,
  Check,
  RefreshCw,
  FileCheck2
} from 'lucide-react';
import { api } from '../services/api';

interface ExcelUploadPageProps {
  currentThreshold: number;
  onFileProcessed: (fileId: string) => void;
}

export const ExcelUploadPage: React.FC<ExcelUploadPageProps> = ({
  currentThreshold,
  onFileProcessed
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<any>({});
  const [processSuccess, setProcessSuccess] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMessage('Formato no permitido. Solo se admiten archivos .xlsx y .xls.');
        return;
      }
      setFile(selected);
      setErrorMessage(null);
      setPreviewResult(null);
      setProcessSuccess(null);
    }
  };

  const handleUploadAndInspect = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setErrorMessage(null);

      const res = await api.uploadFile(file, selectedSheet);
      if (res.success) {
        setPreviewResult(res.preview);
        setFileId(res.fileId);
        setSelectedSheet(res.preview.selectedSheet);
        setColumnMapping(res.preview.suggestedMapping);
      } else {
        setErrorMessage(res.message || 'Error al inspeccionar el archivo');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error en la conexión con el servidor');
    } finally {
      setUploading(false);
    }
  };

  const handleSheetChange = async (sheet: string) => {
    setSelectedSheet(sheet);
    if (!file) return;

    try {
      setUploading(true);
      const res = await api.uploadFile(file, sheet);
      if (res.success) {
        setPreviewResult(res.preview);
        setFileId(res.fileId);
        setColumnMapping(res.preview.suggestedMapping);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleProcessFile = async () => {
    if (!fileId) return;

    try {
      setProcessing(true);
      setErrorMessage(null);

      const res = await api.processFile({
        fileId,
        sheetName: selectedSheet,
        columnMapping,
        threshold: currentThreshold
      });

      if (res.success) {
        setProcessSuccess(res);
        onFileProcessed(fileId);
      } else {
        setErrorMessage(res.message || 'Error al procesar el archivo');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error durante el procesamiento');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Cargar y Analizar Excel</h2>
        <p className="text-sm text-slate-500 mt-1">
          Importe registros de llamadas en formato .xlsx o .xls, inspeccione hojas, mapee columnas y ejecute el cálculo de TMO.
        </p>
      </div>

      {/* Zona de Arrastre y Selección de Archivo */}
      <div className="bg-white rounded-xl p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
            <UploadCloud className="w-8 h-8" />
          </div>

          <label className="cursor-pointer">
            <span className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              Haga clic para seleccionar un archivo
            </span>
            <span className="text-sm text-slate-500"> o arrástrelo aquí</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <p className="text-xs text-slate-400 mt-1">Compatibilidad garantizada: .xlsx y .xls (hasta 50 MB)</p>

          {file && (
            <div className="mt-4 flex items-center gap-3 bg-slate-50 border border-slate-200 py-2 px-4 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div className="text-left text-xs">
                <span className="font-semibold text-slate-800 block">{file.name}</span>
                <span className="text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button
                onClick={handleUploadAndInspect}
                disabled={uploading}
                className="ml-3 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                <span>{uploading ? 'Inspeccionando...' : 'Inspeccionar Hojas & Columnas'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mensajes de Alerta / Error */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Resultado de Inspección y Previsualización */}
      {previewResult && (
        <div className="space-y-6">
          {/* Tarjeta de Metadatos y Calidad */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Total Filas Detectadas</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{previewResult.totalRows}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Muestra Válida</span>
              <p className="text-xl font-bold text-emerald-600 mt-1">{previewResult.sampleValidation.validCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Filas Duplicadas</span>
              <p className="text-xl font-bold text-amber-600 mt-1">{previewResult.sampleValidation.duplicateCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Errores o Incompletos</span>
              <p className="text-xl font-bold text-rose-600 mt-1">{previewResult.sampleValidation.invalidCount}</p>
            </div>
          </div>

          {/* Selector de Hoja y Mapeo de Columnas */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Configuración de Hojas y Mapeo de Columnas</h3>
              </div>

              {/* Selector de Hojas del Libro */}
              {previewResult.sheetNames.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Hoja a analizar:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium outline-none"
                  >
                    {previewResult.sheetNames.map((sh: string) => (
                      <option key={sh} value={sh}>{sh}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Formulario de Mapeo de Columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Código de Agente <span className="text-rose-500">*</span>
                </label>
                <select
                  value={columnMapping.agentCode || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, agentCode: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                >
                  <option value="">Seleccionar columna...</option>
                  {previewResult.detectedColumns.map((col: string) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nombre de Agente
                </label>
                <select
                  value={columnMapping.agentName || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, agentName: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                >
                  <option value="">(Opcional) Seleccionar...</option>
                  {previewResult.detectedColumns.map((col: string) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Duración Total / TMO <span className="text-rose-500">*</span>
                </label>
                <select
                  value={columnMapping.duration || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, duration: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                >
                  <option value="">Seleccionar columna...</option>
                  {previewResult.detectedColumns.map((col: string) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tiempo de Silencio
                </label>
                <select
                  value={columnMapping.silenceTime || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, silenceTime: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                >
                  <option value="">(Opcional) Seleccionar...</option>
                  {previewResult.detectedColumns.map((col: string) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botón de Procesar con Idempotencia */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Archivo original protegido. Los resultados calculados se almacenarán por separado.</span>
              </div>

              <button
                onClick={handleProcessFile}
                disabled={processing || !columnMapping.agentCode}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{processing ? 'Calculando TMO e Indicadores...' : 'Ejecutar Análisis y Procesar'}</span>
              </button>
            </div>
          </div>

          {/* Vista Previa de Filas (Muestra de Datos Crudos) */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Table className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Vista Previa de Filas (Primeros registros del archivo)</h3>
            </div>

            <div className="overflow-x-auto max-h-72 border border-slate-100 rounded-lg">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0">
                  <tr>
                    {previewResult.detectedColumns.map((col: string) => (
                      <th key={col} className="p-2.5 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {previewResult.previewRows.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {previewResult.detectedColumns.map((col: string) => (
                        <td key={col} className="p-2.5 whitespace-nowrap">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Éxito de Procesamiento */}
      {processSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <h4 className="font-bold text-sm">¡Archivo procesado e indicadores calculados exitosamente!</h4>
          </div>
          <p className="text-xs">
            Se procesaron las llamadas, se calculó el TMO por agente y se generó el libro Excel de 4 hojas con gráficos nativos: <strong>{processSuccess.reportFileName}</strong>.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => onFileProcessed(processSuccess.fileId)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <span>Ir al Dashboard General</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
