'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { inbox as inboxApi, domains as domainsApi } from '@/lib/api';
import SearchModal from './SearchModal';
import { useSidebarContext } from './AppShell';

interface DomainData {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

const navItems = [
  { href: '/inbox', label: 'Inbox', icon: InboxIcon },
  { href: '/cockpit', label: 'Cockpit', icon: CockpitIcon },
  { href: '/projects', label: 'Projects', icon: ProjectsIcon },
  { href: '/review', label: 'Review', icon: ReviewIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [inboxCount, setInboxCount] = useState(0);
  const [domainList, setDomainList] = useState<DomainData[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  // Feature 142: Use shared collapse state from AppShell context
  const { collapsed, setCollapsed } = useSidebarContext();

  // Global "/" keyboard shortcut to open search
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if user is typing in an input/textarea/select
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  useEffect(() => {
    async function loadSidebarData() {
      try {
        const [countData, domainsData] = await Promise.all([
          inboxApi.count(),
          domainsApi.list(),
        ]);
        setInboxCount(countData.count);
        setDomainList(domainsData as DomainData[]);
      } catch {
        // API not available yet, silently fail
      }
    }

    loadSidebarData();
    // Poll every 10 seconds for inbox count
    const interval = setInterval(loadSidebarData, 10000);
    return () => clearInterval(interval);
  }, []);

  const sidebarWidth = collapsed ? 'w-16' : 'w-60';

  return (
    <aside
      className={`${sidebarWidth} h-screen bg-gw-stone-900 text-gw-stone-300 flex flex-col fixed left-0 top-0 z-30 transition-all duration-200 ease-in-out`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Branding + collapse toggle */}
      <div className="px-4 py-5 border-b border-gw-stone-700 flex items-center justify-between min-h-[65px]">
        {!collapsed && (
          <h1 className="text-lg font-bold text-white tracking-tight">GROUNDWORK</h1>
        )}
        {/* Feature 142: Toggle button to expand/collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gw-stone-400 hover:text-white hover:bg-gw-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gw-stone-900"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <button
          className={`flex items-center ${collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-2 w-full px-3 py-2'} rounded-lg bg-gw-stone-800 text-gw-stone-400 text-sm cursor-pointer hover:bg-gw-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gw-stone-900`}
          onClick={() => setSearchOpen(true)}
          aria-label="Open search"
          tabIndex={0}
        >
          <SearchIcon />
          {!collapsed && (
            <>
              <span>Find...</span>
              <kbd className="ml-auto text-xs text-gw-stone-500 bg-gw-stone-700 px-1.5 py-0.5 rounded">
                /
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Navigation */}
      <nav className="px-3 flex-1" aria-label="Primary navigation">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <li key={item.href} className={collapsed ? 'relative' : ''}>
                <Link
                  href={item.href}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon />
                  {!collapsed && (
                    <span>{item.label}</span>
                  )}
                  {!collapsed && item.label === 'Inbox' && inboxCount > 0 && (
                    <span className="ml-auto bg-gw-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full" aria-label={`${inboxCount} unprocessed items`}>
                      {inboxCount}
                    </span>
                  )}
                </Link>
                {collapsed && item.label === 'Inbox' && inboxCount > 0 && (
                  <span className="absolute -top-1 right-0 bg-gw-green-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full" aria-label={`${inboxCount} unprocessed items`}>
                    {inboxCount > 9 ? '9+' : inboxCount}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Domains - expanded */}
        {!collapsed && (
          <div className="mt-6 pt-4 border-t border-gw-stone-700">
            <h3 className="px-3 text-xs font-semibold text-gw-stone-500 uppercase tracking-wider mb-2">
              Domains
            </h3>
            <ul className="space-y-1" role="list">
              {domainList.map((domain) => (
                <li key={domain.id}>
                  <Link
                    href={`/projects?domain=${domain.id}`}
                    className="sidebar-nav-item"
                    title={domain.name}
                  >
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: domain.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{domain.name}</span>
                  </Link>
                </li>
              ))}
              {domainList.length === 0 && (
                <li className="px-3 py-2 text-xs text-gw-stone-500 italic">
                  No domains yet
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Domains - collapsed: color dots only */}
        {collapsed && domainList.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gw-stone-700 flex flex-col items-center gap-2">
            {domainList.map((domain) => (
              <Link
                key={domain.id}
                href={`/projects?domain=${domain.id}`}
                className="w-3 h-3 rounded-sm hover:ring-2 hover:ring-white/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                style={{ backgroundColor: domain.color }}
                title={domain.name}
                aria-label={`${domain.name} domain`}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Sync status indicator */}
      <div className={`px-4 py-3 border-t border-gw-stone-700 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? '' : 'gap-2'}`}>
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-gw-stone-500 opacity-40" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gw-stone-500" />
          </span>
          {!collapsed && (
            <span className="text-xs text-gw-stone-500 font-medium">Local only</span>
          )}
        </div>
        {!collapsed && (
          <p className="text-[10px] text-gw-stone-600 mt-1 ml-[18px]">No peers connected</p>
        )}
      </div>
    </aside>
  );
}

// Icon components
function SearchIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0a2.25 2.25 0 00-2.25 2.25v1.5a2.25 2.25 0 002.25 2.25h19.5a2.25 2.25 0 002.25-2.25v-1.5a2.25 2.25 0 00-2.25-2.25m-17.5 0V4.125c0-1.036.84-1.875 1.875-1.875h15.75c1.036 0 1.875.84 1.875 1.875v9.375" />
    </svg>
  );
}

function CockpitIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Feature 142: Chevron icons for sidebar toggle
function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
