import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine, AreaChart, Area, Cell 
} from 'recharts';
import { 
  Upload, Activity, Target, TrendingUp, Settings2, BrainCircuit, RefreshCw, 
  ShieldCheck, FileText, Database, ChevronRight, AlertCircle, 
  Layers, Gauge, History, Trash2, DownloadCloud, FileSignature, 
  MessageSquare, Send, X, Bot, User, ClipboardCheck, CheckCircle
} from 'lucide-react';
import { calculateStats, getHistogramData } from './services/statsEngine';
import { getAIInterpretation, startMetrologyChat } from './services/geminiService';
import { checkFAIRCriteria, FAIR_DOC_MAP, FAIR_CATEGORIES, FAIRCheckResult } from './services/fairService';
import { AnalysisResult, AIInsight, CSVData } from './types';
import { MetricCard } from './components/MetricCard';
import { ChartCard } from './components/ChartCard';
import { FAIRChecklist } from './components/FAIRChecklist';

const App: React.FC = () => {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [lsl, setLsl] = useState<number>(0);
  const [usl, setUsl] = useState<number>(100);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  
  // FAIR Module State
  const [fairCategory, setFairCategory] = useState('mechanical');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [formalFairResult, setFormalFairResult] = useState<FAIRCheckResult | null>(null);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('quality_engine_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const saveToHistory = (res: AnalysisResult) => {
    const newHistory = [res, ...history].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('quality_engine_history', JSON.stringify(newHistory));
  };

  const loadSampleData = () => {
    setIsLoading(true);
    setTimeout(() => {
      const target = 25.0;
      const tol = 0.25;
      const rows = Array.from({ length: 180 }, (_, i) => ({
        Batch_ID: `B-${1000 + i}`,
        Dimension_mm: Number((target + (Math.random() - 0.5) * 0.12 + (i > 150 ? 0.08 : 0)).toFixed(4)),
        Machine: i % 2 === 0 ? 'CNC-A' : 'CNC-B'
      }));
      setCsvData({ headers: ['Batch_ID', 'Dimension_mm', 'Machine'], rows });
      setSelectedColumn('Dimension_mm');
      setLsl(target - tol);
      setUsl(target + tol);
      const res = calculateStats(rows.map(r => r.Dimension_mm), 'Dimension_mm', target - tol, target + tol);
      setAnalysis(res);
      setAiInsight(null);
      setIsLoading(false);
      saveToHistory(res);
      chatSessionRef.current = startMetrologyChat(res);
      setChatMessages([{ role: 'model', text: "Metrology Advisor initialized. How can I assist with your process audit or FAIR documentation?" }]);
    }, 600);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = (e.target?.result as string).split(/\r?\n/).filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => {
          const v = values[i]?.trim().replace(/^"|"$/g, '');
          obj[h] = isNaN(Number(v)) ? v : Number(v);
        });
        return obj;
      });
      setCsvData({ headers, rows });
      const best = headers.find(h => typeof rows[0][h] === 'number') || headers[0];
      setSelectedColumn(best);
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const runAnalysis = useCallback(() => {
    if (!csvData || !selectedColumn) return;
    const values = csvData.rows.map(r => r[selectedColumn]).filter(v => typeof v === 'number') as number[];
    const res = calculateStats(values, selectedColumn, lsl, usl);
    setAnalysis(res);
    setAiInsight(null);
    saveToHistory(res);
    chatSessionRef.current = startMetrologyChat(res);
  }, [csvData, selectedColumn, lsl, usl, history]);

  const requestAIInterpretation = async () => {
    if (!analysis) return;
    setIsAIAnalyzing(true);
    try {
      setAiInsight(await getAIInterpretation(analysis));
    } catch (e) {
      alert("AI interpretation unavailable.");
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  const handleToggleDoc = (id: string) => {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    setFormalFairResult(null); // Clear formal result when checklist changes
  };

  const handleFAIRValidation = () => {
    const uploadedFiles: Record<string, boolean> = {};
    Object.keys(FAIR_DOC_MAP).forEach(id => {
      uploadedFiles[FAIR_DOC_MAP[id]] = selectedDocs.includes(id);
    });

    const categoryLabel = FAIR_CATEGORIES.find(c => c.id === fairCategory)?.label || "Mechanical";
    const result = checkFAIRCriteria(uploadedFiles, categoryLabel);
    setFormalFairResult(result);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSessionRef.current || isChatLoading) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const result = await chatSessionRef.current.sendMessage({ message: userMsg });
      setChatMessages(prev => [...prev, { role: 'model', text: result.text || "I'm sorry, I couldn't process that request." }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Error connecting to metrology engine." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const histogramData = useMemo(() => analysis ? getHistogramData(analysis.data, 15) : [], [analysis]);
  const runChartData = useMemo(() => analysis ? analysis.data.map((val, i) => ({ index: i + 1, value: val })) : [], [analysis]);

  return (
    <div className="min-h-screen pb-12 bg-[#f8fafc] text-slate-900 font-sans print:bg-white print:p-0 overflow-x-hidden">
      <div className="hidden report-header flex items-center justify-between border-b-4 border-slate-950 pb-8 mb-12 w-full">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Analysis Certificate</h1>
          <p className="text-xs font-bold text-slate-500 mt-2">METROLOGY ENGINE v4.5 // SPC AUDIT SYSTEM</p>
        </div>
        <div className="text-right text-xs font-bold space-y-1">
          <p>AUDIT ID: {Date.now().toString(36).toUpperCase()}</p>
          <p className="text-slate-400">TIMESTAMP: {new Date().toLocaleString()}</p>
        </div>
      </div>

      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 px-8 py-4 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-xl ring-2 ring-slate-50">
            <Gauge size={22} />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight">QualityEngine <span className="text-indigo-600">AI</span></h1>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Metrology Intelligence Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {analysis && (
            <button 
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all active:scale-95"
            >
              <MessageSquare size={14} /> ADVISOR CHAT
            </button>
          )}
          {csvData && (
            <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95">
              <DownloadCloud size={14} /> EXPORT REPORT
            </button>
          )}
        </div>
      </header>

      <div className={`fixed inset-y-0 right-0 w-full md:w-[420px] bg-white shadow-2xl z-[60] transform transition-transform duration-500 ease-in-out border-l border-slate-200 flex flex-col ${isChatOpen ? 'translate-x-0' : 'translate-x-full'} print:hidden`}>
        <div className="bg-slate-950 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight uppercase">Advisor Console</h3>
              <p className="text-[8px] text-indigo-300 uppercase tracking-widest">GEMINI 3 PRO SECURE CHANNEL</p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium shadow-sm ${
                msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none animate-pulse flex gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
          <div className="relative">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Query process drivers..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-5 pr-14 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
            <button 
              onClick={handleSendMessage}
              disabled={isChatLoading || !chatInput.trim()}
              className="absolute right-3 top-3 w-10 h-10 bg-slate-950 text-white rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[9px] text-slate-400 mt-4 text-center font-bold uppercase tracking-widest">
            ENGINEER-LEVEL SPC GUIDANCE SYSTEM
          </p>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto p-6 md:p-10 flex flex-col gap-10 print:block print:p-0">
        {!csvData ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-700">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-10 rotate-3 shadow-inner">
              <Layers size={40} />
            </div>
            <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase">Process Audit Engine</h2>
            <p className="text-slate-400 mb-12 max-w-lg text-center font-medium text-lg leading-relaxed">
              Upload metrology datasets to initialize automated Six Sigma mapping and Gemini-powered variance audits.
            </p>
            <div className="flex gap-6">
              <label className="cursor-pointer group">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                <div className="px-12 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 group-hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3">
                  <Upload size={20} /> DEPLOY DATASET
                </div>
              </label>
              <button onClick={loadSampleData} disabled={isLoading} className="px-12 py-5 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm">
                {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Database size={20} />} LIVE SIMULATOR
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 print:block">
            <div className="lg:col-span-3 space-y-8 print:hidden">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm sticky top-28">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Audit Parameters</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Feature</label>
                    <select value={selectedColumn} onChange={(e) => setSelectedColumn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none">
                      {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <label className="block text-[8px] font-black text-slate-400 mb-1 uppercase tracking-widest">LSL (Min)</label>
                      <input type="number" step="any" value={lsl} onChange={(e) => setLsl(Number(e.target.value))} className="w-full bg-transparent font-black mono text-lg outline-none" />
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <label className="block text-[8px] font-black text-slate-400 mb-1 uppercase tracking-widest">USL (Max)</label>
                      <input type="number" step="any" value={usl} onChange={(e) => setUsl(Number(e.target.value))} className="w-full bg-transparent font-black mono text-lg outline-none" />
                    </div>
                  </div>
                  <button onClick={runAnalysis} className="w-full bg-slate-950 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition-all shadow-xl active:scale-95 uppercase text-[10px] tracking-widest">
                    RECALCULATE SPC
                  </button>
                </div>
              </div>

              {analysis && (
                <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <BrainCircuit size={20} />
                      <h3 className="font-black text-xl tracking-tight">AI Audit Agent</h3>
                    </div>
                    <p className="text-xs text-indigo-100 mb-8 font-medium leading-relaxed">Deploy Gemini 3 Pro to interpret this distribution to find hidden variance drivers.</p>
                    <button onClick={requestAIInterpretation} disabled={isAIAnalyzing} className="w-full bg-white text-indigo-600 font-black py-4 rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-lg text-xs uppercase tracking-widest">
                      {isAIAnalyzing && <RefreshCw className="animate-spin" size={14} />} {isAIAnalyzing ? "AUDITING..." : "RUN AI AUDIT"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-9 space-y-10">
              {analysis ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4">
                    <MetricCard label="Cp Index" value={analysis.cp?.toFixed(3) || '0'} subtext="Potential Width" icon={<Target size={18} />} color={analysis.cp && analysis.cp >= 1.33 ? 'text-emerald-600' : 'text-slate-900'} />
                    <MetricCard label="Cpk Index" value={analysis.cpk?.toFixed(3) || '0'} subtext="Actual Capability" icon={<ShieldCheck size={18} />} color={analysis.cpk && analysis.cpk >= 1.33 ? 'text-emerald-600' : analysis.cpk && analysis.cpk < 1.0 ? 'text-rose-600' : 'text-slate-900'} />
                    <MetricCard label="Process Yield" value={`${analysis.yield.toFixed(1)}%`} subtext={`${analysis.outOfToleranceCount} Defective`} icon={<TrendingUp size={18} />} color={analysis.yield === 100 ? 'text-emerald-600' : 'text-amber-500'} />
                    <MetricCard label="X-Bar Mean" value={analysis.mean.toFixed(4)} subtext={`Sigma: ${analysis.stdDev.toFixed(4)}`} icon={<Activity size={18} />} />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 print:grid-cols-2">
                    <ChartCard title="Run Sequence Data" icon={<Activity size={14} />}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={runChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="index" hide />
                          <YAxis domain={['auto', 'auto']} stroke="#cbd5e1" fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                          <ReferenceLine y={usl} stroke="#f43f5e" strokeDasharray="5 5" label={{ position: 'right', value: 'USL', fill: '#f43f5e', fontSize: 10, fontWeight: '900' }} />
                          <ReferenceLine y={lsl} stroke="#f43f5e" strokeDasharray="5 5" label={{ position: 'right', value: 'LSL', fill: '#f43f5e', fontSize: 10, fontWeight: '900' }} />
                          <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={0.1} fill="#6366f1" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Process Distribution" icon={<Target size={14} />}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histogramData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="label" stroke="#cbd5e1" fontSize={8} interval={2} axisLine={false} />
                          <YAxis stroke="#cbd5e1" fontSize={10} axisLine={false} />
                          <Tooltip cursor={{fill: '#f8fafc'}} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#6366f1">
                            {histogramData.map((e, i) => (
                              <Cell key={`cell-${i}`} fill={e.binStart < lsl || e.binEnd > usl ? '#f43f5e' : '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>

                  <div className="space-y-6">
                    <FAIRChecklist 
                      selectedDocs={selectedDocs} 
                      onToggleDoc={handleToggleDoc} 
                      category={fairCategory} 
                      onCategoryChange={setFairCategory} 
                    />
                    
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-6">
                      {formalFairResult && (
                        <div className={`flex-1 p-6 rounded-2xl border animate-in slide-in-from-right duration-500 flex items-center gap-4 ${
                          formalFairResult.compliant 
                          ? 'bg-emerald-50 border-emerald-100' 
                          : 'bg-rose-50 border-rose-100'
                        }`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            formalFairResult.compliant ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          }`}>
                            {formalFairResult.compliant ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                          </div>
                          <div>
                            <h5 className={`font-black text-xs uppercase tracking-widest ${
                              formalFairResult.compliant ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              Formal Validation Result
                            </h5>
                            <p className={`text-sm font-bold ${
                              formalFairResult.compliant ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {formalFairResult.compliant 
                                ? "All FAIR criteria compliant for First Article submission." 
                                : `Documentation Gap Detected: ${formalFairResult.missing.join(", ")}`}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <button 
                        onClick={handleFAIRValidation}
                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95 whitespace-nowrap"
                      >
                        <CheckCircle size={16} />
                        Run Formal FAIR Check
                      </button>
                    </div>
                  </div>

                  {aiInsight && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden animate-in zoom-in-95 duration-500 print:shadow-none print:border-slate-300 print:rounded-none">
                      <div className="bg-slate-950 px-10 py-8 flex items-center justify-between text-white print:bg-white print:text-slate-900 print:border-b">
                        <div className="flex items-center gap-4">
                          <BrainCircuit size={24} className="text-indigo-400" />
                          <h4 className="font-black uppercase tracking-tight text-lg">AI Engineering Interpretation</h4>
                        </div>
                        <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20`}>
                          STATUS: {aiInsight.status}
                        </div>
                      </div>
                      <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-12 print:block">
                        <div className="lg:col-span-7 space-y-10">
                          <section>
                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Summary Conclusion</h5>
                            <p className="text-slate-900 text-2xl font-bold leading-tight tracking-tight">{aiInsight.summary}</p>
                          </section>
                          <section className="p-8 bg-slate-50 rounded-3xl border border-slate-100 relative print:bg-white print:border-slate-200">
                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Root Cause Hypothesis</h5>
                            <p className="text-slate-600 font-medium italic text-lg leading-relaxed">"{aiInsight.rootCauseAnalysis}"</p>
                          </section>
                        </div>
                        <div className="lg:col-span-5 space-y-6 print:border-t print:mt-10 print:pt-10">
                          <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Corrective Strategy</h5>
                          {aiInsight.recommendations.map((r, i) => (
                            <div key={i} className="flex gap-4 items-start group">
                              <div className="mt-1 w-8 h-8 flex-shrink-0 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-black shadow-md">{i+1}</div>
                              <p className="text-slate-700 font-bold text-base leading-tight pt-1.5">{r}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="hidden certificate-section px-10 pb-12 w-full">
                        <div className="flex justify-between items-end mt-12 pt-10 border-t border-slate-200">
                          <div className="space-y-4">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Digital Audit Hash</p>
                            <div className="flex items-center gap-2 text-indigo-600">
                              <FileSignature size={18} />
                              <span className="mono text-[10px] font-bold">GEMINI_SECURE_VERIFIED_SPC_78822</span>
                            </div>
                          </div>
                          <div className="text-right border-t-2 border-slate-950 w-64 pt-2">
                            <p className="text-[10px] font-black uppercase tracking-widest">Authorized Inspector Signature</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 min-h-[500px] flex items-center justify-center bg-white rounded-[3rem] border border-slate-200 shadow-sm text-center p-20 animate-in fade-in duration-1000">
                  <div>
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-inner ring-1 ring-slate-100">
                      <Settings2 className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Audit Standby</h3>
                    <p className="text-slate-400 max-w-sm mb-10 text-lg">Define the measurement targets and thresholds to begin the process audit.</p>
                    <button onClick={loadSampleData} className="text-indigo-600 font-black hover:text-indigo-800 transition-all flex items-center gap-3 mx-auto uppercase tracking-widest text-xs px-8 py-4 bg-indigo-50 rounded-2xl active:scale-95">
                      Initialize Simulator <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto px-10 py-10 border-t border-slate-200 bg-white flex items-center justify-between text-slate-300 text-[9px] font-black uppercase tracking-[0.3em] print:hidden">
        <div className="flex items-center gap-6">
          <span>&copy; 2025 QUALITY ENGINE AI</span>
          <span>|</span>
          <span>ISO-13485 / AS-9100 COMPLIANT ARCHITECTURE</span>
        </div>
        <div className="flex items-center gap-4 text-emerald-500 bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> ENGINE NOMINAL
        </div>
      </footer>
    </div>
  );
};

export default App;