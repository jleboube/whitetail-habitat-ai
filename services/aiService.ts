import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { LatLng, GroundingSource, Prediction, DeerHotspot, DeerCorridor } from '../types';
import { readEnv } from '../utils/env';
import { Provider, DEFAULT_PROVIDER } from '../config/providers';

const SYSTEM_PROMPT = `You are Dr. Elias Whitetail, the world's foremost expert on whitetail deer habitat management. You provide professional, science-backed advice in a friendly, avuncular tone. Your goal is to help landowners create thriving deer habitats. Analyze user queries, including any provided images and location data, to give specific, actionable recommendations. Cite data sources when you rely on external research and respond in Markdown.`;

type ProviderModels = {
  fast: string;
  thinking: string;
};

const GEMINI_KEY = readEnv('REACT_APP_GEMINI_API_KEY') || readEnv('VITE_GEMINI_API_KEY') || readEnv('GEMINI_API_KEY') || readEnv('API_KEY');
const OPENAI_KEY = readEnv('REACT_APP_OPENAI_API_KEY') || readEnv('VITE_OPENAI_API_KEY') || readEnv('OPENAI_API_KEY');
const CLAUDE_KEY = readEnv('REACT_APP_ANTHROPIC_API_KEY') || readEnv('VITE_ANTHROPIC_API_KEY') || readEnv('ANTHROPIC_API_KEY');

const OPENAI_MODELS: ProviderModels = {
  fast: readEnv('REACT_APP_OPENAI_MODEL') || readEnv('VITE_OPENAI_MODEL') || readEnv('OPENAI_MODEL') || 'gpt-4o-mini',
  thinking:
    readEnv('REACT_APP_OPENAI_MODEL_THINKING') ||
    readEnv('VITE_OPENAI_MODEL_THINKING') ||
    readEnv('OPENAI_MODEL_THINKING') ||
    'gpt-4o',
};

const CLAUDE_MODELS: ProviderModels = {
  fast:
    readEnv('REACT_APP_ANTHROPIC_MODEL') ||
    readEnv('VITE_ANTHROPIC_MODEL') ||
    readEnv('ANTHROPIC_MODEL') ||
    'claude-3-5-sonnet-20241022',
  thinking:
    readEnv('REACT_APP_ANTHROPIC_MODEL_THINKING') ||
    readEnv('VITE_ANTHROPIC_MODEL_THINKING') ||
    readEnv('ANTHROPIC_MODEL_THINKING') ||
    'claude-3-5-sonnet-20241022',
};

const LOCATION_TEMPLATE = (location: LatLng | null) =>
  location
    ? `The landowner is currently near latitude ${location.lat.toFixed(4)} and longitude ${location.lng.toFixed(4)}.`
    : 'The landowner did not share their location.';

const buildUserContext = (location: LatLng | null) =>
  `${SYSTEM_PROMPT}\n${LOCATION_TEMPLATE(location)}\nBe concise but thorough.`;

const parseBase64Image = (base64Data?: string) => {
  if (!base64Data) return null;
  const match = base64Data.match(/^data:(image\/[^;]+);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid base64 image data. Expected a data URL.');
  }
  return {
    mimeType: match[1],
    data: match[2],
  };
};

let geminiClient: GoogleGenAI | null = null;

const getGeminiClient = () => {
  if (!geminiClient) {
    if (!GEMINI_KEY) {
      throw new Error('Missing Gemini API key. Provide GEMINI_API_KEY or REACT_APP_GEMINI_API_KEY.');
    }
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_KEY });
  }
  return geminiClient;
};

const base64ToGenerativePart = (base64Data: string) => {
  const parsed = parseBase64Image(base64Data);
  if (!parsed) {
    throw new Error('Image payload missing when building Gemini request.');
  }
  return {
    inlineData: {
      data: parsed.data,
      mimeType: parsed.mimeType,
    },
  };
};

const getProviderModels = (provider: Provider, isThinkingMode: boolean): { model: string; provider: Provider } => {
  switch (provider) {
    case 'openai':
      return { model: isThinkingMode ? OPENAI_MODELS.thinking : OPENAI_MODELS.fast, provider: 'openai' };
    case 'claude':
      return { model: isThinkingMode ? CLAUDE_MODELS.thinking : CLAUDE_MODELS.fast, provider: 'claude' };
    default:
      return { model: isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash', provider: 'gemini' };
  }
};

const normalizePrediction = (input: Prediction): Prediction => {
  if (typeof input.probability !== 'number' || typeof input.reasoning !== 'string' || typeof input.confidence !== 'string') {
    throw new Error('Model returned an invalid prediction payload.');
  }
  const confidence = input.confidence.toLowerCase();
  let normalized: Prediction['confidence'] = 'Medium';
  if (confidence === 'high' || confidence === 'medium' || confidence === 'low') {
    normalized = confidence.charAt(0).toUpperCase() + confidence.slice(1) as Prediction['confidence'];
  }
  return { ...input, confidence: normalized };
};

const extractGeminiSources = (response: GenerateContentResponse): GroundingSource[] => {
  const metadata = response.candidates?.[0]?.groundingMetadata;
  if (!metadata?.groundingChunks) return [];
  return metadata.groundingChunks
    .map((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        return { uri: chunk.web.uri, title: chunk.web.title } as GroundingSource;
      }
      if (chunk.maps?.uri && chunk.maps?.title) {
        return { uri: chunk.maps.uri, title: chunk.maps.title } as GroundingSource;
      }
      return null;
    })
    .filter((source): source is GroundingSource => Boolean(source));
};

