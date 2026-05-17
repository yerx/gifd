'use client';

import { useEffect, useState, useCallback } from 'react';
import { domains as domainsApi } from '@/lib/api';
import {
  DomainManagement,
  WorkHoursConfig,
  TagManagement,
  WeeklyThemeTemplates,
  SeasonalConfig,
  SyncDevices,
  DataManagementSection,
} from '@/components/settings';
import type { DomainData } from '@/components/settings';

export default function SettingsPage() {
  const [domainList, setDomainList] = useState<DomainData[]>([]);

  const loadDomains = useCallback(async () => {
    try {
      const data = await domainsApi.list();
      setDomainList(data as DomainData[]);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gw-stone-900">Settings</h1>
        <p className="text-sm text-gw-stone-500 mt-1">Configure your GroundWork workspace</p>
      </div>

      {/* Domain Management */}
      <DomainManagement domainList={domainList} onDomainsChange={loadDomains} />

      {/* Work Hours Configuration */}
      <WorkHoursConfig />

      {/* Tags Management */}
      <TagManagement />

      {/* Weekly Theme Templates */}
      <WeeklyThemeTemplates domainList={domainList} />

      {/* Seasonal Configuration */}
      <SeasonalConfig />

      {/* Sync & Devices */}
      <SyncDevices />

      {/* Data Management */}
      <DataManagementSection />
    </div>
  );
}
