import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import ChatPanel from './components/ChatPanel';
import MapPanel from './components/MapPanel';
import { useGeolocation } from './hooks/useGeolocation';
import { generateResponse, getSuccessPrediction } from './services/aiService';
import { DEFAULT_PROVIDER, AVAILABLE_PROVIDERS, getProviderLabel, Provider } from './config/providers';
import { ChatMessage } from './types';
import { useJsApiLoader } from '@react-google-maps/api';
import { readEnv } from './utils/env';
import { buildPropertyContextFromPrompt } from './services/mapsService';

const MAP_LIBRARIES = ['visualization'] as const;

const createSessionId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const buildWelcomeMessages = (location: { lat: number; lng: number } | null, locationError: string | null): ChatMessage[] => {
    const welcomeMessage: ChatMessage = {
        id: `${Date.now()}`,
        role: 'model',
        text: `Dr. Elias Whitetail speaking. I see you're located near these coordinates: ${location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'an unknown location'}. I will automatically analyze the climate and soil data for your specific location to provide the best advice. Tell me your property size, current cover (woods, CRP, row crops), and your goals (trophy bucks, herd health, bow-hunting, etc.). You can also upload a photo of your property for analysis.`,
    };
    const messages = [welcomeMessage];
    if (locationError) {
        messages.push({
            id: `${Date.now() + 1}`,
            role: 'system',
            text: `Location Error: ${locationError}. I'll still provide general advice, but for site-specific plans, location data is crucial.`,
            isError: true,
        });
    }
    return messages;
};

interface ProviderChatState {
    sessionId: string;
    messages: ChatMessage[];
}

const App: React.FC = () => {
    const { location, error: locationError } = useGeolocation();
    const [activeProvider, setActiveProvider] = useState<Provider>(DEFAULT_PROVIDER);
    const [providerChats, setProviderChats] = useState<Record<Provider, ProviderChatState>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isThinkingMode, setIsThinkingMode] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [mobilePanel, setMobilePanel] = useState<'chat' | 'map'>('chat');
    
    const googleMapsApiKey =
        readEnv('REACT_APP_GOOGLE_MAPS_API_KEY') ||
        readEnv('VITE_GOOGLE_MAPS_API_KEY') ||
        readEnv('GOOGLE_MAPS_API_KEY') ||
        '';

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: googleMapsApiKey,
        libraries: MAP_LIBRARIES, // HeatmapLayer requires the visualization library
    });

    const currentChat = providerChats[activeProvider];
    const messages = currentChat?.messages ?? [];
    const activeSessionId = currentChat?.sessionId ?? '';

    const updateCurrentProviderMessages = useCallback(
        (updater: (existing: ChatMessage[]) => ChatMessage[]) => {
            setProviderChats(prev => {
                const existing = prev[activeProvider] || {
                    sessionId: createSessionId(),
                    messages: buildWelcomeMessages(location, locationError || null),
                };
                return {
                    ...prev,
                    [activeProvider]: {
                        ...existing,
                        messages: updater(existing.messages),
                    },
                };
            });
        },
        [activeProvider, location, locationError]
    );

    const handleProviderChange = useCallback(
        (nextProvider: Provider) => {
            if (nextProvider === activeProvider) return;
            const confirmed = window.confirm(
                'Any data entered previously will be lost. Switching AI providers is fine, but understand your data with the previous AI will not carry over.'
            );
            if (!confirmed) return;
            setActiveProvider(nextProvider);
        },
        [activeProvider]
    );

    useEffect(() => {
        setProviderChats(prev => {
            if (prev[activeProvider]) {
                return prev;
            }
            return {
                ...prev,
                [activeProvider]: {
                    sessionId: createSessionId(),
                    messages: buildWelcomeMessages(location, locationError || null),
                },
            };
        });
    }, [activeProvider, location, locationError]);

    const handleSendMessage = useCallback(async (prompt: string, image?: string) => {
        if (!prompt.trim() && !image) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: prompt,
            image,
        };
        updateCurrentProviderMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setLoadingMessage('Dr. Whitetail is thinking...');

        try {
            const propertyContext = await buildPropertyContextFromPrompt(prompt);
            const augmentedPrompt = propertyContext ? `${prompt}\n\n${propertyContext}` : prompt;
            const response = await generateResponse({
                prompt: augmentedPrompt,
                image,
                isThinkingMode,
                location,
                setLoadingMessage,
                provider: activeProvider,
            });

            const modelMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text,
                sources: response.sources,
            };
            updateCurrentProviderMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Error generating response:", error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "I seem to be having trouble connecting to my field notes right now. Please try again in a moment.",
                isError: true,
            };
            updateCurrentProviderMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [activeProvider, isThinkingMode, location, updateCurrentProviderMessages]);
    
    const handleGetPrediction = useCallback(async (messageId: string, planText: string) => {
        setIsLoading(true);
        setLoadingMessage('Calculating success probability...');
        try {
            const prediction = await getSuccessPrediction(planText, location, activeProvider);
            updateCurrentProviderMessages(prev =>
                prev.map(msg =>
                    msg.id === messageId ? { ...msg, prediction } : msg
                )
            );
        } catch (error) {
             console.error("Error generating prediction:", error);
             const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'system',
                text: "The prediction analysis failed. Please try again.",
                isError: true,
            };
            updateCurrentProviderMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [activeProvider, location, updateCurrentProviderMessages]);

    const providerOptions = AVAILABLE_PROVIDERS.map(value => ({
        value,
        label: getProviderLabel(value),
    }));

    return (
        <div className="flex flex-col md:flex-row h-screen w-screen bg-gray-900 text-gray-200 font-sans">
            <div className="md:hidden flex border-b border-gray-800">
                <button
                    className={clsx(
                        'flex-1 py-3 text-center text-sm font-semibold',
                        mobilePanel === 'chat' ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-400'
                    )}
                    onClick={() => setMobilePanel('chat')}
                >
                    Chat
                </button>
                <button
                    className={clsx(
                        'flex-1 py-3 text-center text-sm font-semibold',
                        mobilePanel === 'map' ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-400'
                    )}
                    onClick={() => setMobilePanel('map')}
                >
                    Map
                </button>
            </div>
            <ChatPanel
                messages={messages}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                isThinkingMode={isThinkingMode}
                setIsThinkingMode={setIsThinkingMode}
                loadingMessage={loadingMessage}
                onGetPrediction={handleGetPrediction}
                activeProvider={activeProvider}
                providerOptions={providerOptions}
                onProviderChange={handleProviderChange}
                activeSessionId={activeSessionId}
                className={clsx(
                    'w-full md:w-1/3 h-full border-b md:border-b-0 md:border-r',
                    mobilePanel === 'map' ? 'hidden md:flex' : 'flex'
                )}
            />
            <MapPanel 
                location={location} 
                isLoaded={isLoaded} 
                loadError={loadError}
                provider={activeProvider}
                className={clsx(
                    'w-full md:w-2/3 h-full',
                    mobilePanel === 'chat' ? 'hidden md:flex' : 'flex'
                )}
            />
        </div>
    );
};

export default App;
