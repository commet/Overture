import React from 'react';

/* ═══ Inline markdown — bold only ═══ */
export function renderInline(text: string): React.ReactNode {
  const p = text.split(/(\*\*[^*]+\*\*)/g);
  if (p.length === 1) return text;
  return p.map((s, i) =>
    s.startsWith('**') && s.endsWith('**')
      ? <strong key={i} className="font-semibold text-[var(--text-primary)]">{s.slice(2, -2)}</strong>
      : s,
  );
}

/* ═══ Block-level markdown renderer ═══ */
export function renderMd(c: string) {
  return c.split('\n').map((l, k) => {
    if (l.startsWith('# ')) return <h1 key={k} className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] mt-1 mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{l.slice(2)}</h1>;
    if (l.startsWith('### ')) return <h3 key={k} className="text-[14px] font-bold text-[var(--text-primary)] mt-5 mb-1.5">{l.slice(4)}</h3>;
    if (l.startsWith('## ')) return <h2 key={k} className="text-[16px] font-bold text-[var(--text-primary)] mt-7 mb-2 tracking-tight">{l.slice(3)}</h2>;
    if (l.startsWith('> ')) return <blockquote key={k} className="border-l-[3px] border-[var(--accent)]/20 pl-5 py-1 text-[14px] text-[var(--text-secondary)] italic my-3 leading-relaxed">{renderInline(l.slice(2))}</blockquote>;
    if (l.startsWith('- ')) return <div key={k} className="flex items-start gap-2.5 text-[14px] text-[var(--text-primary)] ml-1 leading-[1.8]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/50 mt-2.5 shrink-0" /><span>{renderInline(l.slice(2))}</span></div>;
    if (l.startsWith('| ')) return <p key={k} className="text-[13px] text-[var(--text-secondary)] font-mono leading-[1.8]">{l}</p>;
    if (l.startsWith('---') || l.startsWith('|--')) return <hr key={k} className="border-[var(--border-subtle)] my-1" />;
    if (l.match(/^\d+\. /)) return <div key={k} className="flex items-start gap-2.5 text-[14px] text-[var(--text-primary)] ml-1 leading-[1.8]"><span className="text-[var(--accent)]/60 font-mono text-[12px] mt-0.5 shrink-0">{l.match(/^\d+/)![0]}.</span><span>{renderInline(l.replace(/^\d+\.\s*/, ''))}</span></div>;
    if (l.startsWith('<!--')) return null;
    if (l.trim() === '') return <div key={k} className="h-3" />;
    return <p key={k} className="text-[14px] text-[var(--text-primary)] leading-[1.85]">{renderInline(l)}</p>;
  });
}
