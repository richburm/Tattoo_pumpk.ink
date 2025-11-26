

export type TattooStyle = 'fine-line' | 'old-school' | 'neo-trad' | 'anime' | 'realism' | 'geometric' | 'planeart' | 'custom';

export interface StencilSettings {
  // Core Processing
  contrast: number;      // -100 to 100
  brightness: number;    // -100 to 100
  edgeIntensity: number; // 0 to 100
  thickness: number;     // 1 to 10
  detail: number;        // 0 to 100 (Threshold)
  smoothing: number;     // 0 to 10 (Blur)
  mode: 'edge' | 'threshold' | 'mixed'; 
  invert: boolean;
  flipX: boolean;
  lineColor: string;     
  
  // UI State
  activePreset: TattooStyle; 
  isAdvancedMode: boolean; // Toggle between "Tattooer Mode" (Simple) and Tech sliders
  showThermalWarnings: boolean; // Toggle problem zone overlay

  // Preview Settings
  overlayMode: boolean;   
  overlayOpacity: number; 
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  thumbnail: string; 
  fullImage: string; 
  settings: StencilSettings; 
  actionType: 'import' | 'ai-blueprint' | 'manual' | 'restore';
  description: string;
  isFavorite?: boolean;
}

export interface SegmentationResult {
  parts: string[]; // Base64 images
  originalParts?: string[]; // Base64 images of original
  rows: number;
  cols: number;
  zoneRecommendation?: string;
}

export type TabType = 'stencil' | 'planeart' | 'segmentation';
export type BoardMode = 'tabloid' | 'poster_2x2';

export interface SegmentationConfig {
  splitMode: 'vertical' | 'horizontal' | 'quadrant';
  parts: number;
  boardMode: BoardMode;
  setSplitMode: (m: 'vertical' | 'horizontal' | 'quadrant') => void;
  setParts: (n: number) => void;
  setBoardMode: (m: BoardMode) => void;
  onExportSegments: () => void;
  // New Manual Controls
  manualWidth: number;
  manualHeight: number;
  onManualResize: (w: number, h: number) => void;
  // Crop Controls
  isCropMode: boolean;
  toggleCropMode: () => void;
  onExportCrop: () => void;
}

export const DEFAULT_SETTINGS: StencilSettings = {
  contrast: 10,
  brightness: 0,
  edgeIntensity: 80,
  thickness: 2,
  detail: 30,
  smoothing: 2,
  mode: 'edge',
  invert: false,
  flipX: false,
  lineColor: '#000000',
  activePreset: 'custom',
  isAdvancedMode: false,
  showThermalWarnings: false,
  overlayMode: false,
  overlayOpacity: 50,
};