import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/Button';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-page/10 relative font-sans selection:bg-accent-lavender/30 selection:text-accent-dark">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent-dark focus:text-white focus:rounded-pill focus:font-bold focus:text-sm">
        Lewati ke konten utama
      </a>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-accent-dark/20 backdrop-blur-md z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:block print:hidden
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 w-full flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-glass backdrop-blur-glass border-b border-white/40 sticky top-0 z-30 print:hidden shadow-glass">
            <img 
              src="/logo-perusahaan.png" 
              alt="Company Logo" 
              className="h-8 w-auto object-contain mix-blend-multiply"
            />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar-nav"
            className="p-2 h-10 w-10 text-text-primary hover:bg-white/40"
          >
            {isSidebarOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </Button>
        </header>

        <div id="main-content" className="flex-1 px-4 py-6 md:px-8 md:py-12 overflow-y-auto overflow-x-hidden transition-all duration-300 print:p-0 print:overflow-visible">
          <div className="max-w-[1600px] mx-auto space-y-8 md:space-y-12 print:max-w-none print:space-y-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
