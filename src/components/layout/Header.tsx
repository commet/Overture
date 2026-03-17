'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/project', label: '프로젝트' },
  { href: '/tools/decompose', label: '주제 파악' },
  { href: '/tools/synthesize', label: '조율' },
  { href: '/tools/orchestrate', label: '역할 편성' },
  { href: '/tools/persona-feedback', label: '리허설' },
  { href: '/tools/refinement-loop', label: '정제 루프' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLanding = pathname === '/';

  return (
    <header className={`sticky top-0 z-40 ${isLanding ? 'bg-transparent' : 'bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--primary)] flex items-center justify-center shadow-[var(--shadow-sm)] group-hover:shadow-[var(--shadow-md)] transition-shadow duration-300">
              <span className="text-white text-[13px] font-black tracking-tight">O</span>
            </div>
            <span className="text-[var(--primary)] font-extrabold text-[18px] tracking-tight">Overture</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 bg-[var(--bg)]/60 backdrop-blur-sm rounded-full px-1.5 py-1 border border-[var(--border-subtle)]">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ease-[var(--ease-spring)] ${
                    isActive
                      ? 'bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/settings"
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ease-[var(--ease-spring)] ${
                pathname === '/settings'
                  ? 'bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              설정
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2.5 hover:bg-[var(--bg)] rounded-[var(--radius-sm)] cursor-pointer transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--surface)]/95 backdrop-blur-xl animate-slide-down">
          <div className="px-3 py-2 space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-[var(--radius-sm)] text-[14px] font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-[var(--bg)] text-[var(--primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-[var(--radius-sm)] text-[14px] font-medium transition-colors ${
                pathname === '/settings'
                  ? 'bg-[var(--bg)] text-[var(--primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]'
              }`}
            >
              설정
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
