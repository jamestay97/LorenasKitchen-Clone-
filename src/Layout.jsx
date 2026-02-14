import React from 'react';
import { Toaster } from "sonner";
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const location = useLocation();
  const isAdmin = location.pathname.includes('/admin') || location.pathname.includes('/login');

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

      {/* NEW: Navigation Bar */}
      <nav className="bg-white/50 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Replace the text <Link ...>Lorena's Kitchen</Link> with this: */}
<Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
  <img 
    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6944e802ebbb976a9a2791a1/e01294408_logo_optimized_1000.png" 
    alt="Lorena's Home Cooked Meals" 
    className="h-12 w-auto object-contain" // Adjust h-12 to make it bigger/smaller
  />
</Link>
            
            <div className="flex gap-4">
              <Link to="/" className="text-sm font-medium hover:text-[#1b4d3e] transition-colors">
                Menu
              </Link>
              {/* This ensures you go to the LOCAL login, not the old website */}
              <Link to="/login" className="text-sm font-medium hover:text-[#1b4d3e] transition-colors">
                Admin Login
              </Link>
            </div>
        </div>
      </nav>

      <div className={`flex-1 flex flex-col w-full ${!isAdmin ? '' : 'max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
        {children}
      </div>

      <Toaster />
    </div>
  );
}