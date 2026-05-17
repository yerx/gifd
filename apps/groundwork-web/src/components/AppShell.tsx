'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, createContext, useContext } from 'react';
import Sidebar from './Sidebar';
import CaptureOverlay from './CaptureOverlay';

// Feature 142: Shared sidebar collapse context
interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
});

export function useSidebarContext() {
  return useContext(SidebarContext);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSetup = pathname === '/setup';

  // Feature 142: Manage sidebar collapse state at shell level
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on narrow screens
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isSetup) {
    return <>{children}</>;
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {/* Feature 140: Skip-to-content link for keyboard navigation */}
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <Sidebar />
        <main
          id="main-content"
          className={`${collapsed ? 'ml-16' : 'ml-60'} flex-1 min-h-screen transition-all duration-200 ease-in-out`}
          tabIndex={-1}
        >
          {children}
        </main>
        <CaptureOverlay />
      </div>
    </SidebarContext.Provider>
  );
}
