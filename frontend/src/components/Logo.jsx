import React from 'react';

export default function Logo({ size = 32, className = "", showBackground = false }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="50 110 412 290" 
      fill="none" 
      width={size} 
      height={(size * 290) / 412} 
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="wm-facet-1" x1="60" y1="120" x2="160" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        <linearGradient id="wm-facet-2" x1="160" y1="380" x2="256" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        <linearGradient id="wm-facet-3" x1="256" y1="180" x2="352" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        <linearGradient id="wm-facet-4" x1="352" y1="380" x2="452" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        <filter id="wm-origami-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {showBackground && (
        <rect x="50" y="110" width="412" height="290" rx="48" fill="#0b0f19" />
      )}

      {/* 4 Origami Faceted Wings of 'W' (Full-bleed, No Dots) */}
      <g filter="url(#wm-origami-glow)">
        <path d="M 75 140 L 155 370 L 215 220 L 145 140 Z" fill="url(#wm-facet-1)" />
        <path d="M 215 220 L 155 370 L 256 270 Z" fill="url(#wm-facet-2)" opacity="0.95" />
        <path d="M 256 270 L 357 370 L 297 220 Z" fill="url(#wm-facet-3)" opacity="0.95" />
        <path d="M 297 220 L 357 370 L 437 140 L 367 140 Z" fill="url(#wm-facet-4)" />
      </g>
    </svg>
  );
}
