import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 px-10 py-12 overflow-y-auto overflow-x-hidden transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
