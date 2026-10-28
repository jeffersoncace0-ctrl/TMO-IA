import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  Lightbulb, 
  ShieldAlert,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

interface AIAssistantPageProps {
  currentThreshold: number;
  selectedFileId?: string;
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
  currentThreshold,
  selectedFileId
}) => {
  const [validations, setValidations] = useState<any[]>([]);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: '¡Hola! Soy tu Asistente de IA para Call Centers y Control de TMO. Puedes preguntarme en lenguaje natural sobre cualquier agente (por ejemplo: "Dame los reportes del TMO del agente Jefferson Cacerez" o "Cómo va Carlos Ramirez"), o consultar quiénes están pasados con el TMO, quiénes van bien, los tiempos de silencio y rankings. ¿Qué deseas consultar hoy?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [loadingValidations, setLoadingValidations] = useState(false);

  const fetchValidations = async () => {
    try {
      setLoadingValidations(true);
      const res = await api.getAIValidations(selectedFileId);
      if (res.success) {
        setValidations(res.validations || []);
      }
    } catch (err) {
      console.error('Error cargando validaciones de IA:', err);
    } finally {
      setLoadingValidations(false);
    }
  };

  useEffect(() => {
    fetchValidations();
  }, [selectedFileId]);

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || asking) return;

    const userText = question;
    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { sender: 'user', text: userText, time: userTime }]);
    setQuestion('');
    setAsking(true);

    try {
      const res = await api.askAIAssistant(userText, selectedFileId);
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: res.answer || 'No pude obtener una respuesta en este momento.',
          time: aiTime
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Error de comunicación con el asistente inteligente: ' + err.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setAsking(false);
    }
  };

  const sampleQuestions = [
    'Dame los reportes del TMO del agente Jefferson Cacerez',
    '¿Quiénes están pasados con el TMO?',
    '¿Quiénes van bien y cumplen el umbral?',
    '¿Quién es el mejor agente del equipo?',
    '¿Cuáles son los agentes con mayor tiempo de silencio?',
    '¿Se detectaron outliers estadísticos?'
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Asistente de IA & Auditoría Inteligente</h2>
        <p className="text-sm text-slate-500 mt-1">
          Explicabilidad de resultados, detección de anomalías operativas y diálogo interactivo con el modelo analítico.
        </p>
      </div>

      {/* Regla Determinista vs Asistente IA Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block text-sm mb-0.5">Prioridad Determinista Garantizada</strong>
          <span>
            Las reglas matemáticas configuradas (TMO &le; {currentThreshold}s) tienen prioridad estricta. El asistente de IA no modifica valores calculados ni clasificaciones deterministas; su función es aportar diagnóstico causal, detección de anomalías y sugerencias de mejora.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chat Interactivo con el Asistente de IA (Columna Izquierda) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Chat Operativo con IA</h3>
                <span className="text-[10px] text-emerald-600 font-medium">En línea • Basado en datos reales</span>
              </div>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    IA
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none whitespace-pre-line'
                  }`}
                >
                  <p>{m.text}</p>
                  <span className={`text-[9px] mt-1 block text-right ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
            {asking && (
              <div className="flex gap-2 items-center text-xs text-slate-400 italic">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Analizando registros y formulando respuesta...</span>
              </div>
            )}
          </div>

          {/* Preguntas Sugeridas */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
            {sampleQuestions.map((sq, i) => (
              <button
                key={i}
                onClick={() => setQuestion(sq)}
                className="text-[10px] bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 rounded-full px-2.5 py-1 transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Formulario de Entrada */}
          <form onSubmit={handleSendQuestion} className="p-3 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ej: 'Dame los reportes del TMO del agente Jefferson Cacerez' o '¿Quiénes van bien?'"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Auditoría por Agente de IA (Columna Derecha) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Diagnósticos Individuales por Agente ({validations.length})
              </h3>
            </div>
            <button
              onClick={fetchValidations}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingValidations ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {validations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-6">
                <Bot className="w-10 h-10 mb-2 opacity-30 text-indigo-600" />
                <p>No hay diagnósticos generados para el archivo actual.</p>
                <p className="mt-1">Procese un archivo Excel para activar la validación automática de IA.</p>
              </div>
            ) : (
              validations.map((v, i) => {
                const isApproved = (v.ruleResult || v.resultado_regla) === 'APROBADO';
                const hasAnomaly = v.anomalyDetected || v.anomalia_detectada;

                return (
                  <div
                    key={v.id || i}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all space-y-2 bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-slate-900 font-bold">
                          {v.agentName || v.agente_id} ({v.agentCode || v.agente_id})
                        </strong>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {v.ruleResult || v.resultado_regla}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">TMO:</span>
                        <strong className={isApproved ? 'text-emerald-700' : 'text-rose-700'}>
                          {v.ahtTmoSeconds || v.tmo_evaluado_seg}s
                        </strong>
                      </div>
                    </div>

                    {/* Explicación de la IA */}
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {v.classificationReason || v.motivo_clasificacion}
                    </p>

                    {/* Anomalía Detectada */}
                    {hasAnomaly && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>Anomalía:</strong> {v.anomalyType || 'Comportamiento atípico en silencios o colas'}</span>
                      </div>
                    )}

                    {/* Recomendación Operativa */}
                    <div className="flex items-start gap-1.5 text-[11px] text-indigo-900 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-md">
                      <Lightbulb className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Acción Sugerida:</strong> {v.operationalRecommendation || v.recomendacion_operativa}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
