import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorState';

export const metadata: Metadata = {
  title: 'GroundWork',
  description: 'Local-First Personal Operating System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Feature 144: Global error boundary catches unhandled render errors */}
        <ErrorBoundary fallbackTitle="GroundWork">
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
