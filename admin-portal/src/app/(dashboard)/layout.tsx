'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
import { Sidebar } from '@/components/layout/sidebar';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <div className="md:hidden sticky top-0 z-40 h-16 px-4 bg-white border-b border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-700 rounded-md hover:bg-gray-100"
              aria-label="Open sidebar"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <h1 className="text-sm font-semibold text-gray-900">Employee Tracker</h1>
            <div className="w-10" />
          </div>

          <div className="hidden md:block">
            <Sidebar />
          </div>

          {isSidebarOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close sidebar overlay"
              />
              <div className="relative h-full">
                <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
              </div>
            </div>
          )}

          <main className="p-4 md:p-8 md:ml-64">{children}</main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}
