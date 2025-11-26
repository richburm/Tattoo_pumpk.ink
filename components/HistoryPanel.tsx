
import React from 'react';
import { HistoryItem } from '../types';
import { Clock, Download, RotateCcw, ArrowRight } from 'lucide-react';

interface HistoryPanelProps {
  history: HistoryItem[];
  currentIndex: number;
  onRestore: (index: number) => void;
  onExport: (item: HistoryItem) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  currentIndex,
  onRestore,
  onExport
}) => {
  if (history.length === 0) return null;

  return (
    <div className="w-24 bg-slate-900 border-r border-slate-800 flex flex-col z-10 shadow-xl hidden md:flex">
      <div className="p-3 border-b border-slate-800 flex flex-col items-center justify-center text-slate-400">
        <Clock className="w-5 h-5 mb-1" />
        <span className="text-[10px] uppercase font-bold tracking-wider">History</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
        {history.map((item, index) => {
          const isActive = index === currentIndex;
          return (
            <div 
              key={item.id}
              className={`relative group flex flex-col items-center transition-all ${
                isActive ? 'opacity-100 scale-100' : 'opacity-60 hover:opacity-90 scale-95 hover:scale-100'
              }`}
            >
              {/* Connection Line */}
              {index < history.length - 1 && (
                <div className="absolute -bottom-3 left-1/2 w-px h-3 bg-slate-700 -translate-x-1/2 z-0" />
              )}

              <button
                onClick={() => onRestore(index)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all z-10 bg-slate-800 ${
                  isActive 
                    ? 'border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' 
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <img 
                  src={item.thumbnail} 
                  alt={item.description} 
                  className="w-full h-full object-cover"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <RotateCcw className="w-6 h-6 text-white" />
                </div>
              </button>

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute top-1/2 -right-3 -translate-y-1/2">
                  <ArrowRight className="w-4 h-4 text-indigo-500 fill-indigo-500" />
                </div>
              )}

              <span className={`text-[9px] mt-1 text-center font-medium leading-tight max-w-[64px] truncate ${isActive ? 'text-indigo-300' : 'text-slate-500'}`}>
                {item.description}
              </span>

              {/* Tooltip / Popout Details */}
              <div className="absolute left-full top-0 ml-3 w-48 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 translate-x-[-10px] group-hover:translate-x-0 duration-200">
                 <h4 className="text-xs font-bold text-white mb-1">{item.description}</h4>
                 <p className="text-[10px] text-slate-400 mb-2">
                   {new Date(item.timestamp).toLocaleTimeString()}
                 </p>
                 <div className="flex items-center gap-2 mb-2">
                   <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase border border-slate-600">
                     {item.actionType}
                   </span>
                 </div>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onExport(item); }}
                   className="w-full flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-xs text-white py-1.5 rounded transition-colors"
                 >
                   <Download className="w-3 h-3" /> Export
                 </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
