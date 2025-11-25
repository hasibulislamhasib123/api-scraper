import { GoogleGenAI, Type } from "@google/genai";

// Vercel/Vite এ এনভায়রনমেন্ট ভেরিয়েবল এভাবে এক্সেস করতে হয়
// লোকাল এবং প্রোডাকশন দুই জায়গাতেই এটি কাজ করবে
const apiKey = import.meta.env.VITE_API_KEY || ""; 

const ai = new GoogleGenAI({ apiKey: apiKey });
const modelName = "gemini-2.5-flash";

// Helper for type safety
interface TransformationResult {
  rootPath: string;
  labelKey: string;
  valueKey: string;
  reasoning: string;
}

export const analyzeDataStructure = async (
  sampleData: any
): Promise<TransformationResult> => {
  if (!apiKey) {
    return { rootPath: "", labelKey: "", valueKey: "", reasoning: "API Key Missing! Please add VITE_API_KEY in Vercel settings." };
  }

  const prompt = `
    I have a JSON response. Suggest the best keys for a Dropdown (Label/Value).
    
    Data Sample (truncated):
    ${JSON.stringify(sampleData).slice(0, 3000)}
    
    Return JSON with: rootPath (path to array), labelKey, valueKey, reasoning.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootPath: { type: Type.STRING },
            labelKey: { type: Type.STRING },
            valueKey: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });
    return response.text ? JSON.parse(response.text) : { rootPath: "", labelKey: "", valueKey: "", reasoning: "AI response empty" };
  } catch (error) {
    console.error("Analysis failed", error);
    return { rootPath: "", labelKey: "", valueKey: "", reasoning: "AI Service Error" };
  }
};

export const chatWithData = async (
  userQuery: string,
  dataSample: any
): Promise<{ 
  reply: string; 
  filterCode?: string; 
  suggestedConfig?: { rootPath: string; labelKey: string; valueKey: string } 
}> => {
  if (!apiKey) {
    return { reply: "API Key is missing. Please configure VITE_API_KEY in Vercel." };
  }

  const prompt = `
    You are a Data Assistant. The user is asking about this JSON data:
    ${JSON.stringify(dataSample).slice(0, 3000)}

    User Query: "${userQuery}"

    1. Answer the user's question naturally.
    2. If the user asks to "Show", "Filter", or "Find" specific items, generate a JavaScript arrow function string named 'filterFn' that takes an 'item' and returns boolean. Example: "item => item.district === 'Dhaka'".
    3. If the user asks to "Select" or "Use" specific keys for the dropdown, suggest a new TransformationConfig.

    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            filterCode: { type: Type.STRING, nullable: true },
            suggestedConfig: { 
              type: Type.OBJECT, 
              nullable: true,
              properties: {
                rootPath: { type: Type.STRING },
                labelKey: { type: Type.STRING },
                valueKey: { type: Type.STRING }
              }
            }
          }
        }
      }
    });
    return response.text ? JSON.parse(response.text) : { reply: "I couldn't process that." };
  } catch (error) {
    return { reply: "Sorry, I encountered an error analyzing the data." };
  }
};

export const scanForApis = async (
  inputText: string
): Promise<ApiDiscoveryResult[]> => {
  if (!apiKey) return [];

  const prompt = `
    Analyze the following text (which could be Source Code, CURL command, or Network Logs) and extract potential API Endpoints.
    
    Text:
    ${inputText.slice(0, 10000)}

    Return a list of found APIs. Guess the method (GET/POST) based on context.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              url: { type: Type.STRING },
              method: { type: Type.STRING },
              confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
              description: { type: Type.STRING }
            }
          }
        }
      }
    });
    
    const data = response.text ? JSON.parse(response.text) : [];
    return data.map((item: any) => ({
      url: item.url,
      method: item.method,
      confidence: item.confidence as 'high' | 'medium' | 'low',
      description: item.description
    }));

  } catch (error) {
    return [];
  }
};

import { ApiDiscoveryResult } from "../types";