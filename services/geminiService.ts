import { TransformationConfig, ApiDiscoveryResult } from "../types";

// এখন আর এখানে GoogleGenAI ইম্পোর্ট করার দরকার নেই
// আমরা আমাদের নিজস্ব সিকিউর ব্যাকএন্ড এপিআই কল করব

interface TransformationResult {
  rootPath: string;
  labelKey: string;
  valueKey: string;
  reasoning: string;
}

/**
 * Helper function to call our serverless backend
 */
const callSecureApi = async (action: string, payload: any) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Secure API Call Failed:", error);
    throw error;
  }
};

export const analyzeDataStructure = async (
  sampleData: any
): Promise<TransformationResult> => {
  try {
    return await callSecureApi('analyze', sampleData);
  } catch (e) {
    return { rootPath: "", labelKey: "", valueKey: "", reasoning: "Failed to connect to secure server." };
  }
};

export const chatWithData = async (
  userQuery: string,
  dataSample: any
): Promise<{ 
  reply: string; 
  filterCode?: string; 
  suggestedConfig?: TransformationConfig 
}> => {
  try {
    return await callSecureApi('chat', { userQuery, dataSample });
  } catch (e) {
    return { reply: "Error connecting to AI assistant." };
  }
};

export const scanForApis = async (
  inputText: string
): Promise<ApiDiscoveryResult[]> => {
  try {
    // API response is already formatted as ApiDiscoveryResult[]
    return await callSecureApi('scan', { inputText });
  } catch (e) {
    return [];
  }
};