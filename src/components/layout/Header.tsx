'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/project', label: '프로젝트' },
  { href: '/tools/decompose', label: '과제 분해' },
  { href: '/tools/synthesize', label: '산출물 합성' },
  { href: '/tools/orchestrate', label: '오케스트레이션 맵' },
  { href: '/tools/persona-feedback', label: '페르소나 피드백' },
  { href: '/tools/refinement-loop', label: '정제 루프' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
            <span className="text-white text-[12px] font-black">O</span>
          </div>
          <span className="text-[var(--primary)] font-extrabold text-[17px] tracking-tight">Overture</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/settings"
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              pathname === '/settings'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)]'
            }`}
          >
            설정
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 hover:bg-[var(--bg)] rounded-lg cursor-pointer"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] animate-slide-down">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 text-[14px] font-medium border-b border-[var(--border)] ${
                pathname === item.href
                  ? 'bg-[var(--bg)] text-[var(--primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-3 text-[14px] font-medium ${
              pathname === '/settings'
                ? 'bg-[var(--bg)] text-[var(--primary)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            설정
          </Link>
        </nav>
      )}
    </header>
  );
}
