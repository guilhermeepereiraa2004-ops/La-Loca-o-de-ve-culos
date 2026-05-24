import React, { useEffect, useState } from 'react';

const Loader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1.25; // Reaches 100% in 2 seconds (1.25 * 80 steps)
      });
    }, 25);

    const timeout = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 700); // 700ms elegant fadeout & zoom transition
    }, 3000); // Total 3 seconds

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070707] transition-all duration-[700ms] ease-in-out ${fadeOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.08)_0%,rgba(7,7,7,0)_70%)] animate-pulse duration-[4000ms]" />

      <div className="relative flex flex-col items-center justify-center text-center">
        {/* Circle spinner & logo */}
        <div className="w-32 h-32 mb-12 relative flex items-center justify-center">
          {/* Static thin gold ring */}
          <div className="absolute inset-0 border-2 border-[#C5A059]/10 rounded-full" />
          
          {/* Animated spinning gold segment */}
          <div className="absolute inset-0 border-2 border-t-[#C5A059] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin duration-[1500ms]" />
          
          {/* Company Logo Image */}
          <div className="absolute inset-3 flex items-center justify-center bg-[#070707] rounded-full overflow-hidden">
            <img 
              src="/logo.png" 
              alt="LA" 
              className="w-16 h-16 object-contain select-none brightness-0 invert opacity-90" 
            />
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="w-48 h-[1px] bg-neutral-900 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-[#C5A059] to-[#F4E3C1] transition-all duration-75 ease-out shadow-[0_0_8px_rgba(197,160,89,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Loader;
