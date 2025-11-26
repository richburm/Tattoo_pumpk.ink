
import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Move, ArrowLeft, ArrowRight, AlertTriangle, Eye } from 'lucide-react';
import { StencilSettings } from '../types';

interface PreviewAreaProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  imageLoaded: boolean;
  originalImage: HTMLImageElement | null;
  settings?: StencilSettings;
  updateSetting?: (key: keyof StencilSettings, value: any) => void;
  thermalWarningRef?: React.RefObject<HTMLCanvasElement>;
}

export const PreviewArea: React.FC<PreviewAreaProps> = ({ canvasRef, imageLoaded, originalImage, settings, updateSetting, thermalWarningRef }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Pan & Drag States
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Slider State (0-100)
  const [sliderPos, setSliderPos] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
  };

  // --- Image Panning Logic ---
  const onMouseDownPan = (e: React.MouseEvent) => {
    if (!imageLoaded || isResizing) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPosition({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const onMouseUp = () => {
    setIsPanning(false);
    setIsResizing(false);
  };

  // --- Touch Logic ---
  const onTouchStart = (e: React.TouchEvent) => {
    if (!imageLoaded || isResizing) return;
    if (e.touches.length === 1) {
       setIsPanning(true);
       setPanStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (scale <= 1 && !settings?.overlayMode) { }

    if (isPanning && e.touches.length === 1) {
      if (scale > 1 || settings?.overlayMode) {
          e.preventDefault(); 
      }
      setPosition({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y
      });
    }
  };

  const onTouchEnd = () => {
    setIsPanning(false);
  };

  const startResizing = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (isResizing && containerRef.current && wrapperRef.current && originalImage) {
        const imgDiv = wrapperRef.current.firstElementChild as HTMLElement;
        if(imgDiv) {
            const imgRect = imgDiv.getBoundingClientRect();
            let clientX = 0;
            if (e instanceof MouseEvent) clientX = e.clientX;
            else if (e instanceof TouchEvent && e.touches.length > 0) clientX = e.touches[0].clientX;

            const x = clientX - imgRect.left;
            const percent = Math.max(0, Math.min(100, (x / imgRect.width) * 100));
            setSliderPos(percent);
        }
      }
    };
    const handleGlobalUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalUp);
      window.addEventListener('touchmove', handleGlobalMove, { passive: false });
      window.addEventListener('touchend', handleGlobalUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [isResizing, originalImage]);

  useEffect(() => {
    if (imageLoaded) {
      const isMobile = window.innerWidth < 768;
      setScale(isMobile ? 0.5 : 0.8);
      setPosition({ x: 0, y: 0 });
      setSliderPos(50);
    }
  }, [imageLoaded]);

  const isOverlayMode = settings?.overlayMode || false;
  
  // Use overlayOpacity directly from settings, default to 100 if undefined
  const overlayOpacity = settings?.overlayOpacity ?? 100;

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative bg-[#050505] overflow-hidden flex flex-col h-full select-none touch-none"
      onMouseDown={onMouseDownPan}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={(e) => handleZoom(e.deltaY > 0 ? -0.1 : 0.1)}
    >
      
      {/* Zoom & Opacity Controls */}
      <div 
        className="absolute top-6 left-6 z-30 flex flex-col gap-2 bg-[#1A1A1A]/90 backdrop-blur border border-[#333] rounded-lg shadow-2xl p-2"
        onMouseDown={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button onClick={() => handleZoom(0.1)} className="p-2 hover:bg-[#333] rounded-md text-[#AAA] hover:text-white transition-colors" title="Zoom In">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={() => setScale(1)} className="p-2 hover:bg-[#333] rounded-md text-[#AAA] hover:text-white text-xs font-bold font-mono transition-colors" title="Reset Zoom">
          100%
        </button>
        <button onClick={() => handleZoom(-0.1)} className="p-2 hover:bg-[#333] rounded-md text-[#AAA] hover:text-white transition-colors" title="Zoom Out">
          <ZoomOut className="w-5 h-5" />
        </button>

        {/* Opacity Slider for Original Image */}
        {imageLoaded && (
          <div className="mt-2 pt-2 border-t border-[#333] flex flex-col items-center gap-2 group relative py-2">
            <Eye className="w-4 h-4 text-[#AAA] group-hover:text-white transition-colors" />
            <div className="h-20 w-1 bg-[#333] rounded-full relative cursor-pointer">
              <input 
                type="range" 
                min="0" max="100" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 appearance-none transform origin-center -rotate-90 translate-y-8"
                style={{ width: '80px', height: '20px', left: '-38px', top: '30px' }} // Hack to make vertical range work cross-browser by rotating a horizontal one
                value={overlayOpacity}
                onChange={(e) => updateSetting && updateSetting('overlayOpacity', parseFloat(e.target.value))}
              />
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-purple-600 rounded-full w-full pointer-events-none"
                style={{ height: `${overlayOpacity}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {settings?.showThermalWarnings && imageLoaded && (
        <div className="absolute top-6 right-6 z-30 flex items-center gap-2 bg-[#FF3F58]/20 backdrop-blur border border-[#FF3F58] px-4 py-2 rounded-lg shadow-xl animate-pulse">
           <AlertTriangle className="w-4 h-4 text-[#FF3F58]" />
           <span className="text-xs font-bold text-[#FF3F58]">Thermal Risks Highlighted</span>
        </div>
      )}

      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-[#333] pointer-events-none">
           <div className="text-center">
             <Move className="w-16 h-16 mx-auto mb-4 opacity-30" />
             <p className="text-lg font-bold text-[#444]">Import a Reference</p>
             <p className="text-xs font-mono uppercase opacity-40 mt-1">Ready for Stencil</p>
           </div>
        </div>
      )}

      {/* Main Content */}
      <div 
        ref={wrapperRef}
        className="flex-1 flex items-center justify-center w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <div 
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isPanning || isResizing ? 'none' : 'transform 0.1s ease-out',
            width: originalImage ? originalImage.width : 0,
            height: originalImage ? originalImage.height : 0,
            maxWidth: 'none',
            maxHeight: 'none',
            position: 'relative',
          }}
          className={`shadow-2xl origin-center ${imageLoaded ? 'bg-white' : ''}`}
        >
           {imageLoaded && (
            <>
              {/* Layer 1: Original Image */}
              <img 
                src={originalImage?.src} 
                className="absolute inset-0 w-full h-full max-w-none max-h-none pointer-events-none transition-opacity duration-200"
                style={{ 
                   opacity: overlayOpacity / 100,
                   objectFit: 'fill'
                }}
                alt="original"
              />

              {/* Layer 2: Stencil Canvas */}
              <div 
                style={{ 
                   position: 'absolute',
                   inset: 0,
                   clipPath: isOverlayMode ? 'none' : `inset(0 0 0 ${sliderPos}%)`,
                   mixBlendMode: isOverlayMode ? 'multiply' : 'normal',
                   zIndex: 10
                }}
              >
                 <canvas ref={canvasRef} className="block w-full h-full" />
              </div>
              
              {/* Layer 3: Thermal Warnings Overlay */}
              {settings?.showThermalWarnings && thermalWarningRef && (
                 <div style={{ position: 'absolute', inset: 0, zIndex: 11, pointerEvents: 'none', clipPath: isOverlayMode ? 'none' : `inset(0 0 0 ${sliderPos}%)` }}>
                    <canvas ref={thermalWarningRef} className="block w-full h-full opacity-80" />
                 </div>
              )}

              {/* Slider Handle */}
              {!isOverlayMode && (
                <div 
                   style={{ left: `${sliderPos}%` }}
                   className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-20 cursor-ew-resize hover:bg-white shadow-[0_0_15px_rgba(0,0,0,1)]"
                   onMouseDown={startResizing}
                   onTouchStart={startResizing}
                >
                   <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-indigo-500 rounded-full shadow-lg flex items-center justify-center border-2 border-white text-white hover:scale-110 transition-transform">
                      <ArrowLeft className="w-3 h-3" />
                      <div className="w-px h-3 bg-white/50 mx-0.5"></div>
                      <ArrowRight className="w-3 h-3" />
                   </div>
                </div>
              )}
            </>
           )}
        </div>
      </div>
    </div>
  );
};
