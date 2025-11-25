import React, { useState, useCallback, useMemo } from 'react';
import { UploadCloud, AlertCircle, CheckCircle2, FileJson, Server, MessageSquare, Zap } from 'lucide-react';
import { ApiConfig, FetchStatus, TransformationConfig } from './types';
import { DataViewer } from './components/DataViewer';
import { TransformationControls } from './components/TransformationControls';
import { analyzeDataStructure } from './services/geminiService'; // সঠিক ইম্পোর্ট পাথ
import { ChatDataAssistant } from './components/ChatDataAssistant';
import { ApiScanner } from './components/ApiScanner';

// Helper to access nested props
const getByPath = (obj: any, path: string) => {
  if (!path) return obj;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fetcher' | 'scanner'>('fetcher');

  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    url: 'http://202.72.235.218:8082/api/v1/institute/list?page=1&size=100',
    method: 'GET',
    headers: '{}'
  });
  
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rawData, setRawData] = useState<any>(null);
  
  // Filter Logic
  const [activeFilterCode, setActiveFilterCode] = useState<string>('');
  
  const [transformConfig, setTransformConfig] = useState<TransformationConfig>({
    rootPath: '',
    labelKey: '',
    valueKey: ''
  });

  const [aiAnalysisReason, setAiAnalysisReason] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // --- Handlers ---

  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFetchStatus('loading');
    setErrorMsg('');
    setRawData(null);
    setAiAnalysisReason('');
    setActiveFilterCode(''); // Reset filters

    try {
      const headers = JSON.parse(apiConfig.headers || '{}');
      const response = await fetch(apiConfig.url, {
        method: apiConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setRawData(data);
      setFetchStatus('success');
      
      // Auto analyze on first fetch
      handleAutoAnalyze(data);

    } catch (err: any) {
      console.error(err);
      setFetchStatus('error');
      let msg = err.message;
      if (err.name === 'TypeError' && msg === 'Failed to fetch') {
        msg = 'CORS Error or Network Failure. Try using a CORS proxy or disable security in local dev.';
      }
      setErrorMsg(msg);
    }
  };

  const handleAutoAnalyze = async (dataToAnalyze = rawData) => {
    if (!dataToAnalyze) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeDataStructure(dataToAnalyze);
      setTransformConfig({
        rootPath: analysis.rootPath,
        labelKey: analysis.labelKey,
        valueKey: analysis.valueKey
      });
      setAiAnalysisReason(analysis.reasoning);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUseApiFromScanner = (url: string, method: string) => {
    setApiConfig(prev => ({ ...prev, url, method: method as 'GET'|'POST' }));
    setActiveTab('fetcher');
  };

  // --- Derived Data (Filtering) ---

  const processedData = useMemo(() => {
    if (!rawData) return null;
    
    // 1. Get Array from Root Path
    const list = getByPath(rawData, transformConfig.rootPath);
    
    // 2. Apply Filter if exists
    if (activeFilterCode && Array.isArray(list)) {
      try {
        const filterFn = new Function('item', `return ${activeFilterCode.startsWith('item') ? activeFilterCode.replace(/^item\s*=>\s*/, '') : activeFilterCode}`);
        // Simple check to see if we can execute it
        const filteredList = list.filter((item) => {
             // For strict safety we could use more checks, but for this tool dynamic eval is the feature.
             // We reconstruct the function properly:
             const dynamicFilter = new Function('item', 'return ' + activeFilterCode.split('=>')[1]);
             return dynamicFilter(item);
        });
        
        // Return a new object with the filtered list at the "data" key (virtual)
        // Or if rootPath is empty, return the list directly
        if (!transformConfig.rootPath) return filteredList;
        return { ...rawData, [transformConfig.rootPath]: filteredList }; 

      } catch (e) {
        console.error("Filter failed", e);
        // If filter fails, return original
        return rawData;
      }
    }
    
    return rawData;
  }, [rawData, transformConfig.rootPath, activeFilterCode]);

  // Adjust root path for the viewer if we filtered
  // If we filtered, we assume the list is now accessible via the same root path in our virtual object
  const effectiveRootPath = transformConfig.rootPath;

  const downloadJson = useCallback(() => {
    if (!processedData) return;

    let finalData;
    const list = getByPath(processedData, effectiveRootPath);

    if (transformConfig.labelKey && transformConfig.valueKey && Array.isArray(list)) {
      finalData = list.map((item: any) => ({
        label: item[transformConfig.labelKey],
        value: item[transformConfig.valueKey]
      }));
    } else {
      finalData = list || processedData;
    }

    const blob = new Blob([JSON.stringify(finalData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedData, transformConfig, effectiveRootPath]);

  // Compute available keys
  const availableKeys = React.useMemo(() => {
    if (!processedData) return [];
    const list = getByPath(processedData, effectiveRootPath);
    if (Array.isArray(list) && list.length > 0) {
      return Object.keys(list[0]);
    }
    return [];
  }, [processedData, effectiveRootPath]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-md flex items-center justify-center text-white shadow-brand-200 shadow-lg">
              <Server size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">API Workbench</h1>
          </div>
          
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('fetcher')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'fetcher' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Data Fetcher
            </button>
            <button 
              onClick={() => setActiveTab('scanner')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'scanner' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              API Scanner
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {activeTab === 'scanner' ? (
          <div className="animate-in fade-in duration-300">
             <ApiScanner onSelectApi={handleUseApiFromScanner} />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300 space-y-6">
            {/* Fetcher Section */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <UploadCloud size={20} className="text-brand-500" />
                Fetch Configuration
              </h2>
              <form onSubmit={handleFetch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[100px_1fr_140px] gap-3">
                  <select 
                    value={apiConfig.method}
                    onChange={(e) => setApiConfig({...apiConfig, method: e.target.value as 'GET'|'POST'})}
                    className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none bg-slate-50"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                  <input 
                    type="url" 
                    placeholder="https://api.example.com/data"
                    required
                    value={apiConfig.url}
                    onChange={(e) => setApiConfig({...apiConfig, url: e.target.value})}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                  />
                  <button 
                    type="submit" 
                    disabled={fetchStatus === 'loading'}
                    className="bg-brand-600 hover:bg-brand-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-brand-200 active:scale-95"
                  >
                    {fetchStatus === 'loading' ? 'Fetching...' : 'Fetch Data'}
                  </button>
                </div>
              </form>

              {/* Status Messages */}
              {fetchStatus === 'error' && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex gap-3 text-sm animate-in slide-in-from-top-2">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="font-semibold">Fetch Failed</p>
                    <p>{errorMsg}</p>
                  </div>
                </div>
              )}
              
              {fetchStatus === 'success' && (
                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center justify-between text-sm animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <p>Success! Data loaded.</p>
                  </div>
                  {!isChatOpen && (
                    <button 
                      onClick={() => setIsChatOpen(true)}
                      className="flex items-center gap-1.5 bg-white border border-green-200 px-3 py-1 rounded-md text-green-700 hover:bg-green-100 transition-colors font-medium shadow-sm"
                    >
                      <MessageSquare size={14} /> Chat with Data
                    </button>
                  )}
                </div>
              )}
            </section>

            {rawData && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                
                {/* Left Col: Transformer (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                  <TransformationControls 
                    config={transformConfig}
                    onConfigChange={setTransformConfig}
                    onAutoGenerate={() => handleAutoAnalyze(processedData)}
                    onDownload={downloadJson}
                    isAnalyzing={isAnalyzing}
                    availableKeys={availableKeys}
                  />

                  {activeFilterCode && (
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-indigo-900 flex items-center gap-1">
                          <Zap size={14} className="fill-indigo-500 text-indigo-500" /> Active Filter
                        </p>
                        <button onClick={() => setActiveFilterCode('')} className="text-xs text-indigo-600 hover:underline">Clear</button>
                      </div>
                      <code className="block bg-indigo-100/50 p-2 rounded text-xs font-mono text-indigo-800 break-all">
                        {activeFilterCode}
                      </code>
                    </div>
                  )}

                  <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 text-sm text-slate-600">
                    <p className="font-semibold mb-2 flex items-center gap-2 text-slate-800">
                      <FileJson size={16}/> Usage
                    </p>
                    <p className="mb-2 text-xs">Generated JSON format:</p>
                    <pre className="bg-white p-3 rounded border border-slate-200 overflow-x-auto text-xs font-mono text-slate-500">
                      [{`{ "label": "...", "value": "..." }`}, ...]
                    </pre>
                  </div>
                </div>

                {/* Right Col: Viewer (8 cols) */}
                <div className="lg:col-span-8">
                  <DataViewer data={processedData} rootPath={effectiveRootPath} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Chat Assistant */}
      <ChatDataAssistant 
        isOpen={isChatOpen && !!rawData}
        onClose={() => setIsChatOpen(false)}
        data={processedData || rawData}
        onFilterApply={setActiveFilterCode}
        onConfigApply={setTransformConfig}
      />
    </div>
  );
}

export default App;