import React, { useState, useMemo } from 'react';
import { Table, Code, Eye } from 'lucide-react';

interface DataViewerProps {
  data: any;
  rootPath: string;
}

// Helper to get nested value by path
const getByPath = (obj: any, path: string) => {
  if (!path) return obj;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const DataViewer: React.FC<DataViewerProps> = ({ data, rootPath }) => {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  const arrayData = useMemo(() => {
    const extracted = getByPath(data, rootPath);
    return Array.isArray(extracted) ? extracted : [];
  }, [data, rootPath]);

  const columns = useMemo(() => {
    if (arrayData.length === 0) return [];
    // Get keys from first object, limit to first 10 for performance
    const keys = Object.keys(arrayData[0]);
    return keys.slice(0, 8); // Limit columns for display
  }, [arrayData]);

  if (!data) return null;

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 flex flex-col h-[500px]">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Eye size={18} /> Data Preview
          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {arrayData.length > 0 ? `${arrayData.length} items found` : 'Raw Object'}
          </span>
        </h3>
        <div className="flex bg-slate-100 p-1 rounded-md">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-sm rounded-md flex items-center gap-2 transition-colors ${
              viewMode === 'table' ? 'bg-white shadow-sm text-brand-600 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Table size={14} /> Table
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-3 py-1 text-sm rounded-md flex items-center gap-2 transition-colors ${
              viewMode === 'json' ? 'bg-white shadow-sm text-brand-600 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Code size={14} /> JSON
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-slate-50">
        {viewMode === 'table' ? (
          arrayData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold text-slate-600 border-b w-12">#</th>
                    {columns.map((col) => (
                      <th key={col} className="p-3 font-semibold text-slate-600 border-b">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {arrayData.slice(0, 100).map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 border-r">{idx + 1}</td>
                      {columns.map((col) => (
                        <td key={col} className="p-3 max-w-xs truncate text-slate-700">
                          {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {arrayData.length > 100 && (
                <div className="p-4 text-center text-slate-500 italic">
                  Showing first 100 rows of {arrayData.length}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p>No array found at current root path.</p>
              <p className="text-xs mt-2">Try changing the Root Path in transformation settings.</p>
            </div>
          )
        ) : (
          <pre className="text-xs font-mono text-slate-700 bg-white p-4 rounded shadow-sm overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
