import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { ChatMessage } from '../types';
import ChatInput from './ChatInput';
import Message from './Message';
import { BotMessageSquare, Loader } from 'lucide-react';
import { Provider } from '../config/providers';

interface ChatPanelProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (prompt: string, image?: string) => void;
    isThinkingMode: boolean;
    setIsThinkingMode: (value: boolean) => void;
    loadingMessage: string;
    onGetPrediction: (messageId: string, planText: string) => void;
    activeProvider: Provider;
    providerOptions: { value: Provider; label: string }[];
    onProviderChange: (provider: Provider) => void;
    activeSessionId: string;
    className?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    isLoading,
    onSendMessage,
    isThinkingMode,
    setIsThinkingMode,
    loadingMessage,
    onGetPrediction,
    activeProvider,
    providerOptions,
    onProviderChange,
    activeSessionId,
    className,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    return (
        <div className={clsx("flex flex-col bg-gray-800 border-gray-700", className)}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-900">
                <div className="flex items-center">
                    <BotMessageSquare className="text-green-400 mr-3" size={28} />
                    <h1 className="text-xl font-bold text-white">Whitetail Habitat AI</h1>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">AI Provider</span>
                    <select
                        value={activeProvider}
                        onChange={(e) => onProviderChange(e.target.value as Provider)}
                        className="bg-gray-800 border border-gray-600 text-gray-100 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        {providerOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {activeSessionId && (
                        <span className="text-xs text-gray-500 hidden lg:block">
                            Session: {activeSessionId.slice(0, 8)}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <Message key={msg.id} message={msg} onGetPrediction={onGetPrediction} isLoading={isLoading} />
                ))}
                 {isLoading && (
                    <div className="flex items-start space-x-3">
                         <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-800 flex items-center justify-center">
                            <BotMessageSquare className="text-green-300" size={20}/>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3 max-w-lg">
                           <div className="flex items-center space-x-2 text-gray-400 animate-pulse">
                               <Loader className="animate-spin" size={16}/>
                               <span>{loadingMessage || 'Dr. Whitetail is thinking...'}</span>
                           </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} isThinkingMode={isThinkingMode} setIsThinkingMode={setIsThinkingMode} />
        </div>
    );
};

export default ChatPanel;
