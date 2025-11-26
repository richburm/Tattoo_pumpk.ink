

import React, { useRef, useEffect, useState } from 'react';
import { Move, RotateCcw, ZoomIn, ZoomOut, Maximize, Minimize, Grid, CheckSquare, Crop } from 'lucide-react';
import { BoardMode } from '../types';

interface SegmentationBoardProps {
  imageSrc: string | null;
  splitMode: 'vertical' | 'horizontal' | 'quadrant';
  parts: number;
  triggerExport: boolean;
  onExportComplete: () => void;
  boardMode: BoardMode; 
  // New props for interaction
  onDimensionsUpdate: (w: number, h: number) => void;
  manualSize: { w: number, h: number } | null;
  isCropMode: boolean;
  triggerCropExport: boolean;
  onCropExportComplete: () => void;
}

// Internal High-Res DPI for Logic
const SCREEN_DPI = 96; 
const EXPORT_DPI = 300; // Standard Print Resolution
const CM_TO_PX = SCREEN_DPI / 2.54;

// Board Definitions
const BOARDS = {
  tabloid: {
    widthCm: 27.94, // 11 in
    heightCm: 43.18, // 17 in
    name: 'Tabloid (11x17")'
  },
  poster_2x2: {
    widthCm: 43.18, // 2x 21.59 (8.5in)
    heightCm: 55.88, // 2x 27.94 (11in)
    name: '4-Sheet Poster (2x2 Letter)'
  }
};

const GRID_COLORS = [
  { name: 'Blue', val: '#3b82f6' },
  { name: 'Red', val: '#ef4444' },
  { name: 'Green', val: '#22c55e' },
  { name: 'Black', val: '#000000' },
  { name: 'White', val: '#ffffff' }
];

