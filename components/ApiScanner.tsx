import React, { useState } from 'react';
import { Search, Code2, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { scanForApis } from '../services/geminiService';
import { ApiDiscoveryResult } from '../types';

interface ApiScannerProps {
  onSelectApi: (url: string, method: string) => void;
}

export const ApiScanner: React.FC<ApiScannerProps> = ({ onSelectApi }) => {
  const [inputMode, setInputMode] = useState<'url' | 'text'>('text');
  const [inputText, setInputText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ApiDiscoveryResult[]>([]);

  const handleScan = async () => {
    if (!inputText) return;
    setIsScanning(true);
    try {
      const found = await scanForApis(inputText);
      setResults(found);
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
          <Code2 size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Reverse API Scanner</h2>
          <p className="text-sm text-slate-500">সোর্স কোড, CURL বা নেটওয়ার্ক লগ পেস্ট করুন API খুঁজে পেতে।</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setInputMode('text')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              inputMode === 'text' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Paste Code / CURL
          </button>
          <button
            onClick={() => setInputMode('url')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              inputMode === 'url' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Website URL
          </button>
        </div>

        {inputMode === 'url' && (
           <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 flex gap-2 text-sm text-yellow-800">
             <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
             <p>সরাসরি URL স্ক্যান ব্রাউজারের কারণে ব্লক হতে পারে (CORS)। সবচেয়ে ভালো ফলাফলের জন্য DevTools (Network Tab) থেকে CURL কপি করে "Paste Code" এ দিন।</p>
           </div>
        )}

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={inputMode === 'url' ? "https://example.com" : "curl 'https://api.example.com/v1/data' -H 'Authorization: Bearer...'"}
          className="w-full h-32 p-3 border border-slate-300 rounded-md font-mono text-xs focus:ring-2 focus:ring-orange-500 outline-none"
        />

        <button
          onClick={handleScan}
          disabled={isScanning || !inputText}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-md font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isScanning ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          {isScanning ? 'অ্যানালাইসিস হচ্ছে...' : 'API স্ক্যান করুন'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="font-semibold text-slate-700">পাওয়া গেছে ({results.length} টি)</h3>
          <div className="grid gap-3">
            {results.map((api, idx) => (
              <div key={idx} className="group border border-slate-200 rounded-lg p-3 hover:border-orange-300 transition-all bg-slate-50 hover:bg-white">
                <div className="flex justify-between items-start gap-3">
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        api.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {api.method || 'GET'}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{api.confidence} Confidence</span>
                    </div>
                    <p className="text-sm font-mono text-slate-700 truncate" title={api.url}>{api.url}</p>
                    {api.description && <p className="text-xs text-slate-500 mt-1">{api.description}</p>}
                  </div>
                  <button
                    onClick={() => onSelectApi(api.url, api.method || 'GET')}
                    className="shrink-0 bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 p-2 rounded-md transition-colors"
                    title="Use this API"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};