import React from 'react';
import { Database, Lock, Unlock, Users } from 'lucide-react';

interface SharedResourcesProps {
  mutexOwner: number | null;
  waitQueue: number[];
}

const SharedResources: React.FC<SharedResourcesProps> = ({ mutexOwner, waitQueue }) => {
  const isLocked = mutexOwner !== null;

  return (
    <div className="bg-slate-900 border-t border-b border-slate-800 p-4 flex items-center justify-between gap-6">
      
      {/* Mutex Object Visualization */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <h3 className="text-sm font-bold text-slate-200">Shared Resource</h3>
          <p className="text-xs text-slate-500 font-mono">MUTEX_LOCK (0x7F4A)</p>
        </div>
        
        <div className={`relative w-16 h-16 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ${isLocked ? 'bg-rose-900/20 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-emerald-900/20 border-emerald-500/50'}`}>
          {isLocked ? (
            <div className="flex flex-col items-center animate-pulse-fast">
              <Lock className="text-rose-500" size={24} />
              <span className="text-[10px] font-bold text-rose-400 mt-1">LOCKED</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Unlock className="text-emerald-500" size={24} />
              <span className="text-[10px] font-bold text-emerald-400 mt-1">FREE</span>
            </div>
          )}
        </div>

        {isLocked && (
          <div className="flex flex-col">
             <span className="text-xs text-slate-400">Owned by</span>
             <span className="text-lg font-mono font-bold text-rose-400">Thread #{mutexOwner}</span>
          </div>
        )}
      </div>

      {/* Wait Queue Visualization */}
      <div className="flex-1 flex flex-col items-end">
         <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Users size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Mutex Wait Queue</span>
         </div>
         
         <div className="flex items-center gap-2 h-10 p-1 bg-slate-950 rounded border border-slate-800 w-full max-w-md overflow-x-auto justify-end">
            {waitQueue.length === 0 ? (
              <span className="text-xs text-slate-600 italic px-2">Queue Empty</span>
            ) : (
              waitQueue.map((threadId, idx) => (
                <div key={threadId} className="flex-shrink-0 w-8 h-8 rounded bg-amber-900/30 border border-amber-600 text-amber-500 flex items-center justify-center font-mono text-xs font-bold relative group">
                  #{threadId}
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
};

export default SharedResources;