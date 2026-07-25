import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, Search, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function Sidebar({ mobileOpen = false, setMobileOpen }: { mobileOpen?: boolean, setMobileOpen?: (open: boolean) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Scans & Reports', href: '/dashboard/scans', icon: Search },
    { name: 'Integrations', href: '/dashboard/integrations', icon: Shield },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden" onClick={() => setMobileOpen?.(false)} />
      )}
      <aside className={`w-64 bg-card border-r border-border h-full flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="text-xl font-bold text-primary tracking-widest flex items-center gap-2">
          DEVSEC<span className="text-foreground">AI</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Overview</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name || 'Operator'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md transition-colors text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
