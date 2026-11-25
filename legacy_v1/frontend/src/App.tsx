import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, SectionType } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ExcelUploadPage } from './pages/ExcelUploadPage';
import { CallsTablePage } from './pages/CallsTablePage';
import { AgentAnalysisPage } from './pages/AgentAnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ThresholdConfigPage } from './pages/ThresholdConfigPage';
import { EmailConfigPage } from './pages/EmailConfigPage';
import { ExecutionHistoryPage } from './pages/ExecutionHistoryPage';
import { ErrorManagementPage } from './pages/ErrorManagementPage';
import { api } from './services/api';

export function App() {
  const [activeSection, setActiveSection] = useState<SectionType>('dashboard');
  const [threshold, setThreshold] = useState<number>(20.0);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>(undefined);
  const [unresolvedErrors, setUnresolvedErrors] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [thresholdRes, filesRes, errorsRes] = await Promise.all([
        api.getThreshold(),
        api.getFiles(),
        api.getErrors()
      ]);

      if (thresholdRes.success) {
        setThreshold(thresholdRes.thresholdSeconds || 20.0);
      }

      if (filesRes.success && filesRes.files?.length > 0) {
        setFiles(filesRes.files);
        if (!selectedFileId) {
          setSelectedFileId(filesRes.files[0].id);
        }
      }

      if (errorsRes.success) {
        const pending = (errorsRes.errors || []).filter((e: any) => !e.resuelto).length;
        setUnresolvedErrors(pending);
      }
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleFileProcessed = (fileId: string) => {
    setSelectedFileId(fileId);
    api.getFiles().then(res => {
      if (res.success) setFiles(res.files);
    });
    setActiveSection('dashboard');
  };

  const activeFileName = files.find(f => f.id === selectedFileId)?.nombre_archivo;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Navbar
        currentThreshold={threshold}
        activeFileName={activeFileName}
        onRefresh={loadInitialData}
        isLoading={loading}
      />

      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          unresolvedErrorsCount={unresolvedErrors}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {activeSection === 'dashboard' && (
            <DashboardPage
              currentThreshold={threshold}
              selectedFileId={selectedFileId}
              files={files}
            />
          )}

          {activeSection === 'upload' && (
            <ExcelUploadPage
              currentThreshold={threshold}
              onFileProcessed={handleFileProcessed}
            />
          )}

          {activeSection === 'calls' && (
            <CallsTablePage selectedFileId={selectedFileId} />
          )}

          {activeSection === 'agents' && (
            <AgentAnalysisPage
              currentThreshold={threshold}
              selectedFileId={selectedFileId}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsPage />
          )}

          {activeSection === 'ai' && (
            <AIAssistantPage
              currentThreshold={threshold}
              selectedFileId={selectedFileId}
            />
          )}

          {activeSection === 'threshold' && (
            <ThresholdConfigPage
              currentThreshold={threshold}
              onThresholdUpdated={(newThresh) => setThreshold(newThresh)}
            />
          )}

          {activeSection === 'email' && (
            <EmailConfigPage selectedFileId={selectedFileId} />
          )}

          {activeSection === 'executions' && (
            <ExecutionHistoryPage
              selectedFileId={selectedFileId}
              currentThreshold={threshold}
            />
          )}

          {activeSection === 'errors' && (
            <ErrorManagementPage />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
