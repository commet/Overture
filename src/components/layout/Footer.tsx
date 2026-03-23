import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] py-10 px-4 text-center space-y-2">
      <p className="text-[12px] text-[var(--text-tertiary)] tracking-wide">
        Overture — Think before you orchestrate
      </p>
      <div className="flex items-center justify-center gap-3 text-[11px] text-[var(--text-tertiary)]">
        <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">이용약관</Link>
        <span>|</span>
        <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">개인정보처리방침</Link>
      </div>
    </footer>
  );
}
