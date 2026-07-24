import React from 'react';

export default function Logo({ size = 24, className = "", showBackground = false }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="none" 
      width={size} 
      height={size} 
      className={className}
    >
      <defs>
        <linearGradient id="wm-logo-bg-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="50%" stopColor="#4338ca" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <linearGradient id="wm-logo-brand-grad" x1="80" y1="360" x2="420" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="45%" stopColor="#3b82f6" />
          <stop offset="85%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        <linearGradient id="wm-logo-emerald-grad" x1="300" y1="200" x2="440" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>

        <filter id="wm-logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {showBackground && (
        <>
          <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#wm-logo-bg-grad)" />
          <rect x="16" y="16" width="480" height="480" rx="108" fill="none" stroke="#818cf8" strokeWidth="6" strokeOpacity="0.35" />
        </>
      )}

      {/* Main Dynamic Ledger Growth 'W' Path */}
      <path 
        d="M 104 220 L 172 350 L 256 260 L 338 350 L 416 156" 
        stroke="url(#wm-logo-brand-grad)" 
        strokeWidth="38" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        filter="url(#wm-logo-glow)"
      />

      {/* Arrowhead at top right peak */}
      <path 
        d="M 346 156 H 416 V 226" 
        stroke="url(#wm-logo-emerald-grad)" 
        strokeWidth="38" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      {/* Glowing Ledger Data Nodes */}
      <circle cx="172" cy="350" r="14" fill="#06b6d4" />
      <circle cx="256" cy="260" r="14" fill="#3b82f6" />
      <circle cx="338" cy="350" r="14" fill="#10b981" />
      <circle cx="416" cy="156" r="16" fill="#34d399" />
    </svg>
  );
}
