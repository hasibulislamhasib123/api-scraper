import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Sparkles, Filter, Loader2 } from 'lucide-react';
import { ChatMessage, TransformationConfig } from '../types';
import { chatWithData } from '../services/geminiService';

interface ChatDataAssistantProps {
  data: any;
  onFilterApply: (code: string) => void;
  onConfigApply: (config: TransformationConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatDataAssistant: React.FC<ChatDataAssistantProps> = ({
  data,
  onFilterApply,
  onConfigApply,
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I've given your data a cheeky scan. Ask me to filter it (e.g., \"Show schools from Barishal\") or ask for help picking a dropdown key — I'm your overly-enthusiastic data sidekick.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatWithData(userMsg.content, data);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.reply,
        timestamp: Date.now(),
        isAction: !!(result.filterCode || result.suggestedConfig)
      };

      setMessages(prev => [...prev, botMsg]);

      if (result.filterCode) {
        onFilterApply(result.filterCode);
      }
      if (result.suggestedConfig) {
        onConfigApply(result.suggestedConfig);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Oops — I'm having trouble chatting with the AI. Try again in a sec; I blame the internet gremlins.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col max-h-[600px] overflow-hidden animate-in slide-in-from-bottom-5">
      <div className="bg-gradient-to-r from-brand-600 to-purple-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <Sparkles size={18} />
          <h3 className="font-semibold">Data Assistant</h3>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'assistant' ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-600'
            }`}>
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`p-3 rounded-lg text-sm max-w-[80%] ${
              msg.role === 'user' 
                ? 'bg-brand-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
            }`}>
              {msg.content}
              {msg.isAction && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-xs font-semibold text-green-600">
                  <Filter size={12} />
                  <span>Action applied — abracadabra! (Data tweaked.)</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
               <Loader2 className="animate-spin" size={16} />
             </div>
             <div className="bg-white border border-slate-200 p-3 rounded-lg rounded-tl-none text-sm text-slate-500 italic">
               Stirring the data cauldron... 🥄
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a filter or question... (be a data whisperer!)"
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 top-1.5 p-1.5 bg-brand-600 text-white rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};