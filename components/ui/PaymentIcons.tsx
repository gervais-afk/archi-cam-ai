import React from "react";

export const OrangeMoneyIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <div className={`${className} bg-[#FF6600] rounded flex items-center justify-center p-1 shadow-sm`}>
    <span className="text-white font-black text-[8px] italic leading-tight">Orange</span>
  </div>
);

export const MtnMoMoIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <div className={`${className} bg-[#FFCC00] rounded flex items-center justify-center p-1 shadow-sm border border-[#FFCC00]`}>
    <div className="w-full h-full bg-white rounded-full flex items-center justify-center border-[1.5px] border-[#004F9F]">
       <span className="text-[#004F9F] font-black text-[6px]">MTN</span>
    </div>
  </div>
);

export const CreditCardIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <div className={`${className} bg-anthracite-800 rounded flex items-center justify-center p-1 border border-white/10`}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white w-full h-full">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  </div>
);
