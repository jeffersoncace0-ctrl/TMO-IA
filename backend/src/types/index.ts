// Tipos de datos e interfaces principales para la plataforma de análisis de llamadas y TMO

export type DeterministicClassification = 'APROBADO' | 'REQUIERE_REVISION' | 'ERROR_DATOS';

export type CallType = 'ENTRANTE' | 'SALIENTE' | 'INTERNA' | 'DESCONOCIDO';
export type CallStatus = 'CONTESTADA' | 'PERDIDA' | 'OCUPADA' | 'NO_CONTESTADA' | 'DESCONOCIDO';

export interface RawCallRow {
  [key: string]: any;
}

export interface NormalizedCallRecord {
  id?: string;
  originalCallId?: string;
  agentCode: string;
  agentName?: string;
  callDate?: string;
  callType: CallType;
  callStatus: CallStatus;
  talkTimeSeconds: number;
  waitTimeSeconds: number;
  wrapUpTimeSeconds: number;
  silenceTimeSeconds: number;
  totalDurationSeconds: number;
  isValid: boolean;
  isDuplicate: boolean;
  validationErrors: string[];
  rawData: RawCallRow;
}

export interface ColumnMapping {
  agentCode: string;
  agentName?: string;
  callId?: string;
  callDate?: string;
  callType?: string;
  callStatus?: string;
  duration?: string;
  talkTime?: string;
  waitTime?: string;
  wrapUpTime?: string;
  silenceTime?: string;
}

export interface ExcelPreviewResult {
  fileName: string;
  fileHash: string;
  fileSize: number;
  sheetNames: string[];
  selectedSheet: string;
  totalRows: number;
  previewRows: RawCallRow[];
  detectedColumns: string[];
  suggestedMapping: ColumnMapping;
  sampleValidation: {
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
    sampleErrors: string[];
  };
}

export interface AgentSummaryMetrics {
  agentId?: string;
  agentCode: string;
  agentName: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  validCalls: number;
  sumDurationSeconds: number;
  ahtTmoSeconds: number;
  avgTalkTimeSeconds: number;
  avgSilenceTimeSeconds: number;
  complianceRate: number;
  thresholdApplied: number;
  classification: DeterministicClassification;
  isStatisticalOutlier?: boolean;
  zScore?: number;
}

export interface GlobalKPIMetrics {
  totalCalls: number;
  totalAgents: number;
  acceptedCalls: number;
  missedCalls: number;
  acceptedCallsPercentage: number;
  missedCallsPercentage: number;
  averageHandleTimeSeconds: number;
  averageTalkTimeSeconds: number;
  averageSilenceTimeSeconds: number;
  percentageOfCompliance: number;
  thresholdApplied: number;
  approvedAgentsCount: number;
  reviewRequiredAgentsCount: number;
  errorAgentsCount: number;
  periodComparison?: {
    callsGrowthRate: number;
    tmoChangeSeconds: number;
    complianceChangeRate: number;
  };
}

export interface AIValidationItem {
  agentCode: string;
  agentName: string;
  ahtTmoSeconds: number;
  thresholdApplied: number;
  ruleResult: DeterministicClassification;
  aiClassification: 'CONFIRMA_APROBADO' | 'CONFIRMA_REVISION' | 'OBSERVACION_ANOMALIA' | 'PENDIENTE_REVISION';
  anomalyDetected: boolean;
  anomalyType?: string;
  classificationReason: string;
  operationalRecommendation: string;
  isStatisticalOutlier: boolean;
  zScore?: number;
}

export interface EmailLogEntry {
  id: string;
  fileId?: string;
  recipient: string;
  ccRecipients?: string[];
  subject: string;
  status: 'PENDIENTE' | 'ACEPTADO_PROVEEDOR' | 'ENTREGADO' | 'RECHAZADO' | 'ERROR';
  providerMessageId?: string;
  providerResponse?: string;
  errorMessage?: string;
  sentAt: string;
}

export interface ExecutionLogEntry {
  id: string;
  idempotencyKey: string;
  workflowName: string;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'FALLIDO' | 'IGNORADO_DUPLICADO';
  fileId?: string;
  fileName?: string;
  startedAt: string;
  completedAt?: string;
  rowsProcessed?: number;
  errorsCount?: number;
}

export interface FilterOptions {
  fileId?: string;
  agentCode?: string;
  startDate?: string;
  endDate?: string;
  callType?: CallType;
  callStatus?: CallStatus;
  classification?: DeterministicClassification;
}
