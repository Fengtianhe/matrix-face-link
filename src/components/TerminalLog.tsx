import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalLogProps {
  logs: LogEntry[];
}

export const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-black/80 border border-green-500/30 p-4 rounded-lg shadow-[0_0_15px_rgba(0,255,0,0.1)] font-mono text-sm relative overflow-hidden">
      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,255,0,0.05)_50%)] bg-[length:100%_4px] z-10 opacity-50"></div>
      
      <div className="flex items-center justify-between border-b border-green-800 pb-2 mb-2 z-20">
        <span className="text-green-400 font-bold tracking-wider">SYSTEM_LOG</span>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-green-700"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide z-20 space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 break-all">
            <span className="text-green-700 shrink-0">[{log.timestamp}]</span>
            <span className={`${
              log.type === 'error' ? 'text-red-500' : 
              log.type === 'analysis' ? 'text-cyan-400' : 
              log.type === 'warning' ? 'text-yellow-500' : 
              'text-green-400'
            }`}>
              {log.type === 'analysis' && '> '}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};