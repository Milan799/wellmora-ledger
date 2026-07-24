import React, { useId } from 'react';

export default function Logo({ size = 34, className = "", showBackground = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g1 = `wm-f1-${uid}`;
  const g2 = `wm-f2-${uid}`;
  const g3 = `wm-f3-${uid}`;
  const g4 = `wm-f4-${uid}`;

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="none" 
      width={size} 
      height={size} 
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={g1} x1="40" y1="80" x2="160" y2="440" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        <linearGradient id={g2} x1="160" y1="440" x2="256" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        <linearGradient id={g3} x1="256" y1="200" x2="352" y2="440" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        <linearGradient id={g4} x1="352" y1="440" x2="480" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {showBackground && (
        <rect x="16" y="16" width="480" height="480" rx="96" fill="#0b0f19" stroke="#334155" strokeWidth="4" />
      )}

      {/* 4 Origami Faceted Wings of 'W' (Centered 512x512 with dynamic IDs) */}
      <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
        <path d="M 32 80 L 135 432 L 210 240 L 120 80 Z" fill={`url(#${g1})`} />
        <path d="M 210 240 L 135 432 L 256 300 Z" fill={`url(#${g2})`} opacity="0.95" />
        <path d="M 256 300 L 377 432 L 302 240 Z" fill={`url(#${g3})`} opacity="0.95" />
        <path d="M 302 240 L 377 432 L 480 80 L 392 80 Z" fill={`url(#${g4})`} />
      </g>
    </svg>
  );
}
