import React from 'react';
import { CheckCircle2, AlertCircle, FileStack, ClipboardCheck } from 'lucide-react';
import { FAIR_DOC_MAP, FAIR_CATEGORIES, evaluateFAIRCompliance } from '../services/fairService';

interface FAIRChecklistProps {
  selectedDocs: string[];
  onToggleDoc: (id: string) => void;
  category: string;
  onCategoryChange: (id: string) => void;
}

export const FAIRChecklist: React.FC<FAIRChecklistProps> = ({
  selectedDocs,
  onToggleDoc,
  category,
  onCategoryChange
}) => {
  const analysis = evaluateFAIRCompliance(selectedDocs, category);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-full">
      <div className="md:w-1/3 bg-slate-50 p-8 border-r border-slate-200 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <ClipboardCheck size={20} />
          </div>
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">FAIR Audit Matrix</h3>
        </div>

        <div className="space-y-6 flex-1">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Component Class</label>
            <div className="space-y-2">
              {FAIR_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(cat.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    category === cat.id 
                    ? 'bg-slate-950 text-white shadow-lg' 
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-8 p-6 rounded-2xl border transition-all ${
          analysis.isCompliant 
          ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
          : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {analysis.isCompliant ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="font-black text-[10px] uppercase tracking-widest">
              {analysis.isCompliant ? 'Compliant' : 'Documentation Gap'}
            </span>
          </div>
          <p className="text-sm font-bold leading-tight">
            {analysis.isCompliant 
              ? 'Ready for first-article submission.' 
              : `${analysis.missing.length} mandatory documents missing.`}
          </p>
        </div>
      </div>

      <div className="md:w-2/3 p-8">
        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Documentation Checklist</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(FAIR_DOC_MAP).map(([id, label]) => {
            const isRequired = FAIR_CATEGORIES.find(c => c.id === category)?.requirements.includes(id);
            const isSelected = selectedDocs.includes(id);

            return (
              <button
                key={id}
                onClick={() => onToggleDoc(id)}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${
                  isSelected 
                  ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                  : 'bg-white border-slate-100 hover:border-slate-200'
                } ${!isRequired && 'opacity-40 hover:opacity-100 grayscale'}`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                  isSelected 
                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                  : 'border-slate-300'
                }`}>
                  {isSelected && <CheckCircle2 size={12} />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-700">{label}</div>
                  {isRequired && (
                    <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest mt-0.5 block">Mandatory</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};