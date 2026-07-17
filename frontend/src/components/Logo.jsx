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
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="60%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path 
        d="M22 38 L37 72 L52 48 L67 72 L82 28" 
        stroke="url(#logo-grad)" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M70 28 H82 V40" 
        stroke="#10b981" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle cx="37" cy="72" r="3.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
      <circle cx="52" cy="48" r="3.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
      <circle cx="67" cy="72" r="3.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
    </svg>
  );
}
