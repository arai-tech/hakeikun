import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Download, Code, Play, Layout, Settings2, Upload, FileJson, Copy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Signal, TimingChartConfig } from './types';
import { TimingChartRenderer, TimingChartRef } from './components/TimingChartRenderer';
import { cn } from './lib/utils';
import { dbService } from './services/db';

const DEFAULT_SIGNALS: Signal[] = [
  { id: '1', name: 'clk', wave: 'p.....|...', showGrid: true, slopeDuration: 0.1, phaseShift: 0, hasSlope: true },
  { id: '2', name: 'dat', wave: 'x.345x|=.x', data: ['head', 'body', 'tail', 'data'], showLabels: true, slopeDuration: 0.2, phaseShift: 0.1, hasSlope: true, hasShift: true },
  { id: '3', name: 'req', wave: '_.~.._|~._', slopeDuration: 0.2, phaseShift: 0.1, hasSlope: true, hasShift: true },
  { id: '4', name: 'ack', wave: '~.....|_~.', slopeDuration: 0.2, phaseShift: 0.1, hasSlope: true, hasShift: true },
];

export default function App() {
  const chartRef = useRef<TimingChartRef>(null);
  const [signals, setSignals] = useState<(Signal | {})[]>(DEFAULT_SIGNALS);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'settings' | 'chart'>('settings');
  const [viewMode, setViewMode] = useState<'ui' | 'json'>('ui');
  const [error, setError] = useState<string | null>(null);
  const [chartWidthScale, setChartWidthScale] = useState(100);
  const isInitialMount = useRef(true);

  // Load signals on mount
  useEffect(() => {
    const init = async () => {
      await dbService.requestPersistentStorage();
      const saved = await dbService.loadSignals();
      if (saved && saved.length > 0) {
        setSignals(saved);
      }
    };
    init();
  }, []);

  // Save signals on change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    dbService.saveSignals(signals);

    const config: TimingChartConfig = {
      signal: signals
    };
    setJsonInput(JSON.stringify(config, null, 2));
  }, [signals]);

  const handleAddSignal = () => {
    const newSignal: Signal = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'new_sig',
      wave: '_.r.f',
      slopeDuration: 0.2,
      phaseShift: 0.1,
      hasSlope: true,
      hasShift: true,
      showGrid: false,
      showLabels: false,
    };
    setSignals([...signals, newSignal]);
  };

  const handleAddSpacer = () => {
    setSignals([...signals, {}]);
  };

  const handleUpdateSignal = (id: string, updates: Partial<Signal>) => {
    setSignals(signals.map(s => {
      if ('id' in s && s.id === id) {
        return { ...s, ...updates };
      }
      return s;
    }));
  };

  const handleRemoveSignal = (index: number) => {
    setSignals(signals.filter((_, i) => i !== index));
  };

  const handleJsonChange = (val: string) => {
    setJsonInput(val);
    if (!val.trim()) {
      setError(null);
      return;
    }
    try {
      // Clean up potential smart quotes or other common copy-paste issues
      const cleanVal = val.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
      const parsed = JSON.parse(cleanVal);
      if (parsed.signal && Array.isArray(parsed.signal)) {
        const signalsWithIds = parsed.signal.map((s: any) => {
          if (Object.keys(s).length > 0 && !s.id) {
            return { ...s, id: Math.random().toString(36).substr(2, 9) };
          }
          return s;
        });
        setSignals(signalsWithIds);
        setError(null);
      } else {
        setError('JSON must contain a "signal" array');
      }
    } catch (e) {
      setError('Invalid JSON format: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonInput);
  };

  const handleClearSignals = () => {
    if (confirm('Are you sure you want to clear all signals?')) {
      setSignals([]);
    }
  };

  const handleExportJson = () => {
    const config: TimingChartConfig = { signal: signals };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timing-chart-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleJsonChange(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#212121] font-sans selection:bg-[#212121] selection:text-[#F5F5F5]">
      {/* Header */}
      <header className="border-b border-[#BDBDBD] bg-white sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#212121] rounded flex items-center justify-center">
              <Play className="text-white w-5 h-5 fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">波形君</h1>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-[#BDBDBD]">
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
              activeTab === 'settings' 
                ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                : "border-transparent text-[#212121]/60 hover:bg-black/5"
            )}
          >
            信号設定
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={cn(
              "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
              activeTab === 'chart' 
                ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                : "border-transparent text-[#212121]/60 hover:bg-black/5"
            )}
          >
            タイミングチャート
          </button>
        </div>
      </header>

      <main className="h-[calc(100vh-113px)] overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto p-6 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest opacity-50">Signal Configuration</h2>
                  <div className="flex bg-white border border-[#BDBDBD] rounded p-1">
                    <button 
                      onClick={() => setViewMode('ui')}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded transition-colors",
                        viewMode === 'ui' ? "bg-[#212121] text-white" : "text-[#212121]/60 hover:bg-black/5"
                      )}
                    >
                      UI
                    </button>
                    <button 
                      onClick={() => setViewMode('json')}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded transition-colors",
                        viewMode === 'json' ? "bg-[#212121] text-white" : "text-[#212121]/60 hover:bg-black/5"
                      )}
                    >
                      JSON
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleClearSignals}
                    className="p-1.5 border border-[#BDBDBD] hover:bg-red-600 hover:text-white transition-colors rounded"
                    title="Clear All"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJson}
                    className="hidden"
                    id="import-json"
                  />
                  <label
                    htmlFor="import-json"
                    className="p-1.5 border border-[#BDBDBD] hover:bg-[#212121] hover:text-white transition-colors rounded cursor-pointer"
                    title="Import JSON"
                  >
                    <Upload className="w-4 h-4" />
                  </label>
                  <button 
                    onClick={handleExportJson}
                    className="p-1.5 border border-[#BDBDBD] hover:bg-[#212121] hover:text-white transition-colors rounded"
                    title="Export JSON"
                  >
                    <FileJson className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleAddSpacer}
                    className="p-1.5 border border-[#BDBDBD] hover:bg-[#212121] hover:text-white transition-colors rounded"
                    title="Add Spacer"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleAddSignal}
                    className="p-1.5 border border-[#BDBDBD] hover:bg-[#212121] hover:text-white transition-colors rounded"
                    title="Add Signal"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {viewMode === 'ui' ? (
                <div className="space-y-4">
                  {signals.map((sig, idx) => (
                    <motion.div
                      key={'id' in sig ? sig.id : `spacer-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white border border-[#BDBDBD] rounded-lg shadow-sm relative group"
                    >
                      {'name' in sig ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <input
                              value={sig.name}
                              onChange={(e) => handleUpdateSignal(sig.id, { name: e.target.value })}
                              className="bg-transparent border-none p-0 font-mono font-bold text-blue-600 focus:ring-0 w-1/2"
                              placeholder="Signal Name"
                            />
                            <button 
                              onClick={() => handleRemoveSignal(idx)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 transition-all rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-6 py-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input
                                  type="checkbox"
                                  checked={sig.showGrid || false}
                                  onChange={(e) => handleUpdateSignal(sig.id, { showGrid: e.target.checked })}
                                  className="sr-only"
                                />
                                <div className={cn(
                                  "w-8 h-4 rounded-full transition-colors",
                                  sig.showGrid ? "bg-blue-600" : "bg-[#BDBDBD]"
                                )} />
                                <div className={cn(
                                  "absolute left-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                  sig.showGrid ? "translate-x-4" : "translate-x-0"
                                )} />
                              </div>
                              <span className="text-[10px] uppercase font-bold opacity-60 group-hover:opacity-100 transition-opacity">グリッド線を表示</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input
                                  type="checkbox"
                                  checked={sig.showLabels || false}
                                  onChange={(e) => handleUpdateSignal(sig.id, { showLabels: e.target.checked })}
                                  className="sr-only"
                                />
                                <div className={cn(
                                  "w-8 h-4 rounded-full transition-colors",
                                  sig.showLabels ? "bg-blue-600" : "bg-[#BDBDBD]"
                                )} />
                                <div className={cn(
                                  "absolute left-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                  sig.showLabels ? "translate-x-4" : "translate-x-0"
                                )} />
                              </div>
                              <span className="text-[10px] uppercase font-bold opacity-60 group-hover:opacity-100 transition-opacity">データラベルを有効化</span>
                            </label>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold opacity-40">Wave String</label>
                            <input
                              value={sig.wave}
                              onChange={(e) => handleUpdateSignal(sig.id, { wave: e.target.value })}
                              className="w-full bg-[#F5F5F5] border border-[#BDBDBD]/50 rounded px-2 py-1.5 font-mono text-sm focus:border-blue-500 outline-none transition-colors"
                              placeholder="e.g. _,~,r,f,0,1,2"
                            />
                          </div>
                          {sig.showLabels && (
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold opacity-40">Data Labels</label>
                              <input
                                value={sig.data?.join(', ') || ''}
                                onChange={(e) => handleUpdateSignal(sig.id, { data: e.target.value.split(',').map(s => s.trim()) })}
                                className="w-full bg-[#F5F5F5] border border-[#BDBDBD]/50 rounded px-2 py-1.5 font-mono text-sm focus:border-blue-500 outline-none transition-colors"
                                placeholder="head, body, tail"
                              />
                            </div>
                          )}
                          <div className="pt-2 space-y-4">
                            {/* Tilt Slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] uppercase font-bold opacity-40">傾き (Slope): {Math.round((sig.slopeDuration || 0) * 100)}%</label>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={sig.slopeDuration || 0}
                                onChange={(e) => handleUpdateSignal(sig.id, { slopeDuration: parseFloat(e.target.value), hasSlope: parseFloat(e.target.value) > 0 })}
                                className="w-full h-1.5 bg-[#F5F5F5] rounded-lg appearance-none cursor-pointer accent-blue-600 border border-[#BDBDBD]/50"
                              />
                            </div>

                            {/* Shift Slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] uppercase font-bold opacity-40">
                                  タイミング調整 (Shift): {sig.phaseShift && sig.phaseShift > 0 ? '+' : ''}{Math.round((sig.phaseShift || 0) * 100)}%
                                </label>
                                <span className="text-[10px] font-mono opacity-30">
                                  ({(sig.phaseShift || 0) < 0 ? '左' : (sig.phaseShift || 0) > 0 ? '右' : 'なし'})
                                </span>
                              </div>
                              <input 
                                type="range"
                                min="-0.5"
                                max="0.5"
                                step="0.1"
                                value={sig.phaseShift || 0}
                                onChange={(e) => handleUpdateSignal(sig.id, { phaseShift: parseFloat(e.target.value), hasShift: Math.abs(parseFloat(e.target.value)) > 0 })}
                                className="w-full h-1.5 bg-[#F5F5F5] rounded-lg appearance-none cursor-pointer accent-blue-600 border border-[#BDBDBD]/50"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-xs italic opacity-40">Spacer Row</span>
                          <button 
                            onClick={() => handleRemoveSignal(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <div className="absolute right-2 top-2 flex gap-2">
                    <button 
                      onClick={handleCopyJson}
                      className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                      title="Copy to Clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    className="w-full h-[calc(100vh-300px)] bg-[#212121] text-[#9BFC9B] p-4 font-mono text-sm rounded border border-[#212121] focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    spellCheck={false}
                  />
                  {error && (
                    <div className="text-red-600 text-xs font-mono bg-red-50 p-2 border border-red-200 rounded">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Syntax Guide & Color Legend */}
              <div className="mt-12 p-6 border border-[#BDBDBD] bg-white rounded-lg shadow-sm space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4">Wave String Syntax</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-[11px]">
                    <div className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-mono font-bold text-blue-600">~</span>
                      <span className="opacity-70">High</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-mono font-bold text-blue-600">_</span>
                      <span className="opacity-70">Low</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-mono font-bold text-blue-600">r</span>
                      <span className="opacity-70">High+点線</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-mono font-bold text-blue-600">f</span>
                      <span className="opacity-70">Low+点線</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-mono font-bold text-blue-600">p, n, d</span>
                      <span className="opacity-70">Pulse</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-mono font-bold text-blue-600">x</span>
                      <span className="opacity-70">不定 (Undefined)</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-mono font-bold text-blue-600">.</span>
                      <span className="opacity-70">1周期継続</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-mono font-bold text-blue-600">,</span>
                      <span className="opacity-70">0.5周期継続</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-mono font-bold text-blue-600">|</span>
                      <span className="opacity-70">ギャップ (省略)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4">Data Bus Colors (0-9)</h3>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                    {[
                      { val: '0', color: '#ffffff', label: 'White' },
                      { val: '1', color: '#E3F2FD', label: 'Blue' },
                      { val: '2', color: '#F1F8E9', label: 'Green' },
                      { val: '3', color: '#FFF3E0', label: 'Orange' },
                      { val: '4', color: '#F3E5F5', label: 'Purple' },
                      { val: '5', color: '#E0F2F1', label: 'Teal' },
                      { val: '6', color: '#FFFDE7', label: 'Yellow' },
                      { val: '7', color: '#FBE9E7', label: 'D-Org' },
                      { val: '8', color: '#EFEBE9', label: 'Brown' },
                      { val: '9', color: '#ECEFF1', label: 'Grey' },
                    ].map((item) => (
                      <div key={item.val} className="flex flex-col items-center gap-1">
                        <div 
                          className="w-full h-8 rounded border border-[#BDBDBD]/50 flex items-center justify-center font-mono font-bold text-[10px]"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.val}
                        </div>
                        <span className="text-[8px] uppercase font-bold opacity-40">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chart"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-auto p-6 flex flex-col items-center"
            >
              <div className="w-full max-w-5xl space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Live Rendering</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <TimingChartRenderer 
                    ref={chartRef} 
                    signals={signals} 
                    widthScale={chartWidthScale / 100}
                  />
                  <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-[#BDBDBD] shadow-sm">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm font-medium text-zinc-700">表示倍率:</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="200"
                      step="10"
                      value={chartWidthScale}
                      onChange={(e) => setChartWidthScale(parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                    />
                    <span className="text-sm font-mono font-bold text-zinc-900 w-12 text-right">
                      {chartWidthScale}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