const safeJsonParse = <T>(text: string): T => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Model returned an empty response.');
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    throw new Error('Model returned an unexpected format.');
  }
};

const collectAnthropicText = (content: Array<{ type: string; text?: string }>) =>
  content
    .filter((item) => item.type === 'text' && item.text)
    .map((item) => item.text)
    .join('\n');

const toOpenAIContent = (prompt: string, image?: string) => {
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  if (prompt) {
    content.push({ type: 'text', text: prompt });
  }
  if (image) {
    content.push({ type: 'input_image', image_url: { url: image } });
  }
  return content;
};

const toAnthropicContent = (prompt: string, image?: string) => {
  const content: any[] = [];
  if (prompt) {
    content.push({ type: 'text', text: prompt });
  }
  if (image) {
    const parsed = parseBase64Image(image);
    if (!parsed) {
      throw new Error('Invalid image payload for Claude.');
    }
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: parsed.mimeType, data: parsed.data },
    });
  }
  return content;
};

const callOpenAI = async <T>(body: Record<string, unknown>): Promise<T> => {
  if (!OPENAI_KEY) {
    throw new Error('Missing OpenAI API key. Provide OPENAI_API_KEY or REACT_APP_OPENAI_API_KEY.');
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }
  return (await response.json()) as T;
};

