import React from 'react';
import { Target, ShieldCheck, Info } from 'lucide-react';
import { ChatMessage } from '../types';

interface PredictionDisplayProps {
    prediction: NonNullable<ChatMessage['prediction']>;
}

const PredictionDisplay: React.FC<PredictionDisplayProps> = ({ prediction }) => {
    const { probability, confidence, reasoning } = prediction;

    const getConfidenceClass = () => {
        switch (confidence?.toLowerCase()) {
            case 'high':
                return 'bg-green-500 text-green-900';
            case 'medium':
                return 'bg-yellow-500 text-yellow-900';
            case 'low':
                return 'bg-red-500 text-red-900';
            default:
                return 'bg-gray-500 text-gray-900';
        }
    };

    return (
        <div className="space-y-3 text-sm">
            <h4 className="text-xs font-bold text-gray-400">Success Prediction</h4>
            <div className="flex items-center justify-between p-3 bg-gray-600/50 rounded-lg">
                <div className="flex items-center space-x-2">
                    <Target className="text-green-400" size={20} />
                    <span className="font-semibold text-gray-300">Probability:</span>
                </div>
                <span className="text-2xl font-bold text-white">{probability.toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-600/50 rounded-lg">
                <div className="flex items-center space-x-2">
                     <ShieldCheck className="text-blue-400" size={20} />
                    <span className="font-semibold text-gray-300">Confidence:</span>
                </div>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getConfidenceClass()}`}>
                    {confidence}
                </span>
            </div>
            <div className="p-3 bg-gray-600/50 rounded-lg">
                 <div className="flex items-center space-x-2 mb-2">
                    <Info className="text-gray-400" size={20} />
                    <span className="font-semibold text-gray-300">Reasoning:</span>
                </div>
                <p className="text-gray-400 italic">"{reasoning}"</p>
            </div>
        </div>
    );
};

export default PredictionDisplay;
