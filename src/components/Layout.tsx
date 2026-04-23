import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/Button';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:block
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 w-full flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xs">PD</span>
            </div>
            <span className="font-black text-slate-900 tracking-tight">PropDev</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </header>

        <div className="flex-1 px-4 py-6 md:px-10 md:py-12 overflow-y-auto overflow-x-hidden transition-all duration-300 print:p-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 print:max-w-none print:space-y-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
