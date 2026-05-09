import React from 'react';

export const EditorialLabel = ({ children, className = "" }) => (
  <div className={`text-[10px] uppercase tracking-[0.4em] font-black ${className}`}>
    {children}
  </div>
);
