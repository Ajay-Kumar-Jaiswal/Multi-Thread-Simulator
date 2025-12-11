import React from 'react';
import { Thread, ThreadState, TaskType, TaskPriority } from '../types';
import { COLORS, PRIORITY_COLORS } from '../constants';
import { Cpu, Lock, AlertCircle, CheckCircle2, Clock, Timer, ChevronsUp, ChevronUp, ChevronDown } from 'lucide-react';

interface ThreadColumnProps {
  thread: Thread;
}

const ThreadColumn: React.FC<ThreadColumnProps> = ({ thread }) => {
  // Determine styles based on state
  let stateStyles = COLORS.IDLE;
  let StatusIcon = Clock;

  switch (thread.state) {
    case ThreadState.RUNNING:
      stateStyles = COLORS.RUNNING;
      StatusIcon = Cpu;
      break;
    case ThreadState.WAITING_LOCK:
      stateStyles = COLORS.WAITING;
      StatusIcon = AlertCircle;
      break;
    case ThreadState.CRITICAL:
      stateStyles = COLORS.CRITICAL;
      StatusIcon = Lock;
      break;
    case ThreadState.FINISHED:
      stateStyles = COLORS.FINISHED;
      StatusIcon = CheckCircle2;
      break;
  }

  const progress = thread.currentTask
    ? ((thread.currentTask.totalDuration - thread.currentTask.remainingDuration) / thread.currentTask.totalDuration) * 100
    : 0;
  
  const getPriorityIcon = (p: TaskPriority) => {
    switch(p) {
      case TaskPriority.HIGH: return <ChevronsUp size={12}/>;
      case TaskPriority.MEDIUM: return <ChevronUp size={12}/>;
      default: return <ChevronDown size={12}/>;
    }
  }

  return (
    <div className={`relative flex flex-col h-full border-r border-slate-800 p-4 transition-colors duration-300 ${thread.state === ThreadState.CRITICAL ? 'bg-rose-950/10' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md border ${stateStyles}`}>
            <StatusIcon size={16} />
          </div>
          <span className="font-mono font-bold text-sm text-slate-200">Thread #{thread.id}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${stateStyles}`}>
          {thread.state}
        </span>
      </div>

      {/* Metrics Row */}
      {thread.blockedDuration > 0 && (
        <div className="mb-2 px-2 py-1 bg-amber-900/20 border border-amber-800/50 rounded flex items-center justify-between text-amber-500">
          <div className="flex items-center gap-1.5">
             <Timer size={12} />
             <span className="text-[10px] font-bold uppercase">Wait Time</span>
          </div>
          <span className="font-mono text-xs">{thread.blockedDuration} ticks</span>
        </div>
      )}

      {/* Active Task Visualization */}
      <div className="flex-1 flex flex-col gap-2 min-h-[160px]">
        {thread.currentTask ? (
          <div className={`relative w-full bg-slate-800 rounded-lg p-3 border border-slate-700 shadow-xl overflow-hidden group ${thread.state === ThreadState.WAITING_LOCK ? 'opacity-60 grayscale-[0.5]' : ''}`}>
             {/* Progress Bar Background */}
             <div className="absolute bottom-0 left-0 h-1 bg-slate-700 w-full">
                <div 
                  className={`h-full transition-all duration-100 ease-linear ${thread.currentTask.type === TaskType.CRITICAL_DB ? 'bg-rose-500' : 'bg-blue-500'}`} 
                  style={{ width: `${progress}%` }}
                />
             </div>

             <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-xs font-mono text-slate-400">{thread.currentTask.id}</span>
                <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 rounded border ${PRIORITY_COLORS[thread.currentTask.priority]}`}>
                   {getPriorityIcon(thread.currentTask.priority)}
                   {thread.currentTask.priority === TaskPriority.HIGH ? 'HI' : thread.currentTask.priority === TaskPriority.MEDIUM ? 'MED' : 'LO'}
                </div>
             </div>
             
             <div className="relative z-10">
               <div className="text-sm font-medium text-slate-200 mb-1">
                 {thread.currentTask.type === TaskType.CRITICAL_DB ? 'Writing Database' : 
                  thread.currentTask.type === TaskType.IO_BOUND ? 'Network Request' : 'Calculating Primes'}
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-xs text-slate-500 font-mono">
                   {thread.currentTask.remainingDuration} ticks remaining
                 </span>
                 <span className="text-[10px] text-slate-600 font-mono bg-slate-900 px-1 rounded">
                   {thread.currentTask.type === TaskType.CRITICAL_DB ? 'MUTEX' : 'ASYNC'}
                 </span>
               </div>
             </div>

             {/* Lock indicator if Critical */}
             {thread.state === ThreadState.CRITICAL && (
               <div className="absolute top-2 right-2 animate-pulse text-rose-500">
                 <Lock size={14} />
               </div>
             )}
              {/* Lock indicator if Waiting */}
             {thread.state === ThreadState.WAITING_LOCK && (
               <div className="absolute top-2 right-2 text-amber-500">
                 <AlertCircle size={14} />
               </div>
             )}
          </div>
        ) : (
          <div className="h-full border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-600">
            <span className="text-xs">Idle</span>
          </div>
        )}
      </div>

      {/* Thread Stack / History */}
      <div className="mt-4 h-32 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-10" />
        <div className="space-y-1">
           {thread.history.slice(-5).reverse().map((log, idx) => (
             <div key={idx} className="text-[10px] font-mono text-slate-500 truncate border-l-2 border-slate-800 pl-2">
               {log}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default ThreadColumn;
