import React, { useState, useCallback, useMemo } from 'react';
import { UploadCloud, AlertCircle, CheckCircle2, FileJson, Server, MessageSquare, Zap, ShieldCheck, Globe } from 'lucide-react';
import { ApiConfig, FetchStatus, TransformationConfig } from './types';
import { DataViewer } from './components/DataViewer';
import { TransformationControls } from './components/TransformationControls';
import { analyzeDataStructure } from './services/geminiService';
import { ChatDataAssistant } from './components/ChatDataAssistant';
import { ApiScanner } from './components/ApiScanner';

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
  const [connectionType, setConnectionType] = useState<'direct' | 'proxy' | 'public_fallback' | null>(null);
  const [activeFilterCode, setActiveFilterCode] = useState<string>('');
  
  const [transformConfig, setTransformConfig] = useState<TransformationConfig>({
    rootPath: '',
    labelKey: '',
    valueKey: ''
  });

  const [aiAnalysisReason, setAiAnalysisReason] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFetchStatus('loading');
    setErrorMsg('');
    setRawData(null);
    setAiAnalysisReason('');
    setActiveFilterCode('');
    setConnectionType(null);

    // 1. Try Direct Fetch
    const tryDirect = async () => {
      try {
        const response = await fetch(apiConfig.url, {
          method: apiConfig.method,
          headers: { 'Content-Type': 'application/json', ...JSON.parse(apiConfig.headers || '{}') }
        });
        if (!response.ok) throw new Error("Direct fetch failed");
        const data = await response.json();
        setRawData(data);
        setConnectionType('direct');
        return true;
      } catch (err) { return false; }
    };

    // 2. Try Secure Proxy Fetch
    const tryProxy = async () => {
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl: apiConfig.url,
            method: apiConfig.method,
            headers: apiConfig.headers
          })
        });
        
        // Read error details from proxy
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || response.statusText);
        }

        const data = await response.json();
        setRawData(data);
        setConnectionType('proxy');
        return true;
      } catch (err: any) { 
        console.warn("Proxy failed:", err.message);
        setErrorMsg(prev => prev + ` | Proxy: ${err.message}`);
        return false; 
      }
    };

    // 3. Try Public Fallback (AllOrigins) - if server is Geo-Blocked
    const tryPublicFallback = async () => {
      try {
        // Use AllOrigins service (typically supports GET only)
        const encodedUrl = encodeURIComponent(apiConfig.url);
        const response = await fetch(`https://api.allorigins.win/get?url=${encodedUrl}`);
        
        if (!response.ok) throw new Error("Public fallback failed");
        
        const wrapper = await response.json();
        const data = JSON.parse(wrapper.contents); // AllOrigins returns data as string inside contents
        
        setRawData(data);
        setConnectionType('public_fallback');
        return true;
      } catch (err: any) {
        console.warn("Public fallback failed:", err);
        return false;
      }
    };

    // Execution flow: try each method in sequence
    const directSuccess = await tryDirect();
    if (directSuccess) {
      setFetchStatus('success');
      handleAutoAnalyze();
      return;
    }

    console.log("Direct failed, trying Secure Proxy...");
    const proxySuccess = await tryProxy();
    if (proxySuccess) {
      setFetchStatus('success');
      handleAutoAnalyze();
      return;
    }

    console.log("Proxy failed, trying Public Fallback...");
    const fallbackSuccess = await tryPublicFallback();
    if (fallbackSuccess) {
      setFetchStatus('success');
      handleAutoAnalyze();
      return;
    }

    // If all methods fail
    setFetchStatus('error');
    if (!errorMsg) setErrorMsg("Failed to connect via Direct, Proxy, and Public Relay. The API might be offline or strictly blocking foreign IPs.");
  };

  const handleAutoAnalyze = async (dataToAnalyze = rawData) => {
    // Manual trigger is safer to avoid state update timing issues
    // User can click AI Auto-Detect button to trigger analysis
  };

  // Handler for API Scanner selection
  const handleUseApiFromScanner = (url: string, method: string) => {
    setApiConfig(prev => ({ ...prev, url, method: method as 'GET'|'POST' }));
    setActiveTab('fetcher');
  };

  const processedData = useMemo(() => {
    if (!rawData) return null;
    const list = getByPath(rawData, transformConfig.rootPath);
    if (activeFilterCode && Array.isArray(list)) {
      try {
        const filterFn = new Function('item', 'return ' + activeFilterCode.split('=>')[1]);
        const filteredList = list.filter((item: any) => filterFn(item));
        if (!transformConfig.rootPath) return filteredList;
        return { ...rawData, [transformConfig.rootPath]: filteredList };
      } catch (e) {
        return rawData;
      }
    }
    return rawData;
  }, [rawData, transformConfig.rootPath, activeFilterCode]);

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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-md flex items-center justify-center text-white shadow-brand-200 shadow-lg">
              <Server size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">API Workbench</h1>
          </div>
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('fetcher')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'fetcher' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Data Fetcher</button>
            <button onClick={() => setActiveTab('scanner')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'scanner' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>API Scanner</button>
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

              {fetchStatus === 'error' && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex gap-3 text-sm animate-in slide-in-from-top-2">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <div className="flex-1">
                    <p className="font-semibold">Fetch Failed</p>
                    <p className="break-all">{errorMsg}</p>
                    {errorMsg.includes("Proxy") && (
                      <p className="mt-2 text-xs text-red-600 font-medium">Tip: The target server might be blocking Vercel IPs (Geo-blocking).</p>
                    )}
                  </div>
                </div>
              )}
              
              {fetchStatus === 'success' && (
                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center justify-between text-sm animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <p>Success! Data loaded.</p>
                    {connectionType === 'proxy' && (
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                        <ShieldCheck size={12}/> Secure Proxy
                      </span>
                    )}
                    {connectionType === 'public_fallback' && (
                      <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                        <Globe size={12}/> Public Relay
                      </span>
                    )}
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

                <div className="lg:col-span-8">
                  <DataViewer data={processedData} rootPath={effectiveRootPath} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

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