'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { domains as domainsApi } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSetup() {
      try {
        const data = await domainsApi.list();
        if ((data as unknown[]).length === 0) {
          router.replace('/setup');
        } else {
          router.replace('/cockpit');
        }
      } catch {
        // If API is down, go to cockpit anyway
        router.replace('/cockpit');
      }
      setChecking(false);
    }
    checkSetup();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gw-stone-400">Loading...</div>
      </div>
    );
  }

  return null;
}
