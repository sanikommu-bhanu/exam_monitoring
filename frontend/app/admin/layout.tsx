'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, LayoutDashboard, Users, BookOpen, Bell, BarChart3,
  Settings, LogOut, Search, ChevronDown, Menu, X, Cpu,
  Video, AlertTriangle, Activity, Eye
} from 'lucide-react';
import { useAuthStore } from '@/store';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Video, label: 'Live Monitoring', href: '/admin/monitoring' },
  { icon: BookOpen, label: 'Exams', href: '/admin/exams' },
  { icon: Users, label: 'Students', href: '/admin/students' },
  { icon: AlertTriangle, label: 'Alerts', href: '/admin/alerts' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCount] = useState(23);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full z-40 flex flex-col
        bg-surface border-r border-border transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex-shrink-0 flex items-center justify-center shadow-glow-primary">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="min-w-0"
              >
                <div className="text-sm font-bold text-foreground">ProctorAI</div>
                <div className="text-2xs text-foreground-muted">Smart Exam Monitoring</div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}>
                <div className={`nav-item ${active ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-2' : ''}`}>
                  <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="text-sm">{item.label}</span>
                  )}
                  {!sidebarOpen && item.label === 'Alerts' && (
                    <span className="absolute right-1 top-1 w-2 h-2 bg-danger rounded-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="p-3 border-t border-border">
          <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-surface-3 cursor-pointer transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-xs font-bold">
                {user?.full_name?.charAt(0) ?? 'A'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{user?.full_name}</div>
                <div className="text-2xs text-foreground-muted capitalize">{user?.role}</div>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="text-foreground-muted hover:text-danger transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Top bar */}
        <header className="h-16 bg-surface border-b border-border flex items-center gap-4 px-6 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ai-input pl-9 h-9 text-sm bg-surface-3"
            />
          </div>

          <div className="flex-1" />

          {/* Live badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-border text-sm">
            <span className="status-dot live" />
            <span className="text-foreground">{activeCount} Students Active</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center hover:border-border-bright transition-colors"
            >
              <Bell className="w-4 h-4 text-foreground-muted" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-2xs rounded-full flex items-center justify-center font-bold">
                12
              </span>
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 top-11 w-80 glass-card p-0 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Recent Alerts</span>
                    <span className="text-xs text-primary cursor-pointer hover:underline">View all</span>
                  </div>
                  {[
                    { type: 'Multiple Faces', student: 'Karan Singh', time: '10:30 AM', sev: 'high' },
                    { type: 'Phone Detected', student: 'Ananya Patel', time: '10:22 AM', sev: 'high' },
                    { type: 'Looking Away', student: 'Rohit Sharma', time: '10:15 AM', sev: 'medium' },
                  ].map((n, i) => (
                    <div key={i} className="px-4 py-3 border-b border-border/50 hover:bg-surface-3 cursor-pointer transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.sev === 'high' ? 'bg-danger' : 'bg-warning'}`} />
                        <div>
                          <div className="text-sm font-medium text-foreground">{n.type} Detected</div>
                          <div className="text-xs text-foreground-muted mt-0.5">{n.student} • {n.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center cursor-pointer">
            <span className="text-primary text-xs font-bold">{user?.full_name?.charAt(0) ?? 'A'}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
