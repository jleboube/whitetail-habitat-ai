// Fix: Define all necessary types for the application.
export interface LatLng {
  lat: number;
  lng: number;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Prediction {
  probability: number;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  image?: string;
  sources?: GroundingSource[];
  isError?: boolean;
  prediction?: Prediction;
}

// New types for the deer density layer
export interface DeerHotspot {
    lat: number;
    lng: number;
    weight: number; // Represents density, e.g., 1 to 5
}

export interface DeerCorridor {
    path: LatLng[];
}
