import React from 'react';
import { Smartphone } from 'lucide-react';

export default function InfoBar() {
  return (
    <div className="mt-10 bg-white rounded-[20px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.12)] p-6 md:p-8 flex flex-col md:flex-row items-center justify-around gap-6 text-center md:text-left border border-black/5">
      
      {/* Pricing */}
      <div className="flex flex-col items-center md:items-start gap-1">
        <span className="text-sm text-[#86868b] uppercase tracking-wide font-medium">Pricing</span>
        <div className="flex items-baseline gap-1 text-[#1b4d3e]">
          <span className="text-2xl font-bold">$150</span>
          <span className="text-sm font-medium">/ 10 meals</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-12 bg-gray-100 hidden md:block" />
      <div className="h-px w-full bg-gray-100 block md:hidden" />

      {/* To Order */}
      <div className="flex flex-col items-center md:items-start gap-1">
        <span className="text-sm text-[#86868b] uppercase tracking-wide font-medium">To Order</span>
        <div className="flex items-center gap-2 text-[#1b4d3e] font-bold">
          <Smartphone className="w-4 h-4" />
          <span>Text (813) 426-5096</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-12 bg-gray-100 hidden md:block" />
      <div className="h-px w-full bg-gray-100 block md:hidden" />

      {/* Payment */}
      <div className="flex flex-col items-center md:items-start gap-1">
        <span className="text-sm text-[#86868b] uppercase tracking-wide font-medium">Payment</span>
        <div className="flex flex-col items-center md:items-start">
          <span className="text-[#1b4d3e] font-bold">Zelle / Apple Cash</span>
          <span className="text-xs text-gray-400">lorenaolivar03@gmail.com</span>
        </div>
      </div>
    </div>
  );
}