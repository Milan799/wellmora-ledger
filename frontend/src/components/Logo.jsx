import React from 'react';

export default function Logo({ size = 20, className = "" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      fill="none" 
      width={size} 
      height={size} 
      className={className}
    >
      {/* Main ribbon body - solid indigo */}
      <path 
        d="M22 38 L37 72 L52 48 L67 72 L82 28" 
        stroke="#6366f1" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Arrow head - solid emerald */}
      <path 
        d="M70 28 H82 V40" 
        stroke="#10b981" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Ledger nodes - solid colored dots */}
      <circle cx="37" cy="72" r="4.5" fill="#10b981" />
      <circle cx="52" cy="48" r="4.5" fill="#6366f1" />
      <circle cx="67" cy="72" r="4.5" fill="#10b981" />
    </svg>
  );
}