export const SegmentationBoard: React.FC<SegmentationBoardProps> = ({
  imageSrc,
  splitMode,
  parts,
  triggerExport,
  onExportComplete,
  boardMode,
  onDimensionsUpdate,
  manualSize,
  isCropMode,
  triggerCropExport,
  onCropExportComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Board Config State
  const [gridColor, setGridColor] = useState('#3b82f6');
  
  // Dimensions based on mode
  const currentBoard = BOARDS[boardMode];
  const BOARD_WIDTH = currentBoard.widthCm * CM_TO_PX;
  const BOARD_HEIGHT = currentBoard.heightCm * CM_TO_PX;

  // Transform State
  const [transform, setTransform] = useState({
    x: BOARD_WIDTH / 2,
    y: BOARD_HEIGHT / 2,
    scale: 0.5,
    rotation: 0
  });

  // Crop State (Rectangle in Board Coords)
  const [cropRect, setCropRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);

  // Viewport State
  const [viewZoom, setViewZoom] = useState(0.6); 

  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<'move' | 'rotate' | 'scale_tl' | 'scale_tr' | 'scale_bl' | 'scale_br' | 'draw_crop'>('move');
  const [startTransform, setStartTransform] = useState({...transform});
  const [startCrop, setStartCrop] = useState({ x: 0, y: 0 });

  // Init Image
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        const scale = Math.min(
          (BOARD_WIDTH * 0.7) / img.width, 
          (BOARD_HEIGHT * 0.7) / img.height
        );
        setTransform({
          x: BOARD_WIDTH / 2,
          y: BOARD_HEIGHT / 2,
          scale: scale,
          rotation: 0
        });
      };
      img.src = imageSrc;
    }
  }, [imageSrc, boardMode]);

  // Handle Manual Resize Prop from Sidebar (Width OR Height)
  useEffect(() => {
    if (manualSize && image && (manualSize.w > 0 || manualSize.h > 0)) {
      const currentW = (image.width * transform.scale) / CM_TO_PX;
      const currentH = (image.height * transform.scale) / CM_TO_PX;

      // Check which dimension implies a change (user intent)
      const diffW = Math.abs(manualSize.w - currentW);
      const diffH = Math.abs(manualSize.h - currentH);

      // Only update if there is a meaningful difference (avoid floating point loops)
      if (diffW > 0.1 || diffH > 0.1) {
          let newScale = transform.scale;
          
          if (diffH > diffW) {
             // User likely edited Height
             const desiredPx = manualSize.h * CM_TO_PX;
             newScale = desiredPx / image.height;
          } else {
             // User likely edited Width
             const desiredPx = manualSize.w * CM_TO_PX;
             newScale = desiredPx / image.width;
          }

          setTransform(prev => ({ ...prev, scale: newScale }));
      }
    }
  }, [manualSize]);

  // Report Dimensions
  useEffect(() => {
    if (image) {
      const w = (image.width * transform.scale) / CM_TO_PX;
      const h = (image.height * transform.scale) / CM_TO_PX;
      // Round to 1 decimal to avoid infinite loops due to precision
      onDimensionsUpdate(Math.round(w*10)/10, Math.round(h*10)/10);
    }
  }, [transform.scale, image]);


  // --- DRAW LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // 2. Draw Image (Under Grid)
    if (image) {
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.rotate(transform.rotation);
      ctx.scale(transform.scale, transform.scale);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
      ctx.restore();
    }

    // 3. Draw Grid
    if (!isCropMode) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = 0.4;
      for (let x = 0; x <= BOARD_WIDTH; x += CM_TO_PX) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, BOARD_HEIGHT); ctx.stroke();
      }
      for (let y = 0; y <= BOARD_HEIGHT; y += CM_TO_PX) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(BOARD_WIDTH, y); ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    }

    // 4. Draw Crop Overlay (If Crop Mode)
    if (isCropMode) {
       // Darken background
       ctx.fillStyle = 'rgba(0,0,0,0.6)';
       ctx.fillRect(0,0, BOARD_WIDTH, BOARD_HEIGHT);

       if (cropRect) {
         // Clear rect for selection
         ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
         
         // Redraw image inside selection (to make it look bright)
         ctx.save();
         ctx.beginPath();
         ctx.rect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
         ctx.clip();
         // Redraw background white inside clip
         ctx.fillStyle = '#fff';
         ctx.fillRect(0,0,BOARD_WIDTH, BOARD_HEIGHT);
         // Redraw image
         if(image) {
            ctx.translate(transform.x, transform.y);
            ctx.rotate(transform.rotation);
            ctx.scale(transform.scale, transform.scale);
            ctx.drawImage(image, -image.width / 2, -image.height / 2);
         }
         ctx.restore();

         // Draw Border
         ctx.strokeStyle = '#eab308'; // Yellow
         ctx.lineWidth = 2;
         ctx.setLineDash([5,5]);
         ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
         ctx.setLineDash([]);
         
         // Draw Dimensions of Crop
         ctx.fillStyle = '#eab308';
         ctx.font = 'bold 12px sans-serif';
         const cw = (cropRect.w / CM_TO_PX).toFixed(1);
         const ch = (cropRect.h / CM_TO_PX).toFixed(1);
         ctx.fillText(`${cw}cm x ${ch}cm`, cropRect.x, cropRect.y - 5);
       }
    }

    // 5. Draw UI Overlays (Only if NOT cropping)
    if (image && !isCropMode) {
       ctx.save();
       ctx.translate(transform.x, transform.y);
       ctx.rotate(transform.rotation);
       
       const w = image.width * transform.scale;
       const h = image.height * transform.scale;
       const hw = w / 2;
       const hh = h / 2;

       // Bounding Box
       ctx.strokeStyle = '#ec4899';
       ctx.lineWidth = 2;
       ctx.strokeRect(-hw, -hh, w, h);

       // Handles
       const drawHandle = (cx: number, cy: number) => {
         ctx.fillStyle = '#fff';
         ctx.fillRect(cx - 6, cy - 6, 12, 12);
         ctx.strokeRect(cx - 6, cy - 6, 12, 12);
       };
       drawHandle(-hw, -hh); drawHandle(hw, -hh); drawHandle(-hw, hh); drawHandle(hw, hh);

       // Rotation
       ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(0, -hh - 40); ctx.stroke();
       ctx.fillStyle = '#ec4899'; ctx.beginPath(); ctx.arc(0, -hh - 40, 6, 0, Math.PI * 2); ctx.fill();

       ctx.restore();
    }

    // 6. Draw Cut Lines (Guide) - Only if NOT cropping
    if (!isCropMode) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 10]);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';

      const activeSplitMode = boardMode === 'poster_2x2' ? 'quadrant' : splitMode;

      if (activeSplitMode === 'quadrant') {
         ctx.beginPath();
         ctx.moveTo(BOARD_WIDTH / 2, 0); ctx.lineTo(BOARD_WIDTH / 2, BOARD_HEIGHT);
         ctx.moveTo(0, BOARD_HEIGHT / 2); ctx.lineTo(BOARD_WIDTH, BOARD_HEIGHT / 2);
         ctx.stroke();
      } else if (activeSplitMode === 'vertical') {
         const step = BOARD_WIDTH / parts;
         for (let i = 1; i < parts; i++) {
           ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, BOARD_HEIGHT); ctx.stroke();
         }
      } else {
         const step = BOARD_HEIGHT / parts;
         for (let i = 1; i < parts; i++) {
           ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(BOARD_WIDTH, i * step); ctx.stroke();
         }
      }
      ctx.setLineDash([]);
    }

  }, [image, transform, splitMode, parts, gridColor, boardMode, isCropMode, cropRect, BOARD_WIDTH, BOARD_HEIGHT]);


  // --- EXPORT LOGIC (SEGMENTS) ---
  useEffect(() => {
    if (triggerExport && image) {
       const performExport = () => {
         // Calculate export scale to reach 300 DPI
         const exportScale = EXPORT_DPI / SCREEN_DPI;
         
         const offCanvas = document.createElement('canvas');
         offCanvas.width = BOARD_WIDTH * exportScale;
         offCanvas.height = BOARD_HEIGHT * exportScale;
         const ctx = offCanvas.getContext('2d');
         if (!ctx) return;

         // Fill White
         ctx.fillStyle = '#fff';
         ctx.fillRect(0,0, offCanvas.width, offCanvas.height);
         
         // Apply Scale and High Quality settings
         ctx.scale(exportScale, exportScale);
         ctx.imageSmoothingEnabled = true;
         ctx.imageSmoothingQuality = 'high';

         // Draw Image
         ctx.save();
         ctx.translate(transform.x, transform.y);
         ctx.rotate(transform.rotation);
         ctx.scale(transform.scale, transform.scale);
         ctx.drawImage(image, -image.width / 2, -image.height / 2);
         ctx.restore();

         const segments: {data:string, name: string}[] = [];
         
         const crop = (x: number, y: number, w: number, h: number, suffix: string) => {
            const finalW = w * exportScale;
            const finalH = h * exportScale;
            
            const temp = document.createElement('canvas');
            temp.width = finalW;
            temp.height = finalH;
            const tCtx = temp.getContext('2d');
            if (tCtx) {
               tCtx.fillStyle = 'white';
               tCtx.fillRect(0,0,finalW,finalH);
               tCtx.drawImage(
                 offCanvas, 
                 x * exportScale, y * exportScale, finalW, finalH, 
                 0, 0, finalW, finalH
               );
               
               // Check if this segment is empty (pure white)
               // For optimization on large canvas, sample grid points instead of full pixel array
               // or check full buffer if performance allows. 8-12MP is fine on desktop.
               // We'll check center and corners + random spots to be fast
               const imgData = tCtx.getImageData(0,0, finalW, finalH);
               const data = imgData.data;
               let hasContent = false;
               
               // Optimized Scan: Step by 100 pixels to be fast
               for(let i=0; i<data.length; i+=100) {
                   const r = data[i];
                   const g = data[i+1];
                   const b = data[i+2];
                   if (r < 250 || g < 250 || b < 250) {
                       hasContent = true;
                       break;
                   }
               }

               if (hasContent) {
                 segments.push({
                   data: temp.toDataURL('image/png'),
                   name: `Segment_${suffix}.png`
                 });
               }
            }
         };

         const activeSplitMode = boardMode === 'poster_2x2' ? 'quadrant' : splitMode;

         if (activeSplitMode === 'quadrant') {
            const w = BOARD_WIDTH / 2;
            const h = BOARD_HEIGHT / 2;
            crop(0, 0, w, h, '1_TopLeft');
            crop(w, 0, w, h, '2_TopRight');
            crop(0, h, w, h, '3_BottomLeft');
            crop(w, h, w, h, '4_BottomRight');
         } else if (activeSplitMode === 'vertical') {
            const w = BOARD_WIDTH / parts;
            for(let i=0; i<parts; i++) crop(i*w, 0, w, BOARD_HEIGHT, `${i+1}`);
         } else {
            const h = BOARD_HEIGHT / parts;
            for(let i=0; i<parts; i++) crop(0, i*h, BOARD_WIDTH, h, `${i+1}`);
         }

         if (segments.length === 0) {
             alert("No active segments found. Place the image within the board area.");
         } else {
            segments.forEach((seg) => {
                const link = document.createElement('a');
                link.download = seg.name;
                link.href = seg.data;
                link.click();
            });
         }
         
         onExportComplete();
       };
       performExport();
    }
  }, [triggerExport]);


  // --- EXPORT LOGIC (CROP) ---
  useEffect(() => {
    if (triggerCropExport && image && cropRect) {
       const exportScale = EXPORT_DPI / SCREEN_DPI;
       
       const offCanvas = document.createElement('canvas');
       offCanvas.width = BOARD_WIDTH * exportScale;
       offCanvas.height = BOARD_HEIGHT * exportScale;
       const ctx = offCanvas.getContext('2d');
       if (ctx) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0,0, offCanvas.width, offCanvas.height);
          ctx.scale(exportScale, exportScale);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.save();
          ctx.translate(transform.x, transform.y);
          ctx.rotate(transform.rotation);
          ctx.scale(transform.scale, transform.scale);
          ctx.drawImage(image, -image.width / 2, -image.height / 2);
          ctx.restore();

          const temp = document.createElement('canvas');
          temp.width = cropRect.w * exportScale;
          temp.height = cropRect.h * exportScale;
          const tCtx = temp.getContext('2d');
          if(tCtx) {
             tCtx.fillStyle = 'white';
             tCtx.fillRect(0,0,temp.width, temp.height);
             tCtx.drawImage(
                 offCanvas, 
                 cropRect.x * exportScale, cropRect.y * exportScale, temp.width, temp.height, 
                 0, 0, temp.width, temp.height
             );
             
             const link = document.createElement('a');
             link.download = `Selection_${(cropRect.w/CM_TO_PX).toFixed(1)}x${(cropRect.h/CM_TO_PX).toFixed(1)}cm.png`;
             link.href = temp.toDataURL('image/png');
             link.click();
          }
       }
       onCropExportComplete();
    }
  }, [triggerCropExport]);


  // --- INTERACTION ---
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !image) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / viewZoom;
    const y = (clientY - rect.top) / viewZoom;
    
    setIsDragging(true);
    setDragStart({ x, y });

    // CROP MODE
    if (isCropMode) {
       setStartCrop({ x, y });
       setCropRect({ x, y, w: 0, h: 0 }); // Init rect
       setMode('draw_crop');
       return;
    }

    // NORMAL MODE
    setStartTransform({...transform});

    // Check handles (Logic same as before)
    const dx = x - transform.x;
    const dy = y - transform.y;
    const sin = Math.sin(-transform.rotation);
    const cos = Math.cos(-transform.rotation);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const w = image.width * transform.scale;
    const h = image.height * transform.scale;
    const hw = w / 2;
    const hh = h / 2;
    const handleRad = 20; 

    if (Math.abs(lx) < 30 && Math.abs(ly - (-hh - 40)) < 30) { setMode('rotate'); return; }
    if (Math.abs(lx - (-hw)) < handleRad && Math.abs(ly - (-hh)) < handleRad) { setMode('scale_tl'); return; }
    if (Math.abs(lx - (hw)) < handleRad && Math.abs(ly - (-hh)) < handleRad) { setMode('scale_tr'); return; }
    if (Math.abs(lx - (-hw)) < handleRad && Math.abs(ly - (hh)) < handleRad) { setMode('scale_bl'); return; }
    if (Math.abs(lx - (hw)) < handleRad && Math.abs(ly - (hh)) < handleRad) { setMode('scale_br'); return; }

    setMode('move');
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / viewZoom;
    const y = (clientY - rect.top) / viewZoom;

    if (mode === 'draw_crop') {
       const w = x - startCrop.x;
       const h = y - startCrop.y;
       setCropRect({
         x: w < 0 ? x : startCrop.x,
         y: h < 0 ? y : startCrop.y,
         w: Math.abs(w),
         h: Math.abs(h)
       });
       return;
    }

    if (mode === 'move') {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      setTransform(prev => ({ ...prev, x: startTransform.x + dx, y: startTransform.y + dy }));
    } else if (mode === 'rotate') {
      const angle = Math.atan2(y - transform.y, x - transform.x);
      setTransform(prev => ({ ...prev, rotation: angle + Math.PI / 2 }));
    } else if (mode.startsWith('scale')) {
      const dx = x - transform.x;
      const dy = y - transform.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const baseDiag = Math.sqrt(image!.width*image!.width + image!.height*image!.height) / 2;
      const newScale = dist / baseDiag;
      setTransform(prev => ({ ...prev, scale: Math.max(0.1, newScale) }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => handlePointerDown(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent) => handlePointerMove(e.clientX, e.clientY);
  const handleTouchStart = (e: React.TouchEvent) => { if (e.touches.length === 1) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY); };
  const handleTouchMove = (e: React.TouchEvent) => { if (e.touches.length === 1) { e.preventDefault(); handlePointerMove(e.touches[0].clientX, e.touches[0].clientY); }};

  return (
    <div className="flex-1 bg-[#050505] overflow-hidden flex flex-col relative select-none touch-none">
       
       {/* Top Toolbar */}
       <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#1a1a1a] rounded-full border border-[#333] p-1 flex items-center gap-2 shadow-xl">
           {!isCropMode && (
             <div className="flex px-2 gap-1 border-r border-[#333]">
                {GRID_COLORS.map(c => (
                  <button 
                    key={c.name}
                    onClick={() => setGridColor(c.val)}
                    className={`w-4 h-4 rounded-full border ${gridColor === c.val ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c.val }}
                  />
                ))}
             </div>
           )}
           <div className="flex items-center gap-1 px-2">
              <button onClick={() => setViewZoom(z => Math.max(0.2, z - 0.1))} className="p-1 hover:text-white text-[#888]"><ZoomOut className="w-4 h-4"/></button>
              <span className="text-[10px] font-mono w-8 text-center text-[#666]">{Math.round(viewZoom*100)}%</span>
              <button onClick={() => setViewZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:text-white text-[#888]"><ZoomIn className="w-4 h-4"/></button>
           </div>
       </div>

       {/* Canvas Area */}
       <div className="flex-1 flex items-center justify-center overflow-hidden bg-[#111] cursor-crosshair">
          <div 
             ref={containerRef}
             style={{ 
                width: BOARD_WIDTH * viewZoom, 
                height: BOARD_HEIGHT * viewZoom,
                boxShadow: '0 0 50px rgba(0,0,0,0.5)'
             }}
          >
             <canvas 
               ref={canvasRef}
               width={BOARD_WIDTH}
               height={BOARD_HEIGHT}
               className="origin-top-left"
               style={{ transform: `scale(${viewZoom})` }}
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={() => setIsDragging(false)}
               onMouseLeave={() => setIsDragging(false)}
               onTouchStart={handleTouchStart}
               onTouchMove={handleTouchMove}
               onTouchEnd={() => setIsDragging(false)}
             />
          </div>
       </div>

       {/* Instruction Footer */}
       <div className="bg-[#0E0E0E] border-t border-[#1A1A1A] p-2 text-center">
          <p className="text-[10px] text-[#666]">
            {isCropMode ? (
               <span className="text-yellow-500 font-bold">CROP MODE: Draw a rectangle to select area to export.</span>
            ) : (
               <>Mode: <span className="text-pink-500 font-bold">{BOARDS[boardMode].name}</span> • Drag corners to Scale • Drag handle to Rotate</>
            )}
          </p>
       </div>
    </div>
  );
};
