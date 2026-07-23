"use client";
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-primary font-mono animate-pulse">INITIALIZING SECURE CONNECTION...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-primary tracking-widest flex items-center gap-2">
            DEVSEC<span className="text-foreground">AI</span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded ml-2">v2.0</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
            <span>OP: {user.name?.toUpperCase() || user.email.toUpperCase()}</span>
            <button onClick={logout} className="hover:text-primary transition-colors border border-border px-3 py-1 rounded hover:border-primary/50">
              TERMINATE
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
