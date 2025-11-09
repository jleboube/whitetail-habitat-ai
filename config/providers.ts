import { readEnv } from '../utils/env';

export type Provider = 'gemini' | 'openai' | 'claude';

const ALL_PROVIDERS: Provider[] = ['gemini', 'openai', 'claude'];

const isProvider = (value: string): value is Provider => {
  return ALL_PROVIDERS.includes(value as Provider);
};

const parseProviderList = (value?: string | null): Provider[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part): part is Provider => isProvider(part));
};

const providersFromEnv =
  parseProviderList(readEnv('VITE_AI_PROVIDERS') || readEnv('REACT_APP_AI_PROVIDERS')) || [];

export const AVAILABLE_PROVIDERS: Provider[] = providersFromEnv.length ? providersFromEnv : ALL_PROVIDERS;

const defaultCandidate =
  (readEnv('REACT_APP_AI_PROVIDER') || readEnv('VITE_AI_PROVIDER') || readEnv('AI_PROVIDER') || AVAILABLE_PROVIDERS[0])?.toLowerCase();

export const DEFAULT_PROVIDER: Provider = defaultCandidate && isProvider(defaultCandidate)
  ? (defaultCandidate as Provider)
  : AVAILABLE_PROVIDERS[0];

export const getProviderLabel = (provider: Provider): string => {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'claude':
      return 'Anthropic Claude';
    default:
      return 'Google Gemini';
  }
};
