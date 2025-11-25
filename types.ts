export interface DropdownItem {
  label: string;
  value: string | number;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiConfig {
  url: string;
  method: 'GET' | 'POST';
  headers: string; // JSON string
  body?: string; // For POST requests
}

export interface TransformationConfig {
  rootPath: string; // Dot notation path to array
  labelKey: string;
  valueKey: string;
}

// New types for chat and scanner
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isAction?: boolean; 
}

export interface ApiDiscoveryResult {
  url: string;
  method: string;
  confidence: 'high' | 'medium' | 'low';
  description?: string;
}