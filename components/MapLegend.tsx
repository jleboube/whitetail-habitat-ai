import React from 'react';

interface MapLegendProps {
    isLayerVisible: boolean;
}

const MapLegend: React.FC<MapLegendProps> = ({ isLayerVisible }) => {
    if (!isLayerVisible) {
        return null;
    }

    return (
        <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-lg p-3 space-y-2 shadow-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Deer Density</h4>
            <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-300">Low</span>
                <div className="w-24 h-3 rounded-full bg-gradient-to-r from-blue-500/70 via-green-500/70 to-red-500/70"></div>
                <span className="text-xs text-gray-300">High</span>
            </div>
            <div className="flex items-center space-x-2 pt-2">
                 <div className="w-5 h-1 border-t-2 border-b-2 border-dashed border-orange-400"></div>
                 <span className="text-xs text-gray-300">Movement Corridor</span>
            </div>
        </div>
    );
};

export default MapLegend;
