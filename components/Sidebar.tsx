
import React, { useState, useEffect } from 'react';
import { 
  Settings, Sliders, Layers, Zap, Image as ImageIcon, 
  RotateCcw, Download, Palette, Wand2, Sparkles, Send, 
  Loader2, Star, ScanLine, PenTool, Printer, Eye, 
  Undo2, Redo2, ChevronDown, ChevronUp, AlertTriangle, Fingerprint,
  Grid3X3, Scissors, BoxSelect, LayoutGrid, Move, Maximize, Crop, CheckSquare,
  Thermometer, DraftingCompass, Grip
} from 'lucide-react';
import { StencilSettings, TattooStyle, TabType, BoardMode, SegmentationConfig } from '../types';

interface SidebarProps {
  settings: StencilSettings;
  updateSetting: (key: keyof StencilSettings, value: any) => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDownload: () => void;
  onUploadClick: () => void;
  isProcessing: boolean;
  onBlueprint: (style: TattooStyle) => void;
  onAiEdit: (prompt: string) => void;
  isAiProcessing: boolean;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  segmentationConfig?: SegmentationConfig;
  mobileContent?: React.ReactNode;
}

const SliderControl = ({ 
  label, 
  value, 
  min, 
  max, 
  onChange, 
  step = 1,
  friendlyLabels
}: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  onChange: (val: number) => void;
  step?: number;
  friendlyLabels?: string[];
}) => (
  <div className="mb-6">
    <div className="flex justify-between mb-2.5">
      <span className="text-[11px] font-bold text-[#B9B9B9] uppercase tracking-widest">{label}</span>
      <span className="text-[11px] text-indigo-400 font-mono font-bold">
        {friendlyLabels 
          ? friendlyLabels[Math.floor(((value - min) / (max - min)) * (friendlyLabels.length - 0.01))] 
          : value}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-[#2A2A2A] rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
    />
  </div>
);

const StyleCard = ({ 
  id, 
  label, 
  active, 
  onClick,
  icon
}: { 
  id: string, 
  label: string, 
  active: boolean, 
  onClick: () => void,
  icon: React.ReactNode
}) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 group ${
      active 
        ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
        : 'bg-[#1A1A1A] border-[#333] hover:border-[#555] hover:bg-[#222]'
    }`}
  >
    <div className={`mb-2 transition-transform group-hover:scale-110 ${active ? 'text-blue-400' : 'text-[#888]'}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-white' : 'text-[#888]'}`}>
      {label}
    </span>
  </button>
);

const PRO_PRESETS = {
  thermal: {
    label: "Thermal Bold",
    desc: "For transfer machines",
    icon: <Thermometer className="w-4 h-4" />,
    settings: {
      thickness: 3,
      edgeIntensity: 80,
      detail: 60,
      smoothing: 2,
      mode: 'mixed',
      contrast: 15
    }
  },
  realism: {
    label: "Realism Map",
    desc: "Ghost lines for shading",
    icon: <Eye className="w-4 h-4" />,
    settings: {
      thickness: 1,
      edgeIntensity: 40,
      detail: 20,
      smoothing: 4,
      mode: 'edge', // Only edges, no black fill
      contrast: -10
    }
  },
  dotwork: {
    label: "Dotwork / Whip",
    desc: "Texture & Stipple capture",
    icon: <Grip className="w-4 h-4" />,
    settings: {
      thickness: 1,
      edgeIntensity: 120,
      detail: 40,
      smoothing: 0, // No blur to keep noise
      mode: 'edge',
      contrast: 30
    }
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  settings,
  updateSetting,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDownload,
  onUploadClick,
  isProcessing,
  onBlueprint,
  onAiEdit,
  isAiProcessing,
  activeTab,
  setActiveTab,
  segmentationConfig,
  mobileContent
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Local state for dimensions to allow typing without jitter
  const [localDim, setLocalDim] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (segmentationConfig) {
      setLocalDim({ w: segmentationConfig.manualWidth, h: segmentationConfig.manualHeight });
    }
  }, [segmentationConfig?.manualWidth, segmentationConfig?.manualHeight]);

  const handleCustomAiSubmit = () => {
    if (customPrompt.trim()) {
      onAiEdit(customPrompt);
      setCustomPrompt(''); 
    }
  };

  const handleDimCommit = () => {
    if (segmentationConfig) {
      segmentationConfig.onManualResize(localDim.w, localDim.h);
    }
  };

  const applyProPreset = (key: keyof typeof PRO_PRESETS) => {
    const p = PRO_PRESETS[key].settings;
    // Batch update simulation
    updateSetting('thickness', p.thickness);
    updateSetting('edgeIntensity', p.edgeIntensity);
    updateSetting('detail', p.detail);
    updateSetting('smoothing', p.smoothing);
    updateSetting('mode', p.mode);
    updateSetting('contrast', p.contrast);
  };

  return (
    <div className="w-full md:w-[360px] bg-[#0E0E0E] border-r border-[#1A1A1A] flex flex-col h-full z-20 shadow-2xl relative shrink-0">
      
      {/* AI Processing Overlay */}
      {isProcessing && isAiProcessing && (
        <div className="absolute inset-0 z-50 bg-[#0E0E0E]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
          </div>
          <h3 className="text-xl font-bold text-white mt-6 mb-2 tracking-tight">AI Enhancement</h3>
          <p className="text-xs text-[#888] uppercase tracking-widest">Processing Image...</p>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-[#1A1A1A] flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <Fingerprint className="w-5 h-5 text-white" />
           </div>
           <div>
             <h1 className="font-bold text-lg text-white tracking-tight leading-none">Stencil Pro</h1>
             <span className="text-[10px] text-[#666] uppercase tracking-widest font-bold">Studio Edition</span>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1A1A1A] bg-[#111]">
        <button 
          onClick={() => setActiveTab('stencil')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'stencil' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-[#666] hover:text-[#999]'}`}
        >
          Stencil
        </button>
        <button 
          onClick={() => setActiveTab('planeart')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'planeart' ? 'text-teal-400 border-b-2 border-teal-500' : 'text-[#666] hover:text-[#999]'}`}
        >
          PlaneArt
        </button>
        <button 
          onClick={() => setActiveTab('segmentation')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'segmentation' ? 'text-pink-400 border-b-2 border-pink-500' : 'text-[#666] hover:text-[#999]'}`}
        >
          Segmentation
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-8">

          {/* TAB: STENCIL */}
          {activeTab === 'stencil' && (
            <>
              {/* Main Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={onUploadClick}
                  className="col-span-2 flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#252525] text-white py-4 rounded-xl font-bold transition-all text-sm border border-[#333] hover:border-[#444] group"
                >
                  <ImageIcon className="w-4 h-4 text-[#666] group-hover:text-white transition-colors" /> Import Reference
                </button>
                
                <button 
                  onClick={onUndo} disabled={!canUndo}
                  className="flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#252525] disabled:opacity-30 disabled:hover:bg-[#1A1A1A] text-[#AAA] py-3 rounded-lg font-medium transition-all text-xs border border-[#333]"
                >
                  <Undo2 className="w-4 h-4" /> Undo
                </button>
                <button 
                  onClick={onRedo} disabled={!canRedo}
                  className="flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#252525] disabled:opacity-30 disabled:hover:bg-[#1A1A1A] text-[#AAA] py-3 rounded-lg font-medium transition-all text-xs border border-[#333]"
                >
                  <Redo2 className="w-4 h-4" /> Redo
                </button>
              </div>

              {/* TATTOO BLUEPRINT AI SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-indigo-500" /> Blueprint AI
                  </h3>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <StyleCard 
                    id="fine-line" label="Fine Line" active={settings.activePreset === 'fine-line'} 
                    onClick={() => onBlueprint('fine-line')} 
                    icon={<PenTool className="w-4 h-4" />} 
                  />
                  <StyleCard 
                    id="old-school" label="Old School" active={settings.activePreset === 'old-school'} 
                    onClick={() => onBlueprint('old-school')} 
                    icon={<Star className="w-4 h-4" />} 
                  />
                  <StyleCard 
                    id="realism" label="Realism" active={settings.activePreset === 'realism'} 
                    onClick={() => onBlueprint('realism')} 
                    icon={<Eye className="w-4 h-4" />} 
                  />
                  <StyleCard 
                    id="anime" label="Anime" active={settings.activePreset === 'anime'} 
                    onClick={() => onBlueprint('anime')} 
                    icon={<Zap className="w-4 h-4" />} 
                  />
                  <StyleCard 
                    id="geometric" label="Geometric" active={settings.activePreset === 'geometric'} 
                    onClick={() => onBlueprint('geometric')} 
                    icon={<ScanLine className="w-4 h-4" />} 
                  />
                  <StyleCard 
                    id="custom" label="Basic" active={settings.activePreset === 'custom'} 
                    onClick={() => onBlueprint('custom')} 
                    icon={<Wand2 className="w-4 h-4" />} 
                  />
                </div>

                {/* AI Enhancement Section */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest flex items-center gap-2">
                    <Wand2 className="w-3 h-3 text-indigo-500" /> AI Enhancement
                  </h3>
                  <div className="bg-[#151515] p-3 rounded-xl border border-[#222]">
                    <div className="relative">
                      <textarea 
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Describe changes (e.g., 'Remove background', 'Enhance contrast')..."
                        className="w-full bg-[#0E0E0E] border border-[#333] rounded-lg p-3 text-xs text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-colors resize-none h-20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCustomAiSubmit();
                          }
                        }}
                      />
                      <button 
                        onClick={handleCustomAiSubmit}
                        disabled={!customPrompt.trim() || isAiProcessing}
                        className="absolute right-2 bottom-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white p-1.5 rounded-md transition-colors disabled:bg-[#333] disabled:text-[#666] disabled:from-transparent disabled:to-transparent disabled:bg-[#333]"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-[#1A1A1A]" />

              {/* Mobile Preview Placeholder */}
              {mobileContent && (
                <div className="md:hidden w-full h-80 bg-[#111] rounded-xl border border-[#222] overflow-hidden shrink-0">
                  {mobileContent}
                </div>
              )}

              {/* CONTROLS: STUDIO MODE vs TECH MODE */}
               {/* Simple/Advanced Toggle in content since header is busy */}
               <div className="flex justify-between items-center bg-[#151515] p-1.5 rounded-lg border border-[#222]">
                  <span className="text-[10px] text-[#666] font-bold px-2 uppercase tracking-wide">
                    {settings.isAdvancedMode ? 'Tech Mode' : 'Studio Mode'}
                  </span>
                  <button 
                    onClick={() => updateSetting('isAdvancedMode', !settings.isAdvancedMode)}
                    className={`text-[9px] uppercase font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                       settings.isAdvancedMode 
                         ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' 
                         : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    }`}
                  >
                    {settings.isAdvancedMode ? <Sliders className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                    {settings.isAdvancedMode ? 'Switch to Simple' : 'Switch to Advanced'}
                  </button>
               </div>

              {settings.isAdvancedMode ? (
                /* TECHNICAL SLIDERS */
                <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                   <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest mb-4">Manual Override</h3>
                   
                   <SliderControl label="Threshold Detail" value={settings.detail} min={0} max={100} onChange={(v) => updateSetting('detail', v)} />
                   <SliderControl label="Edge Sensitivity" value={settings.edgeIntensity} min={0} max={200} onChange={(v) => updateSetting('edgeIntensity', v)} />
                   <SliderControl label="Line Weight" value={settings.thickness} min={1} max={10} onChange={(v) => updateSetting('thickness', v)} />
                   <SliderControl label="Denoise / Blur" value={settings.smoothing} min={0} max={10} onChange={(v) => updateSetting('smoothing', v)} />
                   <SliderControl label="Contrast" value={settings.contrast} min={-50} max={100} onChange={(v) => updateSetting('contrast', v)} />
                   
                   <div className="flex gap-2 pt-2">
                     <button 
                       onClick={() => updateSetting('invert', !settings.invert)}
                       className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.invert ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[#1A1A1A] border-[#333] text-[#888]'}`}
                     >
                       Invert
                     </button>
                     <button 
                       onClick={() => updateSetting('flipX', !settings.flipX)}
                       className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.flipX ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[#1A1A1A] border-[#333] text-[#888]'}`}
                     >
                       Flip X
                     </button>
                   </div>
                </div>
              ) : (
                /* STUDIO MODE (Simplified) */
                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                   
                   {/* PRO PRESETS for Studio Mode */}
                   <div className="grid grid-cols-1 gap-2 mb-4">
                      <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest mb-1">Pro Configs</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(PRO_PRESETS) as [keyof typeof PRO_PRESETS, typeof PRO_PRESETS['thermal']][]).map(([key, config]) => (
                           <button
                             key={key}
                             onClick={() => applyProPreset(key)}
                             className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#1A1A1A] border border-[#333] hover:bg-[#252525] hover:border-indigo-500/50 hover:text-indigo-400 text-[#888] transition-all group"
                           >
                              <div className="mb-1 text-[#666] group-hover:text-indigo-500 transition-colors">
                                {config.icon}
                              </div>
                              <span className="text-[9px] font-bold">{config.label}</span>
                           </button>
                        ))}
                      </div>
                   </div>

                   <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest">Studio Controls</h3>
                   </div>

                   <SliderControl 
                      label="Line Weight" 
                      value={settings.thickness} min={1} max={6} 
                      onChange={(v) => updateSetting('thickness', v)} 
                      friendlyLabels={['Micro', 'Fine', 'Standard', 'Bold', 'Heavy', 'Fat']}
                   />

                   <SliderControl 
                      label="Edge Capture" 
                      value={settings.edgeIntensity} min={0} max={150} 
                      onChange={(v) => updateSetting('edgeIntensity', v)} 
                      friendlyLabels={['Soft', 'Natural', 'Sharp', 'Aggressive']}
                   />

                   <SliderControl 
                      label="Darkness Depth" 
                      value={settings.detail} min={10} max={90} 
                      onChange={(v) => updateSetting('detail', v)} 
                      friendlyLabels={['Light', 'Balanced', 'Deep', 'Blackout']}
                   />
                </div>
              )}

              <div className="w-full h-px bg-[#1A1A1A]" />

              {/* STENCIL COLOR */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest">Stencil Color</h3>
                <div className="flex gap-2">
                  {[
                    { label: 'Black', color: '#000000' },
                    { label: 'Red', color: '#FF3F58' },
                    { label: 'Blue', color: '#2563EB' }
                  ].map((c) => (
                    <button
                      key={c.label}
                      onClick={() => updateSetting('lineColor', c.color)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        settings.lineColor === c.color 
                          ? 'border-white text-white bg-[#222]' 
                          : 'border-[#333] text-[#888] bg-[#1A1A1A] hover:bg-[#252525]'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB: PLANEART */}
          {activeTab === 'planeart' && (
             <div className="space-y-4 text-center text-slate-400">
                <div className="p-4 bg-[#151515] rounded-xl border border-[#222]">
                   <BoxSelect className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                   <h3 className="text-sm font-bold text-white mb-1">PlaneArt Mode</h3>
                   <p className="text-xs">
                      Correct perspective, flatten wraps, and digitize sketches. 
                      Controls are located in the main workspace.
                   </p>
                </div>
             </div>
          )}

          {/* TAB: SEGMENTATION */}
          {activeTab === 'segmentation' && segmentationConfig && (
             <div className="space-y-6">
                 <div className="p-4 bg-[#151515] rounded-xl border border-[#222]">
                   <Scissors className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                   <h3 className="text-sm font-bold text-white mb-1 text-center">Split Studio</h3>
                   <p className="text-xs text-[#888] text-center">
                      Professional Stencil Layout.<br/>
                      Canvas Options: Tabloid or 2x2 Letter.
                   </p>
                </div>

                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest">Canvas Mode</h3>
                   <div className="grid grid-cols-2 gap-2">
                      <button 
                         onClick={() => segmentationConfig.setBoardMode('tabloid')}
                         className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${segmentationConfig.boardMode === 'tabloid' ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-[#1A1A1A] border-[#333] text-[#666]'}`}
                      >
                         <div className="w-6 h-8 border-2 border-current rounded-sm"></div>
                         <span className="text-[10px] font-bold">Tabloid (11x17)</span>
                      </button>
                      <button 
                         onClick={() => segmentationConfig.setBoardMode('poster_2x2')}
                         className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${segmentationConfig.boardMode === 'poster_2x2' ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-[#1A1A1A] border-[#333] text-[#666]'}`}
                      >
                         <div className="grid grid-cols-2 gap-0.5 w-8 h-10 border border-transparent">
                            <div className="bg-current opacity-80 rounded-sm"></div><div className="bg-current opacity-80 rounded-sm"></div>
                            <div className="bg-current opacity-80 rounded-sm"></div><div className="bg-current opacity-80 rounded-sm"></div>
                         </div>
                         <span className="text-[10px] font-bold">2x2 Letter</span>
                      </button>
                   </div>
                </div>

                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest">Split Configuration</h3>
                   
                   {/* Split Mode - Disabled for 2x2 because it IS the mode */}
                   {segmentationConfig.boardMode === 'tabloid' ? (
                     <>
                     <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => segmentationConfig.setSplitMode('vertical')}
                          className={`p-2 rounded border flex flex-col items-center gap-1 ${segmentationConfig.splitMode === 'vertical' ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-[#1A1A1A] border-[#333] text-[#666]'}`}
                        >
                          <div className="w-4 h-5 border border-current flex"><div className="w-1/2 h-full border-r border-current"></div></div>
                          <span className="text-[9px] font-bold">Vertical</span>
                        </button>
                        <button 
                          onClick={() => segmentationConfig.setSplitMode('horizontal')}
                          className={`p-2 rounded border flex flex-col items-center gap-1 ${segmentationConfig.splitMode === 'horizontal' ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-[#1A1A1A] border-[#333] text-[#666]'}`}
                        >
                          <div className="w-5 h-4 border border-current flex flex-col"><div className="h-1/2 w-full border-b border-current"></div></div>
                          <span className="text-[9px] font-bold">Horiz.</span>
                        </button>
                        <button 
                          onClick={() => segmentationConfig.setSplitMode('quadrant')}
                          className={`p-2 rounded border flex flex-col items-center gap-1 ${segmentationConfig.splitMode === 'quadrant' ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-[#1A1A1A] border-[#333] text-[#666]'}`}
                        >
                          <Grid3X3 className="w-4 h-4" />
                          <span className="text-[9px] font-bold">Quad</span>
                        </button>
                     </div>

                     {/* Parts Count */}
                     {segmentationConfig.splitMode !== 'quadrant' && (
                       <div className="flex gap-2 bg-[#1A1A1A] p-1 rounded-lg border border-[#333]">
                          {[2, 3, 4].map(n => (
                             <button 
                               key={n}
                               onClick={() => segmentationConfig.setParts(n)}
                               className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${segmentationConfig.parts === n ? 'bg-pink-500 text-white shadow' : 'text-[#666] hover:text-[#999]'}`}
                             >
                               {n} Parts
                             </button>
                          ))}
                       </div>
                     )}
                     </>
                   ) : (
                     <div className="p-3 bg-pink-900/10 border border-pink-900/30 rounded-lg">
                       <p className="text-[10px] text-pink-400 text-center">
                         Poster Mode automatically splits into 4 Letter-sized sheets (Quad).
                       </p>
                     </div>
                   )}
                </div>

                {/* MANUAL DIMENSIONS */}
                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest">Manual Dimensions (cm)</h3>
                   <div className="flex gap-2 items-center">
                      <div className="flex-1 bg-[#1A1A1A] rounded-lg border border-[#333] px-2 py-1.5 flex items-center">
                         <span className="text-[9px] text-[#666] font-bold mr-2">W:</span>
                         <input 
                            type="number" 
                            className="bg-transparent text-white text-xs font-mono w-full focus:outline-none"
                            value={localDim.w > 0 ? localDim.w : ''}
                            onChange={(e) => setLocalDim(prev => ({ ...prev, w: parseFloat(e.target.value) || 0 }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleDimCommit()}
                            onBlur={handleDimCommit}
                         />
                      </div>
                      <div className="flex-1 bg-[#1A1A1A] rounded-lg border border-[#333] px-2 py-1.5 flex items-center">
                         <span className="text-[9px] text-[#666] font-bold mr-2">H:</span>
                         <input 
                            type="number" 
                            className="bg-transparent text-white text-xs font-mono w-full focus:outline-none"
                            value={localDim.h > 0 ? localDim.h : ''}
                            onChange={(e) => setLocalDim(prev => ({ ...prev, h: parseFloat(e.target.value) || 0 }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleDimCommit()}
                            onBlur={handleDimCommit}
                         />
                      </div>
                      <button 
                         onClick={handleDimCommit}
                         className="p-2 bg-[#222] hover:bg-pink-600 hover:text-white rounded-lg text-[#666] transition-colors"
                         title="Apply Dimensions"
                      >
                         <CheckSquare className="w-4 h-4" />
                      </button>
                   </div>
                </div>

                {/* CROP TOOL */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest">Tools</h3>
                    <button
                       onClick={segmentationConfig.toggleCropMode}
                       className={`w-full py-3 rounded-lg border flex items-center justify-center gap-2 transition-all font-bold text-xs ${
                          segmentationConfig.isCropMode 
                             ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                             : 'bg-[#1A1A1A] border-[#333] text-[#888] hover:bg-[#222]'
                       }`}
                    >
                       <Crop className="w-4 h-4" />
                       {segmentationConfig.isCropMode ? 'Crop Mode Active' : 'Crop & Select Area'}
                    </button>
                </div>

                <div className="space-y-2">
                   {segmentationConfig.isCropMode ? (
                     <button 
                        onClick={segmentationConfig.onExportCrop}
                        className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Export Selection
                      </button>
                   ) : (
                     <button 
                        onClick={segmentationConfig.onExportSegments}
                        className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(236,72,153,0.3)] flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Export All Segments
                      </button>
                   )}
                </div>
             </div>
          )}

        </div>
      </div>

      {/* Footer (Standard Download) */}
      {activeTab === 'stencil' && (
        <div className="p-6 border-t border-[#1A1A1A] bg-[#0E0E0E]">
          <button 
              onClick={onDownload}
              disabled={isProcessing || isAiProcessing}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-800 disabled:to-gray-800 disabled:bg-[#333] disabled:text-[#666] text-white py-4 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isProcessing ? 'Rendering...' : <><Download className="w-4 h-4" /> Export Stencil Package</>}
            </button>
        </div>
      )}
    </div>
  );
};
