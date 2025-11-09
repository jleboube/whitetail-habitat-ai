import React from 'react';
import { Layers, ZoomIn, ZoomOut, Compass, Loader } from 'lucide-react';

interface MapControlsProps {
    onToggleLayer: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRecenter: () => void;
    isLayerVisible: boolean;
    isLoading: boolean;
}

const MapControls: React.FC<MapControlsProps> = ({
    onToggleLayer,
    onZoomIn,
    onZoomOut,
    onRecenter,
    isLayerVisible,
    isLoading
}) => {
    return (
        <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-lg p-2 space-y-2 shadow-lg flex flex-col items-center">
            <button
                onClick={onToggleLayer}
                className={`w-10 h-10 flex items-center justify-center p-2 text-gray-300 hover:bg-gray-700 rounded-md transition-colors ${isLayerVisible ? 'bg-green-600 text-white' : ''}`}
                title={isLayerVisible ? 'Hide Deer Layer' : 'Show Deer Layer'}
            >
                {isLoading ? <Loader size={20} className="animate-spin" /> : <Layers size={20} />}
            </button>
            <div className="bg-gray-700 rounded-md">
                <button onClick={onZoomIn} className="w-10 h-10 flex items-center justify-center p-2 text-gray-300 hover:bg-gray-600 rounded-t-md transition-colors" title="Zoom In">
                    <ZoomIn size={20} />
                </button>
                <div className="h-px bg-gray-600"></div>
                <button onClick={onZoomOut} className="w-10 h-10 flex items-center justify-center p-2 text-gray-300 hover:bg-gray-600 rounded-b-md transition-colors" title="Zoom Out">
                    <ZoomOut size={20} />
                </button>
            </div>
            <button onClick={onRecenter} className="w-10 h-10 flex items-center justify-center p-2 text-gray-300 hover:bg-gray-700 rounded-md transition-colors" title="Recenter">
                <Compass size={20} />
            </button>
        </div>
    );
};

export default MapControls;
