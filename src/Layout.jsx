import React from 'react';
import { Toaster } from "sonner";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col font-sans text-[#1d1d1f] antialiased selection:bg-[#1b4d3e] selection:text-white">
      {/* Fonts & Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap');
        
        :root {
          --brand: #1b4d3e;
          --brand-light: #e6f0eb;
          --bg-color: #f4f5f0;
          --card-bg: #ffffff;
        }

        body {
          background-color: var(--bg-color);
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
        }

        .font-fresh {
          font-family: 'Caveat', cursive;
        }
      `}</style>

      <div className="flex-1 flex flex-col max-w-[1000px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>

      <Toaster />
    </div>
  );
}