
import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  subtext, 
  color = "text-slate-900", 
  icon 
}) => {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-default">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors`}>
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-3xl font-black tracking-tighter mono ${color}`}>
        {value}
      </div>
      {subtext && (
        <div className="mt-3 text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-2">
          {subtext}
        </div>
      )}
    </div>
  );
};