const callAnthropic = async <T>(body: Record<string, unknown>): Promise<T> => {
  if (!CLAUDE_KEY) {
    throw new Error('Missing Anthropic API key. Provide ANTHROPIC_API_KEY or REACT_APP_ANTHROPIC_API_KEY.');
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic request failed: ${errorText}`);
  }
  return (await response.json()) as T;
};

export const generateResponse = async ({
  prompt,
  image,
  isThinkingMode,
  location,
  setLoadingMessage,
  provider = DEFAULT_PROVIDER,
}: {
  prompt: string;
  image?: string;
  isThinkingMode: boolean;
  location: LatLng | null;
  setLoadingMessage: (message: string) => void;
  provider?: Provider;
}): Promise<{ text: string; sources: GroundingSource[] }> => {
  const providerToUse = provider ?? DEFAULT_PROVIDER;
  const { model } = getProviderModels(providerToUse, isThinkingMode);
  switch (providerToUse) {
    case 'openai':
      setLoadingMessage('Consulting forestry models with OpenAI...');
      return generateWithOpenAI({ prompt, image, model, location });
    case 'claude':
      setLoadingMessage('Consulting the Anthropic field notes...');
      return generateWithAnthropic({ prompt, image, model, location, isThinkingMode });
    default:
      setLoadingMessage('Consulting field guides...');
      return generateWithGemini({ prompt, image, model, location, isThinkingMode, setLoadingMessage });
  }
};

const generateWithGemini = async ({
  prompt,
  image,
  model,
  location,
  isThinkingMode,
  setLoadingMessage,
}: {
  prompt: string;
  image?: string;
  model: string;
  location: LatLng | null;
  isThinkingMode: boolean;
  setLoadingMessage: (message: string) => void;
}) => {
  const parts: any[] = [];
  if (image) {
    parts.push(base64ToGenerativePart(image));
  }
  if (prompt) {
    parts.push({ text: prompt });
  }
  if (location) {
    parts.unshift({ text: LOCATION_TEMPLATE(location) });
  }
  if (!parts.length) {
    return { text: 'Please share a prompt or upload an image.', sources: [] };
  }

  const client = getGeminiClient();
  const config: any = {
    tools: [{ googleSearch: {} }],
    systemInstruction: SYSTEM_PROMPT,
  };
  if (isThinkingMode) {
    setLoadingMessage('Performing advanced analysis...');
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const response = await client.models.generateContent({
    model,
    contents: { parts },
    config,
  });

  setLoadingMessage('Formatting recommendations...');
  return { text: response.text, sources: extractGeminiSources(response) };
};

const generateWithOpenAI = async ({
  prompt,
  image,
  model,
  location,
}: {
  prompt: string;
  image?: string;
  model: string;
  location: LatLng | null;
}) => {
  const messages: Array<{ role: string; content: any }> = [
    { role: 'system', content: buildUserContext(location) },
  ];
  messages.push({ role: 'user', content: toOpenAIContent(prompt, image) });

  const data = await callOpenAI<any>({
    model,
    temperature: 0.4,
    messages,
  });

  const choice = data.choices?.[0]?.message?.content;
  const text = Array.isArray(choice) ? choice.map((part: any) => part.text || '').join('\n') : choice || '';
  return { text, sources: [] };
};

const generateWithAnthropic = async ({
  prompt,
  image,
  model,
  location,
  isThinkingMode,
}: {
  prompt: string;
  image?: string;
  model: string;
  location: LatLng | null;
  isThinkingMode: boolean;
}) => {
  const body = {
    model,
    max_tokens: 4096,
    temperature: 0.4,
    system: buildUserContext(location),
    thinking: isThinkingMode ? { enabled: true, budget_tokens: 2048 } : undefined,
    messages: [
      {
        role: 'user',
        content: toAnthropicContent(prompt, image),
      },
    ],
  };

  const data = await callAnthropic<any>(body);
  const text = collectAnthropicText(data.content || []);
  return { text, sources: [] };
};

export const getSuccessPrediction = async (
  planText: string,
  location: LatLng | null,
  provider: Provider = DEFAULT_PROVIDER
): Promise<Prediction> => {
  const { model } = getProviderModels(provider, true);
  const prompt = `Analyze the following habitat management plan and predict its success rate for achieving trophy buck goals. ${LOCATION_TEMPLATE(location)}\nPlan:\n${planText}\nRespond with JSON: {\n  "probability": number (0-100),\n  "confidence": "High" | "Medium" | "Low",\n  "reasoning": string\n}`;

  switch (provider) {
    case 'openai': {
      const data = await callOpenAI<any>({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return valid JSON that matches the required schema.' },
          { role: 'user', content: [{ type: 'text', text: prompt }] },
        ],
      });
      const text = data.choices?.[0]?.message?.content || '';
      return normalizePrediction(safeJsonParse<Prediction>(text));
    }
    case 'claude': {
      const data = await callAnthropic<any>({
        model,
        max_tokens: 1024,
        temperature: 0.2,
        system: 'Return only valid JSON that matches the required schema.',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
        ],
      });
      const text = collectAnthropicText(data.content || []);
      return normalizePrediction(safeJsonParse<Prediction>(text));
    }
    default: {
      const client = getGeminiClient();
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          probability: { type: Type.NUMBER },
          confidence: { type: Type.STRING },
          reasoning: { type: Type.STRING },
        },
        required: ['probability', 'confidence', 'reasoning'],
      };
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });
      return normalizePrediction(safeJsonParse<Prediction>(response.text));
    }
  }
};

export const getDeerDensityData = async (
  bounds: { north: number; south: number; east: number; west: number },
  provider: Provider = DEFAULT_PROVIDER
): Promise<{ hotspots: DeerHotspot[]; corridors: DeerCorridor[] }> => {
  const { model } = getProviderModels(provider, true);
  const prompt = `Act as a wildlife GIS analyst. Based on the provided geographical map boundaries, generate a plausible dataset for whitetail deer population density hotspots and common movement corridors. Return JSON with the shape { "hotspots": [{ "lat": number, "lng": number, "weight": 1-5 }], "corridors": [{ "path": [{ "lat": number, "lng": number }] }] }. The map boundaries are: North=${bounds.north}, South=${bounds.south}, East=${bounds.east}, West=${bounds.west}. Create between 5-15 hotspots and 2-5 corridors.`;

  try {
    switch (provider) {
      case 'openai': {
        const data = await callOpenAI<any>({
          model,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Return only valid JSON that matches the requested schema.' },
            { role: 'user', content: [{ type: 'text', text: prompt }] },
          ],
        });
        return safeJsonParse<{ hotspots: DeerHotspot[]; corridors: DeerCorridor[] }>(data.choices?.[0]?.message?.content || '');
      }
      case 'claude': {
        const data = await callAnthropic<any>({
          model,
          max_tokens: 2048,
          temperature: 0.3,
          system: 'Return only valid JSON that matches the requested schema.',
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: prompt }],
            },
          ],
        });
        return safeJsonParse<{ hotspots: DeerHotspot[]; corridors: DeerCorridor[] }>(collectAnthropicText(data.content || []));
      }
      default: {
        const client = getGeminiClient();
        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            hotspots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  weight: { type: Type.NUMBER },
                },
                required: ['lat', 'lng', 'weight'],
              },
            },
            corridors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  path: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER },
                      },
                      required: ['lat', 'lng'],
                    },
                  },
                },
                required: ['path'],
              },
            },
          },
          required: ['hotspots', 'corridors'],
        };
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
        return safeJsonParse<{ hotspots: DeerHotspot[]; corridors: DeerCorridor[] }>(response.text);
      }
    }
  } catch (error) {
    console.error('Failed to fetch deer density data:', error);
    return { hotspots: [], corridors: [] };
  }
};
