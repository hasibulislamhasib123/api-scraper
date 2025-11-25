// এই ফাইলটি Vercel সার্ভারে রান হবে, কেউ এটি দেখতে পাবে না।
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // CORS কনফিগারেশন (যাতে অন্য সাইট থেকে কেউ রিকোয়েস্ট না করতে পারে)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // প্রোডাকশনে '*' এর বদলে আপনার ডোমেইন দিন
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // সার্ভার সাইড এনভায়রনমেন্ট ভেরিয়েবল (VITE_ প্রিফিক্স লাগবে না)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server Configuration Error: API Key missing' });
  }

  const { action, payload } = req.body;
  const ai = new GoogleGenAI({ apiKey: apiKey });
  const model = "gemini-2.5-flash";

  try {
    let prompt = "";
    let responseSchema = null;

    // ১. অ্যানালাইসিস লজিক
    if (action === 'analyze') {
      prompt = `
        I have a JSON response from an API. I want to convert this data into a "Dropdown" list for a website (Label/Value pairs).
        Analyze the JSON structure.
        1. Identify the path to the main array of data (e.g., "", "data", "response.list").
        2. Suggest the best key to use as the "Label" (human readable text, like name, title).
        3. Suggest the best key to use as the "Value" (unique identifier, like id, code, slug).
        
        Here is a sample of the data (truncated):
        ${JSON.stringify(payload).slice(0, 5000)}
      `;
      responseSchema = {
        type: "OBJECT",
        properties: {
          rootPath: { type: "STRING" },
          labelKey: { type: "STRING" },
          valueKey: { type: "STRING" },
          reasoning: { type: "STRING" }
        }
      };
    } 
    // ২. চ্যাট লজিক
    else if (action === 'chat') {
      prompt = `
        You are a Data Assistant. The user is asking about this JSON data:
        ${JSON.stringify(payload.dataSample).slice(0, 3000)}

        User Query: "${payload.userQuery}"

        1. Answer the user's question naturally.
        2. If the user asks to "Show", "Filter", or "Find" specific items, generate a JavaScript arrow function string named 'filterFn' that takes an 'item' and returns boolean. Example: "item => item.district === 'Dhaka'".
        3. If the user asks to "Select" or "Use" specific keys for the dropdown, suggest a new TransformationConfig.
      `;
      responseSchema = {
        type: "OBJECT",
        properties: {
          reply: { type: "STRING" },
          filterCode: { type: "STRING", nullable: true },
          suggestedConfig: { 
            type: "OBJECT", 
            nullable: true,
            properties: {
              rootPath: { type: "STRING" },
              labelKey: { type: "STRING" },
              valueKey: { type: "STRING" }
            }
          }
        }
      };
    }
    // ৩. স্ক্যান লজিক
    else if (action === 'scan') {
      prompt = `
        Analyze the following text and extract potential API Endpoints.
        Text: ${payload.inputText.slice(0, 10000)}
        Return a list of found APIs.
      `;
      responseSchema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            url: { type: "STRING" },
            method: { type: "STRING" },
            confidence: { type: "STRING", enum: ["high", "medium", "low"] },
            description: { type: "STRING" }
          }
        }
      };
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Google AI কল করা
    const result = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const data = result.text ? JSON.parse(result.text) : null;
    return res.status(200).json(data);

  } catch (error) {
    console.error("AI Error:", error);
    return res.status(500).json({ error: 'Failed to process AI request' });
  }
}