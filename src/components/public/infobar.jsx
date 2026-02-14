import React from 'react';
import { Smartphone, CreditCard, Package } from 'lucide-react';

export default function InfoBar() {
  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-stone-200/50 border border-stone-100 p-6 md:p-8 flex flex-col md:flex-row items-center justify-around gap-8 text-center md:text-left">
      <div className="flex flex-col items-center md:items-start gap-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-4 h-4" /> Pricing
        </span>
        <div className="flex items-baseline gap-1.5 text-[#1b4d3e]">
          <span className="text-3xl font-bold">$150</span>
          <span className="text-sm font-medium text-stone-500">/ 10 meals</span>
        </div>
      </div>

      <div className="w-px h-14 bg-stone-100 hidden md:block" />
      <div className="h-px w-full bg-stone-100 block md:hidden" />

      <div className="flex flex-col items-center md:items-start gap-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
          <Smartphone className="w-4 h-4" /> To order
        </span>
        <a
          href="tel:8134265096"
          className="text-[#1b4d3e] font-bold text-lg hover:underline"
        >
          (813) 426-5096
        </a>
        <span className="text-xs text-stone-500">Text or call</span>
      </div>

      <div className="w-px h-14 bg-stone-100 hidden md:block" />
      <div className="h-px w-full bg-stone-100 block md:hidden" />

      <div className="flex flex-col items-center md:items-start gap-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
          <CreditCard className="w-4 h-4" /> Payment
        </span>
        <span className="text-[#1b4d3e] font-bold">Zelle / Apple Cash</span>
        <span className="text-xs text-stone-500">lorenaolivar03@gmail.com</span>
      </div>
    </div>
  );
}
