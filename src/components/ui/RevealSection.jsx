import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

export const RevealSection = ({ children, className = "" }) => {
  const [ref, revealed] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        } ${className}`}
    >
      {children}
    </div>
  );
};
