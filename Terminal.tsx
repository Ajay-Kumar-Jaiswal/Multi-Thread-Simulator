import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
}

const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-slate-950 font-mono text-xs">
      <div className="flex items-center gap-2 p-2 bg-slate-900 border-b border-slate-800 text-slate-400">
        <TerminalIcon size={14} />
        <span className="font-bold">System Output</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 hover:bg-slate-900/50 p-0.5 rounded">
            <span className="text-slate-600 min-w-[70px] select-none">[{log.timestamp}]</span>
            <span className={`
              ${log.type === 'error' ? 'text-rose-500' : ''}
              ${log.type === 'warning' ? 'text-amber-500' : ''}
              ${log.type === 'success' ? 'text-emerald-500' : ''}
              ${log.type === 'info' ? 'text-slate-300' : ''}
            `}>
               {log.threadId !== undefined && (
                 <span className="text-cyan-600 mr-2 font-bold">Thread-{log.threadId}:</span>
               )}
               {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Terminal;