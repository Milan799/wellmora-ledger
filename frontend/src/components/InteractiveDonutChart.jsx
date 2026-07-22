import React, { useState } from 'react';

export default function InteractiveDonutChart({ 
  data = [], 
  currencySymbol = 'INR', 
  centerLabel = 'Total' 
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  // Calculate total
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Formatting currency helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencySymbol,
      maximumFractionDigits: 0 // Keep it clean for chart overlays
    }).format(val);
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl min-h-[220px]">
        <span className="text-xs font-semibold italic">No data to display in chart</span>
      </div>
    );
  }

  // Math variables
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89
  
  // Compute slices with math values
  let accumulatedPercent = 0;
  const slices = data.map((item, idx) => {
    const percentage = item.value / total;
    const dashArray = `${percentage * circumference} ${circumference}`;
    const rotationAngle = -90 + (accumulatedPercent * 360);
    accumulatedPercent += percentage;

    return {
      ...item,
      percentage: percentage * 100,
      dashArray,
      rotationAngle,
      index: idx
    };
  });

  // Active slice details
  const activeSlice = activeIndex !== null ? slices[activeIndex] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-white/40 dark:bg-slate-900/10 rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
      
      {/* SVG Donut */}
      <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
        >
          {/* Base circle background */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800/40"
            strokeWidth="9"
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isActive = activeIndex === slice.index;
            return (
              <circle
                key={slice.label}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={slice.color || "currentColor"}
                strokeWidth={isActive ? "12" : "9"}
                strokeDasharray={slice.dashArray}
                transform={`rotate(${slice.rotationAngle} 50 50)`}
                strokeLinecap={slice.percentage > 2 ? "round" : "butt"} // Round caps look beautiful on reasonable percentages
                className="transition-all duration-300 cursor-pointer origin-center hover:opacity-95"
                onMouseEnter={() => setActiveIndex(slice.index)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center overlay text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none select-none">
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate max-w-[85px]">
            {activeSlice ? activeSlice.label : centerLabel}
          </span>
          <span className="text-xs font-black text-slate-850 dark:text-slate-100 tracking-tight mt-0.5">
            {activeSlice ? formatCurrency(activeSlice.value) : formatCurrency(total)}
          </span>
          <span className="text-[9px] font-extrabold text-violet-600 dark:text-violet-400 mt-0.5">
            {activeSlice ? `${activeSlice.percentage.toFixed(1)}%` : '100%'}
          </span>
        </div>
      </div>

      {/* Legend / Info list */}
      <div className="flex-1 w-full space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
        {slices.map((slice) => {
          const isActive = activeIndex === slice.index;
          return (
            <div 
              key={slice.label}
              className={`flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/80 shadow-sm scale-[1.01]' 
                  : 'bg-transparent border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
              }`}
              onMouseEnter={() => setActiveIndex(slice.index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-350 truncate">
                  {slice.label}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                  {formatCurrency(slice.value)}
                </span>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">
                  {slice.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
