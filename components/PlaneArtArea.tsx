import React from 'react';
import { Download, Sparkles, Image as ImageIcon, Loader2, PenTool } from 'lucide-react';

interface PlaneArtAreaProps {
  originalImage: HTMLImageElement | null;
  resultImage: string | null;
  isProcessing: boolean;
  onGenerate: () => void;
  onDownload: (format: 'png' | 'jpg') => void;
  onImportToStencil: () => void;
}

export const PlaneArtArea: React.FC<PlaneArtAreaProps> = ({
  originalImage,
  resultImage,
  isProcessing,
  onGenerate,
  onDownload,
  onImportToStencil
}) => {
  return (
    <div className="flex-1 bg-slate-950 p-6 flex gap-6 h-full overflow-hidden relative">
      
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
           <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
           <h3 className="text-xl font-bold text-white">Generating PlaneArt...</h3>
           <p className="text-slate-400 mt-2">Correcting perspective & extracting lineart</p>
        </div>
      )}

      {/* Left Side: Original Image */}
      <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden relative group">
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-300 z-10 border border-white/10">
          Original Photo
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          {originalImage ? (
            <img 
              src={originalImage.src} 
              alt="Original" 
              className="max-w-full max-h-full object-contain shadow-2xl"
            />
          ) : (
            <div className="text-slate-600 flex flex-col items-center">
              <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
              <span className="font-medium">Upload an image to start</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Result Image */}
      <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden relative">
         <div className="absolute top-4 left-4 bg-teal-900/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-teal-200 z-10 border border-teal-500/30">
          PlaneArt Result
        </div>

        <div className="flex-1 flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
           {resultImage ? (
             <img 
               src={resultImage} 
               alt="PlaneArt Result" 
               className="max-w-full max-h-full object-contain shadow-2xl bg-white"
             />
           ) : (
             <div className="text-slate-600 text-center px-8">
               <p className="mb-2">Ready to flatten.</p>
               <p className="text-xs opacity-50">Upload an image and click Generate</p>
             </div>
           )}
        </div>

        {/* Top Right Button: Generate */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onGenerate}
            disabled={!originalImage || isProcessing}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className="w-4 h-4" />
            Generate PlaneArt
          </button>
        </div>

        {/* Bottom Right Buttons: Actions */}
        {resultImage && (
          <div className="absolute bottom-4 right-4 z-20 flex gap-2 items-center">
            <button
              onClick={onImportToStencil}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-colors border border-indigo-500/50 mr-2"
              title="Edit in Stencil Pro"
            >
              <PenTool className="w-4 h-4" />
              Use in Stencil
            </button>

            <div className="h-8 w-px bg-slate-700 mx-1"></div>

            <button
              onClick={() => onDownload('jpg')}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg border border-slate-700 transition-colors"
            >
              JPG
            </button>
            <button
              onClick={() => onDownload('png')}
              className="flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-5 py-2 rounded-lg font-bold shadow-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
          </div>
        )}
      </div>

    </div>
  );
};