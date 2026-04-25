import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/Button';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-page/10 relative font-sans selection:bg-accent-lavender/30 selection:text-accent-dark">
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
              className="h-24 w-auto max-w-[300px] object-contain object-left mix-blend-multiply scale-[1.3] origin-left"
            />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 h-10 w-10 text-text-primary hover:bg-white/40"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </header>

        <div className="flex-1 px-4 py-6 md:px-8 md:py-12 overflow-y-auto overflow-x-hidden transition-all duration-300 print:p-0 print:overflow-visible">
          <div className="max-w-[1600px] mx-auto space-y-8 md:space-y-12 print:max-w-none print:space-y-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
