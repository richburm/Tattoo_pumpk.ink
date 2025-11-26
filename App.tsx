import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PreviewArea } from './components/PreviewArea';
import { PlaneArtArea } from './components/PlaneArtArea';
import { SegmentationBoard } from './components/SegmentationBoard';
import { HistoryPanel } from './components/HistoryPanel';
import { StencilSettings, DEFAULT_SETTINGS, HistoryItem, TattooStyle, TabType, BoardMode } from './types';
import { processStencil } from './utils/imageProcessing';
import { generateImageEdit, generateTattooBlueprint, generatePlaneArt } from './utils/gemini';
import { Download, X, Star, Check, ArrowLeft, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('stencil');

  // Stencil State
  const [settings, setSettings] = useState<StencilSettings>(DEFAULT_SETTINGS);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // AI State
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  // Layout State
  const [isMobile, setIsMobile] = useState(false);
  
  // Blueprint Modal
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [blueprintResult, setBlueprintResult] = useState<string | null>(null);
  const [blueprintSlider, setBlueprintSlider] = useState(50);
  const [preBlueprintImage, setPreBlueprintImage] = useState<string | null>(null);

  // PlaneArt
  const [planeArtResult, setPlaneArtResult] = useState<string | null>(null);

  // Segmentation State
  const [segSplitMode, setSegSplitMode] = useState<'vertical' | 'horizontal' | 'quadrant'>('vertical');
  const [segParts, setSegParts] = useState(2);
  const [segBoardMode, setSegBoardMode] = useState<BoardMode>('tabloid');
  const [triggerSegExport, setTriggerSegExport] = useState(false);
  const [segManualSize, setSegManualSize] = useState<{w:number, h:number} | null>(null);
  const [segCurrentDim, setSegCurrentDim] = useState({w:0, h:0});
  const [segIsCropMode, setSegIsCropMode] = useState(false);
  const [triggerCropExport, setTriggerCropExport] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thermalRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateSetting = (key: keyof StencilSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    if (activeTab === 'stencil') {
        setSettings(prev => ({ ...DEFAULT_SETTINGS, mode: prev.mode, lineColor: prev.lineColor }));
    } else {
        setPlaneArtResult(null);
    }
  };

  // --- HISTORY ---
  const createThumbnail = (imgSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement('canvas');
        const scale = 100 / Math.max(img.width, img.height);
        cvs.width = img.width * scale;
        cvs.height = img.height * scale;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
          resolve(cvs.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(imgSrc); 
        }
      };
      img.src = imgSrc;
    });
  };

  const addToHistory = async (imgSrc: string, action: HistoryItem['actionType'], description: string) => {
    const thumb = await createThumbnail(imgSrc);
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      thumbnail: thumb,
      fullImage: imgSrc,
      settings: { ...settings },
      actionType: action,
      description: description
    };
    const newHistory = [...history.slice(0, historyIndex + 1), newItem];
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const restoreHistoryItem = (index: number) => {
    if (index < 0 || index >= history.length) return;
    const item = history[index];
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setImageLoaded(true);
      setSettings(item.settings); 
      setHistoryIndex(index);
    };
    img.src = item.fullImage;
  };

  const handleUndo = () => historyIndex > 0 && restoreHistoryItem(historyIndex - 1);
  const handleRedo = () => historyIndex < history.length - 1 && restoreHistoryItem(historyIndex + 1);

  const handleExportHistoryItem = (item: HistoryItem) => {
    const link = document.createElement('a');
    link.download = `stencil-${item.actionType}-${item.id}.png`;
    link.href = item.fullImage;
    link.click();
  };

  // --- FILE HANDLING ---
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setImageLoaded(true);
        setSettings(prev => ({ ...DEFAULT_SETTINGS, mode: prev.mode, lineColor: prev.lineColor }));
        setPlaneArtResult(null);
        setHistory([]);
        setHistoryIndex(-1);
        addToHistory(src, 'import', 'Imported Reference');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const getOriginalImageBase64 = (): string | null => {
    if (!originalImage) return null;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(originalImage, 0, 0);
    return tempCanvas.toDataURL('image/png');
  };
  
  const getProcessedStencilBase64 = (): string | null => {
     if (canvasRef.current) return canvasRef.current.toDataURL('image/png');
     return getOriginalImageBase64();
  };

  // --- AI HANDLERS ---
  const handleAiEdit = async (prompt: string) => {
    const base64 = getOriginalImageBase64();
    if (!base64) return;
    setIsAiProcessing(true);
    try {
      const newImageBase64 = await generateImageEdit(base64, prompt);
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setIsAiProcessing(false);
        addToHistory(newImageBase64, 'manual', 'Custom Edit');
      };
      img.src = newImageBase64;
    } catch (error) {
      alert("AI Processing Failed.");
      setIsAiProcessing(false);
    }
  };

  const handleBlueprintRequest = async (style: TattooStyle) => {
      const base64 = getOriginalImageBase64();
      if (!base64) return;
      
      // Store ORIGINAL image for comparison
      setPreBlueprintImage(base64);

      setIsAiProcessing(true);
      try {
          const result = await generateTattooBlueprint(base64, style, { correctPerspective: style === 'planeart', simplify: style !== 'realism' });
          setBlueprintResult(result);
          setIsAiProcessing(false);
          setShowBlueprintModal(true);
          updateSetting('activePreset', style);
      } catch (error) {
          console.error(error);
          alert("Blueprint Generation Failed.");
          setIsAiProcessing(false);
      }
  };

  const applyBlueprintToWorkspace = () => {
      if (!blueprintResult) return;
      const img = new Image();
      img.onload = () => {
          setOriginalImage(img);
          setSettings(prev => ({ 
            ...DEFAULT_SETTINGS, 
            mode: 'threshold', // Blueprint returns pure B&W usually
            detail: 50,
            smoothing: 0,
            lineColor: prev.lineColor,
            isAdvancedMode: false
          }));
          setShowBlueprintModal(false);
          addToHistory(blueprintResult, 'ai-blueprint', 'Blueprint AI');
      };
      img.src = blueprintResult;
  };

  const handleGeneratePlaneArt = async () => {
      const base64 = getOriginalImageBase64();
      if (!base64) return;
      setIsAiProcessing(true);
      try {
          const result = await generatePlaneArt(base64);
          setPlaneArtResult(result);
          setIsAiProcessing(false);
      } catch (error) {
          alert("Failed to generate PlaneArt.");
          setIsAiProcessing(false);
      }
  };

  const handlePlaneArtDownload = (format: 'png' | 'jpg') => {
      if (!planeArtResult) return;
      const link = document.createElement('a');
      link.download = `planeart-${Date.now()}.${format}`;
      link.href = planeArtResult;
      link.click();
  };

  const handlePlaneArtToStencil = () => {
    if (!planeArtResult) return;
    const img = new Image();
    img.onload = () => {
        setOriginalImage(img);
        setImageLoaded(true);
        setActiveTab('stencil');
        setSettings(prev => ({ ...DEFAULT_SETTINGS, mode: 'threshold' }));
        addToHistory(planeArtResult, 'ai-blueprint', 'PlaneArt Import');
    };
    img.src = planeArtResult;
  };

  // --- CANVAS PROCESSING LOOP ---
  useEffect(() => {
    if (!originalImage || !canvasRef.current || activeTab !== 'stencil') return;
    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);

    setIsProcessing(true);
    processingTimeoutRef.current = window.setTimeout(() => {
        if (!canvasRef.current) return;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const MAX_DIM = 2048; 
      let width = originalImage.width;
      let height = originalImage.height;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      if (thermalRef.current) {
          thermalRef.current.width = width;
          thermalRef.current.height = height;
      }

      ctx.drawImage(originalImage, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // Process
      const { processed, thermalWarnings } = processStencil(imageData, settings);
      
      ctx.putImageData(processed, 0, 0);

      // Thermal Overlay
      if (thermalWarnings && thermalRef.current) {
          const tCtx = thermalRef.current.getContext('2d');
          tCtx?.putImageData(thermalWarnings, 0, 0);
      }

      setIsProcessing(false);
    }, 100); 

    return () => {
        if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    };
  }, [originalImage, settings, activeTab]);

  const onDownload = () => {
    const link = document.createElement('a');
    link.download = `stencil-${Date.now()}.png`;
    link.href = getProcessedStencilBase64() || '';
    link.click();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black text-white overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <Sidebar 
        settings={settings}
        updateSetting={updateSetting}
        onReset={handleReset}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onDownload={onDownload}
        onUploadClick={handleUploadClick}
        isProcessing={isProcessing}
        onBlueprint={handleBlueprintRequest}
        onAiEdit={handleAiEdit}
        isAiProcessing={isAiProcessing}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        // Segmentation Config
        segmentationConfig={activeTab === 'segmentation' ? {
           splitMode: segSplitMode,
           parts: segParts,
           boardMode: segBoardMode,
           setSplitMode: setSegSplitMode,
           setParts: setSegParts,
           setBoardMode: setSegBoardMode,
           onExportSegments: () => setTriggerSegExport(true),
           manualWidth: segCurrentDim.w,
           manualHeight: segCurrentDim.h,
           onManualResize: (w, h) => setSegManualSize({w, h}),
           isCropMode: segIsCropMode,
           toggleCropMode: () => setSegIsCropMode(!segIsCropMode),
           onExportCrop: () => setTriggerCropExport(true)
        } : undefined}
      />

      {/* MAIN WORKSPACE */}
      <div className="flex-1 relative flex flex-col min-w-0">
         
         {activeTab === 'stencil' && (
            <PreviewArea 
              canvasRef={canvasRef}
              thermalWarningRef={thermalRef}
              imageLoaded={imageLoaded}
              originalImage={originalImage}
              settings={settings}
              updateSetting={updateSetting}
            />
         )}

         {activeTab === 'planeart' && (
            <PlaneArtArea 
               originalImage={originalImage}
               resultImage={planeArtResult}
               isProcessing={isAiProcessing}
               onGenerate={handleGeneratePlaneArt}
               onDownload={handlePlaneArtDownload}
               onImportToStencil={handlePlaneArtToStencil}
            />
         )}

         {activeTab === 'segmentation' && (
            <SegmentationBoard 
               imageSrc={getOriginalImageBase64()} 
               splitMode={segSplitMode}
               parts={segParts}
               boardMode={segBoardMode}
               triggerExport={triggerSegExport}
               onExportComplete={() => setTriggerSegExport(false)}
               // Interaction Props
               onDimensionsUpdate={(w, h) => setSegCurrentDim({w, h})}
               manualSize={segManualSize}
               isCropMode={segIsCropMode}
               triggerCropExport={triggerCropExport}
               onCropExportComplete={() => setTriggerCropExport(false)}
            />
         )}

         {/* History Sidebar (Desktop) */}
         {activeTab === 'stencil' && (
            <div className="absolute top-0 bottom-0 right-0 h-full z-10 pointer-events-none flex justify-end">
               <div className="pointer-events-auto">
                 <HistoryPanel 
                   history={history}
                   currentIndex={historyIndex}
                   onRestore={restoreHistoryItem}
                   onExport={handleExportHistoryItem}
                 />
               </div>
            </div>
         )}
      </div>

      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Blueprint Modal */}
      {showBlueprintModal && blueprintResult && preBlueprintImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur p-4 animate-in fade-in">
           <div className="bg-[#111] border border-[#333] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-[#333] flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    Blueprint Result
                 </h2>
                 <button onClick={() => setShowBlueprintModal(false)} className="text-[#666] hover:text-white">
                    <X className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#050505] relative overflow-hidden group select-none">
                 {/* Comparison Slider */}
                 <div className="absolute inset-0 flex items-center justify-center p-8">
                     <div className="relative w-full h-full max-w-2xl">
                         {/* Underlay: Original */}
                         <img 
                           src={preBlueprintImage} 
                           className="absolute inset-0 w-full h-full object-contain" 
                           alt="Original"
                         />
                         
                         {/* Overlay: Result (Clipped) */}
                         <div 
                           className="absolute inset-0 w-full h-full"
                           style={{ clipPath: `inset(0 0 0 ${blueprintSlider}%)` }}
                         >
                            <img 
                              src={blueprintResult} 
                              className="absolute inset-0 w-full h-full object-contain bg-white" // Result usually has white bg
                              alt="Result"
                            />
                         </div>
                         
                         {/* Slider Handle */}
                         <div 
                            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-[0_0_10px_black]"
                            style={{ left: `${blueprintSlider}%` }}
                            onMouseDown={(e) => {
                               const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                               if(!rect) return;
                               const onMove = (mv: MouseEvent) => {
                                  const val = Math.max(0, Math.min(100, ((mv.clientX - rect.left) / rect.width) * 100));
                                  setBlueprintSlider(val);
                               };
                               const onUp = () => {
                                  window.removeEventListener('mousemove', onMove);
                                  window.removeEventListener('mouseup', onUp);
                               };
                               window.addEventListener('mousemove', onMove);
                               window.addEventListener('mouseup', onUp);
                            }}
                         >
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center text-black">
                               <ArrowLeft className="w-3 h-3" />
                               <ArrowRight className="w-3 h-3" />
                            </div>
                         </div>
                     </div>
                 </div>
                 
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1 rounded-full text-xs font-mono text-white pointer-events-none">
                    Original vs Blueprint
                 </div>
              </div>

              <div className="p-6 bg-[#111] border-t border-[#333] flex justify-end gap-3">
                 <button 
                   onClick={() => setShowBlueprintModal(false)}
                   className="px-6 py-3 rounded-xl font-bold text-[#888] hover:bg-[#222] transition-colors"
                 >
                    Discard
                 </button>
                 <button 
                   onClick={applyBlueprintToWorkspace}
                   className="px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg flex items-center gap-2"
                 >
                    <Check className="w-5 h-5" /> Accept & Edit
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;