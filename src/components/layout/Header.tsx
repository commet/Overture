'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, Sun, Moon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { RateLimitBadge } from '@/components/ui/RateLimitBadge';
import { SyncStatus } from '@/components/ui/SyncStatus';

const navItems = [
  { href: '/workspace', label: '워크스페이스', primary: true },
  { href: '/boss', label: '팀장' },
  { href: '/agents', label: '에이전트' },
  { href: '/project', label: '프로젝트' },
  { href: '/guide', label: '가이드' },
  { href: '/settings', label: '설정' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Theme initialization
  useEffect(() => {
    const saved = localStorage.getItem('overture-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved === 'dark' || (!saved && prefersDark);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('overture-theme', next ? 'dark' : 'light');
  };

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    router.push('/login');
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shadow-[var(--shadow-sm)] group-hover:shadow-[var(--glow-gold)] transition-all duration-300" style={{ background: 'var(--gradient-gold)' }}>
              <span className="text-white text-[13px] font-black tracking-tight">O</span>
            </div>
            <span className="text-[var(--primary)] font-extrabold text-[18px] tracking-tight">Overture</span>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            {/* Desktop nav */}
            <nav className="flex items-center gap-0.5 bg-[var(--surface)]/60 backdrop-blur-sm rounded-full px-1.5 py-1 border border-[var(--border-subtle)] shadow-[var(--shadow-xs)]">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Theme toggle + Status badges */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              {user && (
                <>
                  <SyncStatus />
                  <RateLimitBadge />
                </>
              )}
            </div>

            {/* User area */}
            {!loading && (
              user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-[var(--surface)] transition-colors cursor-pointer"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-7 h-7 rounded-full"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                      />
                    ) : null}
                    <div className={`w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center ${avatarUrl ? 'hidden' : ''}`}>
                      <span className="text-white text-[11px] font-bold">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-56 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden animate-fade-in">
                      <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />
                      <div className="px-3 py-2 border-b border-[var(--border-subtle)] mt-0">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{displayName}</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                      >
                        <LogOut size={14} />
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--ai)]/50 transition-colors"
                >
                  로그인
                </Link>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2.5 hover:bg-[var(--surface)] rounded-lg cursor-pointer transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--surface)]/95 backdrop-blur-xl animate-slide-down">
          <div className="px-4 py-2 space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-[var(--bg)] text-[var(--primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {/* Mobile auth */}
            {!loading && (
              <div className="pt-1 mt-1 border-t border-[var(--border-subtle)]">
                {user ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    로그아웃 ({displayName})
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[var(--accent)]"
                  >
                    로그인
                  </Link>
                )}
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
