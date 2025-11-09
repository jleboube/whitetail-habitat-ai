import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, BrainCircuit } from 'lucide-react';

interface ChatInputProps {
    onSendMessage: (prompt: string, image?: string) => void;
    isLoading: boolean;
    isThinkingMode: boolean;
    setIsThinkingMode: (value: boolean) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, isThinkingMode, setIsThinkingMode }) => {
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSend = () => {
        if (isLoading || (!prompt.trim() && !image)) return;
        onSendMessage(prompt, image || undefined);
        setPrompt('');
        setImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="p-4 bg-gray-800 border-t border-gray-700">
            {image && (
                <div className="relative w-24 h-24 mb-2 rounded-lg overflow-hidden">
                    <img src={image} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                        onClick={() => setImage(null)}
                        className="absolute top-1 right-1 bg-gray-900 bg-opacity-70 rounded-full p-1 text-white hover:bg-opacity-90"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
            <div className="relative flex items-end bg-gray-700 rounded-lg p-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-green-400 disabled:opacity-50"
                    disabled={isLoading}
                >
                    <Paperclip size={20} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg"
                />
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Dr. Whitetail..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-40 p-2 text-gray-200 placeholder-gray-500"
                    rows={1}
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    className="p-2 text-gray-400 hover:text-green-400 disabled:opacity-50"
                    disabled={isLoading || (!prompt.trim() && !image)}
                >
                    <Send size={20} />
                </button>
            </div>
            <div className="flex items-center justify-end mt-2">
                 <label htmlFor="thinking-mode" className="flex items-center cursor-pointer">
                    <BrainCircuit size={16} className={`mr-2 ${isThinkingMode ? 'text-green-400' : 'text-gray-500'}`} />
                    <span className={`text-sm mr-2 ${isThinkingMode ? 'text-white' : 'text-gray-500'}`}>Advanced Analysis</span>
                    <div className="relative">
                        <input
                            type="checkbox"
                            id="thinking-mode"
                            className="sr-only"
                            checked={isThinkingMode}
                            onChange={(e) => setIsThinkingMode(e.target.checked)}
                            disabled={isLoading}
                        />
                        <div className={`block w-10 h-6 rounded-full ${isThinkingMode ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isThinkingMode ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                </label>
            </div>
        </div>
    );
};

export default ChatInput;
