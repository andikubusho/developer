import React, { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ErrorBoundary from './ErrorBoundary';
import { Menu, X, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

const PageLoader = () => (
  <div className="flex items-center justify-center py-32">
    <RefreshCw className="w-8 h-8 animate-spin text-accent-dark/40" />
  </div>
);

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-page relative font-sans selection:bg-accent-lavender/30 selection:text-accent-dark overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-white/80 via-transparent to-slate-200/50 pointer-events-none" />
      
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent-dark focus:text-white focus:rounded-pill focus:font-bold focus:text-sm">
        Lewati ke konten utama
      </a>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-accent-dark/10 backdrop-blur-md z-40 lg:hidden"
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

      <main className="flex-1 w-full flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-6 bg-white/40 backdrop-blur-xl border-b border-white/40 sticky top-0 z-30 print:hidden shadow-3d">
            <img 
              src="/logo-perusahaan.png" 
              alt="Company Logo" 
              className="h-10 w-auto object-contain mix-blend-multiply"
            />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 h-12 w-12 rounded-2xl glass-card flex items-center justify-center"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </header>

        <div id="main-content" className="flex-1 px-4 py-8 md:px-10 md:py-12 overflow-y-auto overflow-x-hidden transition-all duration-300 print:p-0 print:overflow-visible scrollbar-hide">
          <div className="max-w-[1600px] mx-auto space-y-8 md:space-y-12 print:max-w-none print:space-y-0 min-w-0">
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
