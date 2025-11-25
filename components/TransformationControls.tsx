import React from 'react';
import { Wand2, Download, Settings2 } from 'lucide-react';
import { TransformationConfig } from '../types';

interface TransformationControlsProps {
  config: TransformationConfig;
  onConfigChange: (config: TransformationConfig) => void;
  onAutoGenerate: () => void;
  onDownload: () => void;
  isAnalyzing: boolean;
  availableKeys: string[];
}

export const TransformationControls: React.FC<TransformationControlsProps> = ({
  config,
  onConfigChange,
  onAutoGenerate,
  onDownload,
  isAnalyzing,
  availableKeys,
}) => {
  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Settings2 size={18} /> Dropdown Configuration
        </h3>
        <button
          onClick={onAutoGenerate}
          disabled={isAnalyzing}
          className="text-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Wand2 size={14} />
          {isAnalyzing ? 'Analyzing...' : 'AI Auto-Detect'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Root Path (Array)</label>
          <input
            type="text"
            value={config.rootPath}
            onChange={(e) => onConfigChange({ ...config, rootPath: e.target.value })}
            placeholder="e.g. data.results or empty"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Label Key (Display Text)</label>
          <select
            value={config.labelKey}
            onChange={(e) => onConfigChange({ ...config, labelKey: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
          >
            <option value="">Select a key...</option>
            {availableKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Value Key (ID/Code)</label>
          <select
            value={config.valueKey}
            onChange={(e) => onConfigChange({ ...config, valueKey: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
          >
            <option value="">Select a key...</option>
            {availableKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <button
          onClick={onDownload}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-md font-medium transition-all active:scale-[0.98]"
        >
          <Download size={18} /> Download Dropdown JSON
        </button>
      </div>
    </div>
  );
};
