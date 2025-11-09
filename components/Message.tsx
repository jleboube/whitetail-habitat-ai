import React from 'react';
import ReactMarkdown from 'react-markdown';
import { BotMessageSquare, User, AlertTriangle, Link as LinkIcon, BrainCircuit } from 'lucide-react';
import { ChatMessage } from '../types';
import PredictionDisplay from './PredictionDisplay';

interface MessageProps {
    message: ChatMessage;
    onGetPrediction: (messageId: string, planText: string) => void;
    isLoading: boolean;
}

const Message: React.FC<MessageProps> = ({ message, onGetPrediction, isLoading }) => {
    const { id, role, text, image, sources, isError, prediction } = message;
    const isUser = role === 'user';
    const isSystem = role === 'system';

    if (isSystem) {
        return (
            <div className="flex items-center justify-center my-2">
                <div className={`flex items-center text-sm px-3 py-1 rounded-full ${isError ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>
                    <AlertTriangle size={16} className="mr-2" />
                    <span>{text}</span>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
             <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-800' : 'bg-green-800'}`}>
                {isUser ? <User className="text-blue-300" size={20}/> : <BotMessageSquare className="text-green-300" size={20}/>}
            </div>
            <div className={`p-3 rounded-lg max-w-lg ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                {image && <img src={image} alt="user upload" className="rounded-lg mb-2 max-w-xs" />}
                <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                        components={{
                            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline"/>
                        }}
                    >
                        {text}
                    </ReactMarkdown>
                </div>

                {role === 'model' && !isError && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                        {prediction ? (
                            <PredictionDisplay prediction={prediction} />
                        ) : (
                            <button
                                onClick={() => onGetPrediction(id, text)}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                            >
                                <BrainCircuit size={16} className="mr-2" />
                                Predict Success Rate
                            </button>
                        )}
                    </div>
                )}
                
                {sources && sources.length > 0 && (
                     <div className="mt-3 pt-3 border-t border-gray-600">
                        <h4 className="text-xs font-bold text-gray-400 mb-2">Sources:</h4>
                        <ul className="space-y-1">
                            {sources.map((source, index) => (
                                <li key={index} className="flex items-center">
                                    <LinkIcon size={12} className="mr-2 text-gray-500"/>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline truncate">
                                        {source.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Message;
