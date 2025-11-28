import React, { useState, useCallback } from 'react';
import { TerminalLog } from './components/TerminalLog';
import MatrixFace from './components/MatrixFace';
import { LogEntry, AnalysisStatus, ThemeMode, GenderMode } from './types';
import { Activity, Brain, Radio, Scan, Settings, User, Palette } from 'lucide-react';

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'init', timestamp: new Date().toLocaleTimeString(), message: '系统启动...', type: 'info' }
  ]);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  
  // Customization States
  const [theme, setTheme] = useState<ThemeMode>('MATRIX');
  const [gender, setGender] = useState<GenderMode>('NEUTRAL');

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => {
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      };
      // Keep only last 50 logs
      return [...prev.slice(-49), newLog];
    });
  }, []);

  // Theme Colors Helper for UI components
  const getThemeColors = () => {
      if (theme === 'CYBER_PUNK') return 'text-fuchsia-500 border-fuchsia-800';
      if (theme === 'GOLDEN_DATA') return 'text-amber-500 border-amber-800';
      return 'text-green-500 border-green-800';
  };

  return (
    <div className="h-screen w-screen bg-[#050505] font-mono flex flex-col p-4 md:p-6 relative overflow-hidden transition-colors duration-500">
      {/* Background Grid */}
      <div className={`absolute inset-0 bg-[length:40px_40px] pointer-events-none z-0 opacity-10 ${
          theme === 'CYBER_PUNK' ? 'bg-[linear-gradient(rgba(255,0,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.2)_1px,transparent_1px)]' : 
          theme === 'GOLDEN_DATA' ? 'bg-[linear-gradient(rgba(255,200,0,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,100,0,0.2)_1px,transparent_1px)]' :
          'bg-[linear-gradient(rgba(0,50,0,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,50,0,0.2)_1px,transparent_1px)]'
      }`}></div>

      {/* Header */}
      <header className={`flex-none flex justify-between items-center mb-4 z-10 border-b pb-2 transition-colors duration-300 ${getThemeColors()}`}>
        <div className="flex items-center gap-3">
          <Scan className="w-8 h-8 animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold tracking-[0.2em] text-white">VIRTUAL_LINK</h1>
            <p className="text-xs opacity-80">神经连接状态: <span className="animate-pulse font-bold">本地核心</span></p>
          </div>
        </div>
        <div className="flex gap-4 text-xs md:text-sm opacity-80">
           <div className="flex items-center gap-2">
             <Brain className="w-4 h-4" />
             <span>LOCAL_NET</span>
           </div>
           <div className="flex items-center gap-2">
             <Radio className="w-4 h-4" />
             <span>LATENCY: 0ms</span>
           </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 z-10">
        
        {/* Left Panel: Visualizer (2 cols wide) */}
        <div className="lg:col-span-2 flex flex-col h-full min-h-0 gap-4">
            
            {/* Visualizer Container */}
            <div className={`flex-1 relative rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] border bg-black min-h-0 transition-colors duration-300 ${getThemeColors()}`}>
                <MatrixFace 
                    onLog={addLog} 
                    isAnalyzing={analysisStatus !== AnalysisStatus.IDLE}
                    setAnalysisStatus={setAnalysisStatus}
                    theme={theme}
                    gender={gender}
                />
                
                {/* Status Overlay */}
                <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-2 pointer-events-none">
                    {analysisStatus === AnalysisStatus.ANALYZING && (
                        <div className="flex items-center gap-2 text-white bg-black/50 px-3 py-1 rounded border border-white/20">
                            <Activity className="w-4 h-4 animate-spin" />
                            <span className="text-xs tracking-widest">PROCESSING</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Bar */}
            <div className={`h-16 rounded-lg border bg-black/40 backdrop-blur flex items-center px-6 gap-8 overflow-x-auto ${getThemeColors()}`}>
                
                {/* Theme Controls */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 opacity-70">
                        <Palette className="w-4 h-4" />
                        <span className="text-xs font-bold">THEME</span>
                    </div>
                    <div className="flex gap-2">
                        {(['MATRIX', 'CYBER_PUNK', 'GOLDEN_DATA'] as ThemeMode[]).map((t) => (
                            <button 
                                key={t}
                                onClick={() => setTheme(t)}
                                className={`px-3 py-1 text-xs border rounded transition-all ${
                                    theme === t 
                                    ? 'bg-current text-black font-bold' 
                                    : 'bg-transparent opacity-50 hover:opacity-100'
                                }`}
                            >
                                {t.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-px h-8 bg-current opacity-20"></div>

                {/* Gender Controls */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 opacity-70">
                        <User className="w-4 h-4" />
                        <span className="text-xs font-bold">AVATAR</span>
                    </div>
                    <div className="flex gap-2">
                         {(['NEUTRAL', 'FEMALE', 'MALE'] as GenderMode[]).map((g) => (
                            <button 
                                key={g}
                                onClick={() => setGender(g)}
                                className={`px-3 py-1 text-xs border rounded transition-all ${
                                    gender === g
                                    ? 'bg-current text-black font-bold' 
                                    : 'bg-transparent opacity-50 hover:opacity-100'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>

        {/* Right Panel: Terminal/Logs (1 col wide) */}
        <div className="lg:col-span-1 flex flex-col h-[40vh] lg:h-full min-h-0">
           <TerminalLog logs={logs} />
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-none mt-4 text-center opacity-40 text-xs z-10 text-white">
        <p>POWERED BY LOCAL HEURISTICS // MEDIAPIPE FACE MESH</p>
      </footer>
    </div>
  );
}