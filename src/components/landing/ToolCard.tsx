import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ToolCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

export function ToolCard({ href, icon: Icon, title, description, color }: ToolCardProps) {
  return (
    <Link href={href} className="group">
      <div className="h-full flex flex-col gap-3 bg-[var(--surface)] border-[1.5px] border-[var(--border)] rounded-xl p-5 transition-all duration-200 hover:border-[var(--accent)] hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--accent)]/5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} transition-transform group-hover:scale-110`}>
            <Icon size={20} />
          </div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">{title}</h3>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] leading-[1.6] flex-1">
          {description}
        </p>
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--accent)] font-semibold group-hover:gap-2.5 transition-all">
          시작하기 <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
