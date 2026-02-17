
import React from 'react';

interface ChartCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm print:border-slate-300">
      <div className="flex items-center justify-between mb-8">
        <h4 className="font-black text-slate-800 flex items-center gap-2 uppercase text-[10px] tracking-[0.25em]">
          {icon}
          {title}
        </h4>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[10px] font-bold text-slate-400">Real-time</span>
        </div>
      </div>
      <div className="h-[320px]">
        {children}
      </div>
    </div>
  );
};
