import type { Metadata } from 'next';
import { headers } from 'next/headers';

const META = {
  ko: { title: '사용 가이드 — Overture', description: 'Overture의 사용 흐름과 각 도구의 목적.' },
  en: { title: 'Guide — Overture', description: 'How to use Overture and what each tool is for.' },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const first = (h.get('accept-language') || '').split(',')[0]?.toLowerCase() ?? '';
  const lang: 'ko' | 'en' = first.startsWith('ko') ? 'ko' : 'en';
  return META[lang];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
